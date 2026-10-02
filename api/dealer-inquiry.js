import { Resend } from 'resend';

const clean = (value) => typeof value === 'string' ? value.trim() : '';
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Exported separately so delivery can be verified locally without sending email.
export async function processInquiry(body, env = process.env, deliver) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, body: { error: 'Please complete the dealership form.' } };
  if (clean(body.fax)) return { status: 200, body: { ok: true } };
  const limits = { dealership: 160, location: 160, website: 500, email: 254, needs: 3000 };
  const lead = {};
  for (const [field, limit] of Object.entries(limits)) {
    lead[field] = clean(body[field]);
    if (!lead[field] || lead[field].length > limit) return { status: 400, body: { error: 'Please complete all fields within the stated limits.' } };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || /[\r\n]/.test(lead.dealership)) return { status: 400, body: { error: 'Please enter valid contact details.' } };
  try {
    const url = new URL(/^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error();
    lead.website = url.href;
  } catch { return { status: 400, body: { error: 'Please enter a valid dealership website.' } }; }
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL || !env.LEAD_TO_EMAIL) return { status: 503, body: { error: 'The form is temporarily unavailable. Please email contact@onlyev.com.' } };
  const rows = [
    ['Dealership', lead.dealership], ['Location', lead.location], ['Website', lead.website],
    ['Contact email', lead.email], ['What the AI should do', lead.needs], ['Offer', '$500 setup + $500/month; SMS usage additional'],
    ['Submitted at', new Date().toISOString()],
  ];
  const send = deliver || ((message) => new Resend(env.RESEND_API_KEY).emails.send(message));
  try {
    const result = await send({
      from: env.FROM_EMAIL,
      // Dealer software inquiries go to the owner, not the former vehicle-buying partner.
      to: env.LEAD_TO_EMAIL.split(',').map((email) => email.trim()).filter(Boolean),
      replyTo: lead.email,
      subject: `Dealer AI inquiry: ${lead.dealership}`,
      text: ['New exotic dealership AI inquiry', '', ...rows.map(([key, value]) => `${key}: ${value}`)].join('\n'),
      html: `<div style="font-family:Arial,sans-serif;color:#111"><h1>New dealership AI inquiry</h1><table style="border-collapse:collapse">${rows.map(([key, value]) => `<tr><th style="text-align:left;vertical-align:top;padding:12px;border:1px solid #ddd">${escapeHtml(key)}</th><td style="padding:12px;border:1px solid #ddd;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join('')}</table></div>`,
      tags: [{ name: 'source', value: 'sellmyexoticfast' }, { name: 'lead_type', value: 'dealer_ai' }],
    });
    if (result?.error || !result?.data?.id) throw new Error('Email delivery not accepted');
    return { status: 200, body: { ok: true } };
  } catch { return { status: 502, body: { error: 'We couldn’t send your inquiry. Please try again or email contact@onlyev.com.' } }; }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ error: 'Method not allowed.' }); }
  if (!String(request.headers['content-type'] || '').includes('application/json')) return response.status(415).json({ error: 'Please submit the website form.' });
  let body;
  try {
    if (Number(request.headers['content-length'] || 0) > 18000) return response.status(413).json({ error: 'Request too large.' });
    body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    if (JSON.stringify(body || '').length > 18000) return response.status(413).json({ error: 'Request too large.' });
  } catch { return response.status(400).json({ error: 'Invalid request.' }); }
  const result = await processInquiry(body);
  return response.status(result.status).json(result.body);
}
