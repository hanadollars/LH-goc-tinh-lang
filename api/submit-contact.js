// api/submit-contact.js — LH Góc Tĩnh Lặng
// CommonJS – fetch thuần, không npm packages

async function kvSet(key, value, ex) {
  await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SET', key, value, 'EX', ex]),
  });
}

async function kvIncr(key) {
  const r = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['INCR', key]),
  });
  const d = await r.json();
  return d.result;
}

async function sendEmail({ to, subject, html }) {
  const fromEmail = process.env.FROM_EMAIL || 'no-reply@hanadola.com';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });
  const text = await r.text();
  console.log('[Resend] TO:', to, '| status:', r.status, '| resp:', text);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone, email, interests, note } = req.body || {};
  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'Thiếu thông tin: name, phone, email' });
  }

  const counter = await kvIncr('gtl_lead_counter');
  const leadId = `GTL-${String(counter).padStart(4, '0')}`;
  const createdAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const leadData = {
    leadId,
    name,
    phone,
    email,
    interests: interests || [],
    note: note || '',
    createdAt,
    status: 'new',
  };

  await kvSet(`lead:${leadId}`, JSON.stringify(leadData), 86400 * 90);
  console.log('[Lead] Tạo lead:', leadId, '|', name, '|', phone, '|', email);

  // Email thông báo admin
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (notifyEmail) {
    try {
      await sendEmail({
        to: notifyEmail,
        subject: `[GTL] Lead mới — ${leadId} — ${name}`,
        html: `<div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#0C0C0C;color:#FAF8F4;border-radius:10px">
<h2 style="color:#B8933A;font-size:18px;margin-bottom:20px;border-bottom:1px solid rgba(184,147,58,.2);padding-bottom:12px">📋 Lead mới — Góc Tĩnh Lặng</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px">
  <tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(250,248,244,.45);width:38%">Mã lead</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);color:#B8933A;font-weight:700">${leadId}</td></tr>
  <tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(250,248,244,.45)">Họ tên</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);font-weight:600">${name}</td></tr>
  <tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(250,248,244,.45)">Điện thoại</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)">${phone}</td></tr>
  <tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(250,248,244,.45)">Email</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)">${email}</td></tr>
  <tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(250,248,244,.45)">Quan tâm</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)">${(interests || []).join(', ') || '—'}</td></tr>
  <tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(250,248,244,.45)">Ghi chú</td><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)">${note || '—'}</td></tr>
  <tr><td style="padding:9px 0;color:rgba(250,248,244,.45)">Thời gian</td><td style="padding:9px 0">${createdAt}</td></tr>
</table>
</div>`,
      });
    } catch (err) {
      console.error('[Email] Lỗi gửi admin:', err.message);
    }
  }

  // Email xác nhận cho khách
  try {
    await sendEmail({
      to: email,
      subject: `✅ Đã nhận thông tin — Góc Tĩnh Lặng`,
      html: `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><style>
body{font-family:'Segoe UI',Georgia,serif;background:#FAF8F4;color:#0C0C0C;margin:0;padding:0}
.wrap{max-width:520px;margin:0 auto;padding:40px 24px}
.brand{font-size:11px;letter-spacing:3px;color:rgba(184,147,58,0.8);text-transform:uppercase;margin-bottom:28px}
h1{font-size:22px;font-weight:300;margin-bottom:8px;line-height:1.4;font-family:Georgia,serif}
h1 em{font-style:italic;color:#8B1A1A}
p{font-size:14px;color:rgba(10,10,10,0.6);line-height:1.8;margin-bottom:14px}
.box{background:#fff;border:1px solid rgba(184,147,58,0.2);border-radius:8px;padding:20px 24px;margin:20px 0}
.box-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(0,0,0,0.05);font-size:13px}
.box-row:last-child{border-bottom:none}
.box-label{color:rgba(10,10,10,0.4)}
.box-val{font-weight:500;color:#0C0C0C}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.08);font-size:11px;color:rgba(10,10,10,0.35);text-align:center}
</style></head><body><div class="wrap">
<div class="brand">Hanadola Media & Technology · Góc Tĩnh Lặng</div>
<h1>Cảm ơn bạn, <em>${name}</em>!</h1>
<p>Chúng tôi đã nhận được thông tin của bạn. Đội ngũ <strong>Góc Tĩnh Lặng</strong> sẽ liên hệ qua số điện thoại hoặc email trong vòng <strong>24 giờ</strong>.</p>
<div class="box">
  <div class="box-row"><span class="box-label">Họ tên</span><span class="box-val">${name}</span></div>
  <div class="box-row"><span class="box-label">Điện thoại</span><span class="box-val">${phone}</span></div>
  <div class="box-row"><span class="box-label">Email</span><span class="box-val">${email}</span></div>
  <div class="box-row"><span class="box-label">Mã tiếp nhận</span><span class="box-val" style="color:#8B1A1A;font-weight:600">${leadId}</span></div>
</div>
<p>Trong lúc chờ đợi, bạn có thể theo dõi thêm tại:</p>
<p>📌 Fanpage: <strong>Góc Tĩnh Lặng</strong> — <a href="https://facebook.com/Goctinhlang6868" style="color:#8B1A1A">facebook.com/Goctinhlang6868</a></p>
<div class="footer">© 2026 Công ty TNHH Hanadola Media & Technology<br>P903, Tầng 9, Diamond Plaza, 34 Lê Duẩn, TP.HCM · MST: 0319352856<br><em>Dừng lại · Nhìn rõ hơn · Sống có chủ đích hơn</em></div>
</div></body></html>`,
    });
  } catch (err) {
    console.error('[Email] Lỗi gửi khách:', err.message);
  }

  return res.status(200).json({ success: true, leadId });
};
