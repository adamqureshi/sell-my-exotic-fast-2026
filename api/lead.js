import { Resend } from 'resend';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const esc = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatPhone = (value = '') => String(value).trim();
const formatZip = (value = '') => String(value).trim();

const buildLeadHtml = (lead) => {
  const rows = [
    ['VIN', lead.vin],
    ['Make', lead.make],
    ['Model', lead.model],
    ['Year', lead.year],
    ['Miles', lead.miles],
    ['ZIP', lead.zip],
    ['Name', lead.fullName],
    ['Mobile', lead.mobile],
    ['Email', lead.email],
    ['Body Class', lead.bodyClass],
    ['Vehicle Type', lead.vehicleType],
    ['Notes', lead.notes],
    ['UTM Source', lead.utm_source],
    ['UTM Medium', lead.utm_medium],
    ['UTM Campaign', lead.utm_campaign],
    ['UTM Term', lead.utm_term],
    ['UTM Content', lead.utm_content],
    ['Page URL', lead.pageUrl],
    ['User Agent', lead.userAgent],
    ['Submitted At', lead.submittedAt],
  ];

  const tableRows = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;border:1px solid #e5e5e5;font-weight:600;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
          <td style="padding:10px 12px;border:1px solid #e5e5e5;vertical-align:top;">${esc(value)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#111;">
      <h1 style="font-size:24px;line-height:1.1;margin:0 0 16px;">New Sell My Exotic Fast lead</h1>
      <p style="margin:0 0 20px;color:#555;">A new lead was submitted from the landing page.</p>
      <table style="border-collapse:collapse;width:100%;max-width:760px;">${tableRows}</table>
    </div>
  `;
};

const buildLeadText = (lead) => {
  const lines = [
    'New Sell My Exotic Fast lead',
    '',
    `VIN: ${lead.vin}`,
    `Make: ${lead.make}`,
    `Model: ${lead.model}`,
    `Year: ${lead.year}`,
    `Miles: ${lead.miles}`,
    `ZIP: ${lead.zip}`,
    `Name: ${lead.fullName}`,
    `Mobile: ${lead.mobile}`,
    `Email: ${lead.email}`,
    `Body Class: ${lead.bodyClass}`,
    `Vehicle Type: ${lead.vehicleType}`,
    `Notes: ${lead.notes}`,
    `UTM Source: ${lead.utm_source}`,
    `UTM Medium: ${lead.utm_medium}`,
    `UTM Campaign: ${lead.utm_campaign}`,
    `UTM Term: ${lead.utm_term}`,
    `UTM Content: ${lead.utm_content}`,
    `Page URL: ${lead.pageUrl}`,
    `User Agent: ${lead.userAgent}`,
    `Submitted At: ${lead.submittedAt}`,
  ];

  return lines.join('\n');
};

const buildConfirmationHtml = (lead) => `
  <div style="font-family:Inter,Arial,sans-serif;color:#111;">
    <h1 style="font-size:24px;line-height:1.1;margin:0 0 16px;">Thanks — we got your request.</h1>
    <p style="margin:0 0 12px;color:#555;">
      We received your vehicle details and will follow up about your ${esc(lead.year)} ${esc(lead.make)} ${esc(lead.model)}.
    </p>
    <p style="margin:0 0 12px;color:#555;">
      VIN: <strong>${esc(lead.vin)}</strong><br />
      Miles: <strong>${esc(lead.miles)}</strong><br />
      ZIP: <strong>${esc(lead.zip)}</strong>
    </p>
    <p style="margin:0;color:#555;">
      If you need to add anything important, just reply to this email.
    </p>
  </div>
`;

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.website) {
      return json({ ok: true });
    }

    const fullName = String(body.fullName || '').trim();
    const mobile = formatPhone(body.mobile || '');
    const email = String(body.email || '').trim();
    const zip = formatZip(body.zip || '');
    const miles = String(body.miles || '').trim();
    const vin = String(body.vin || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (!fullName || !mobile || !email || !zip || !miles || !vin) {
      return json({ error: 'Missing required fields.' }, 400);
    }

    if (!body.consent) {
      return json({ error: 'Consent is required.' }, 400);
    }

    const lead = {
      fullName,
      mobile,
      email,
      zip,
      miles,
      vin,
      make: String(body.decodedMake || body.manualMake || '').trim(),
      model: String(body.decodedModel || body.manualModel || '').trim(),
      year: String(body.decodedYear || '').trim(),
      bodyClass: String(body.decodedBodyClass || '').trim(),
      vehicleType: String(body.decodedVehicleType || '').trim(),
      notes: String(body.notes || '').trim(),
      utm_source: String(body.utm_source || '').trim(),
      utm_medium: String(body.utm_medium || '').trim(),
      utm_campaign: String(body.utm_campaign || '').trim(),
      utm_term: String(body.utm_term || '').trim(),
      utm_content: String(body.utm_content || '').trim(),
      pageUrl: String(body.pageUrl || '').trim(),
      userAgent: String(body.userAgent || '').trim(),
      submittedAt: new Date().toISOString(),
    };

    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.FROM_EMAIL;
    const leadTo = process.env.LEAD_TO_EMAIL;
    const dealerTo = process.env.DEALER_TO_EMAIL;

    if (!resendApiKey || !from || !leadTo || !dealerTo) {
      return json({ error: 'Email environment variables are missing.' }, 500);
    }

    const resend = new Resend(resendApiKey);
    const subjectLine = `${lead.make || 'Vehicle'} lead • ${lead.fullName} • ${lead.zip}`;

    const recipients = [leadTo, dealerTo].filter(Boolean);

    const internalSend = await resend.emails.send({
      from,
      to: recipients,
      subject: subjectLine,
      html: buildLeadHtml(lead),
      text: buildLeadText(lead),
      replyTo: email,
      tags: [
        { name: 'source', value: 'sellmyexoticfast' },
        { name: 'lead_type', value: 'vehicle' },
      ],
    });

    if (internalSend.error) {
      return json({ error: internalSend.error.message || 'Could not send lead email.' }, 500);
    }

    const confirmationSend = await resend.emails.send({
      from,
      to: [email],
      subject: 'We received your exotic car request',
      html: buildConfirmationHtml(lead),
      text: `Thanks — we received your vehicle request for ${lead.year} ${lead.make} ${lead.model}. VIN: ${lead.vin}. Miles: ${lead.miles}. ZIP: ${lead.zip}.`,
    });

    if (confirmationSend.error) {
      return json({ ok: true, warning: 'Lead sent, but confirmation email failed.' });
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: 'Could not process lead.' }, 500);
  }
}
