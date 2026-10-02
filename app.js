const form = document.getElementById('dealer-form');
const status = document.getElementById('form-status');
const button = document.getElementById('submit-button');

function normalizeWebsite(value) {
  const trimmed = value.trim();
  const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error('Please enter a valid dealership website.');
  return url.href;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  status.textContent = '';
  status.removeAttribute('data-state');
  const payload = Object.fromEntries(new FormData(form));
  try {
    for (const name of ['dealership', 'location', 'email', 'needs']) {
      payload[name] = payload[name].trim();
      if (!payload[name]) { form.elements[name].focus(); throw new Error('Please complete all fields.'); }
    }
    payload.website = normalizeWebsite(payload.website);
  } catch (error) {
    status.textContent = error.message.includes('Please') ? error.message : 'Please enter a valid dealership website.';
    status.dataset.state = 'error';
    return;
  }
  button.disabled = true;
  button.textContent = 'Sending…';
  form.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/dealer-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error(result.error || 'We couldn’t send your inquiry. Please try again or email contact@onlyev.com.');
    status.textContent = 'Thank you. Your inquiry has been sent. We’ll follow up by email about your dealership.';
    status.dataset.state = 'success';
    form.reset();
    status.focus();
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' ? 'The request timed out and may have been received. Please email contact@onlyev.com if you need help.' : error.message || 'Please try again or email contact@onlyev.com.';
    status.dataset.state = 'error';
  } finally {
    button.disabled = false;
    button.textContent = 'Let’s talk';
    form.removeAttribute('aria-busy');
  }
});
