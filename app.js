const vinForm = document.getElementById('vin-form');
const vinInput = document.getElementById('vin-input');
const vinStatus = document.getElementById('vin-status');
const decodeBtn = document.getElementById('decode-btn');
const vehicleCard = document.getElementById('vehicle-card');
const leadCard = document.getElementById('lead-card');
const decodeSummary = document.getElementById('decode-summary');
const manualNote = document.getElementById('manual-note');
const leadForm = document.getElementById('lead-form');
const leadStatus = document.getElementById('lead-status');
const submitBtn = document.getElementById('submit-btn');
const manualMakeWrap = document.getElementById('manual-make-wrap');
const manualModelWrap = document.getElementById('manual-model-wrap');
const manualMakeInput = document.getElementById('manual-make');
const manualModelInput = document.getElementById('manual-model');

const vinHidden = document.getElementById('vin-hidden');
const decodedMakeHidden = document.getElementById('decoded-make-hidden');
const decodedModelHidden = document.getElementById('decoded-model-hidden');
const decodedYearHidden = document.getElementById('decoded-year-hidden');
const decodedBodyHidden = document.getElementById('decoded-body-hidden');
const decodedTypeHidden = document.getElementById('decoded-type-hidden');

const utmFields = {
  utm_source: document.getElementById('utm-source'),
  utm_medium: document.getElementById('utm-medium'),
  utm_campaign: document.getElementById('utm-campaign'),
  utm_term: document.getElementById('utm-term'),
  utm_content: document.getElementById('utm-content'),
};

let decodedVehicle = null;

const setStatus = (element, message, state = '') => {
  element.textContent = message;
  if (state) {
    element.setAttribute('data-state', state);
  } else {
    element.removeAttribute('data-state');
  }
};

const normalizeVin = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const isValidVin = (vin) => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);

const populateUtmFields = () => {
  const params = new URLSearchParams(window.location.search);
  Object.entries(utmFields).forEach(([key, input]) => {
    input.value = params.get(key) || '';
  });
};

const renderSummary = (vehicle) => {
  decodeSummary.innerHTML = '';

  const values = [
    vehicle.make,
    vehicle.model,
    vehicle.modelYear,
    vehicle.bodyClass,
    vehicle.vehicleType,
    vehicle.engineCylinders ? `${vehicle.engineCylinders} cyl` : '',
    vehicle.fuelTypePrimary,
  ].filter(Boolean);

  if (!values.length) {
    const fallback = document.createElement('p');
    fallback.className = 'helper-text';
    fallback.textContent = 'VIN captured. Continue with the form below.';
    decodeSummary.appendChild(fallback);
    return;
  }

  values.forEach((value) => {
    const pill = document.createElement('span');
    pill.className = 'summary-pill';
    pill.textContent = value;
    decodeSummary.appendChild(pill);
  });
};

const toggleManualFields = (show) => {
  manualNote.classList.toggle('is-hidden', !show);
  manualMakeWrap.classList.toggle('is-hidden', !show);
  manualModelWrap.classList.toggle('is-hidden', !show);
  manualMakeInput.required = show;
  manualModelInput.required = show;
};

vinInput.addEventListener('input', () => {
  vinInput.value = normalizeVin(vinInput.value);
});

vinForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const vin = normalizeVin(vinInput.value);
  vinInput.value = vin;
  vinHidden.value = vin;

  if (!isValidVin(vin)) {
    setStatus(vinStatus, 'Enter a valid 17-character VIN. VINs do not use I, O, or Q.', 'error');
    return;
  }

  decodeBtn.disabled = true;
  setStatus(vinStatus, 'Decoding VIN…');

  try {
    const response = await fetch('/api/decode-vin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vin }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not decode VIN.');
    }

    decodedVehicle = result.vehicle;

    decodedMakeHidden.value = decodedVehicle.make || '';
    decodedModelHidden.value = decodedVehicle.model || '';
    decodedYearHidden.value = decodedVehicle.modelYear || '';
    decodedBodyHidden.value = decodedVehicle.bodyClass || '';
    decodedTypeHidden.value = decodedVehicle.vehicleType || '';

    renderSummary(decodedVehicle);

    const decodedEnough = Boolean(decodedVehicle.make && decodedVehicle.model);
    toggleManualFields(!decodedEnough);

    setStatus(
      vinStatus,
      decodedEnough
        ? 'VIN decoded. Confirm the details and finish the form below.'
        : 'VIN captured. We could not decode everything, so enter make and model manually below.',
      decodedEnough ? 'success' : 'error'
    );

    vehicleCard.classList.remove('is-hidden');
    leadCard.classList.remove('is-hidden');
    leadCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    decodedVehicle = null;
    decodedMakeHidden.value = '';
    decodedModelHidden.value = '';
    decodedYearHidden.value = '';
    decodedBodyHidden.value = '';
    decodedTypeHidden.value = '';

    renderSummary({});
    toggleManualFields(true);
    vehicleCard.classList.remove('is-hidden');
    leadCard.classList.remove('is-hidden');

    setStatus(
      vinStatus,
      `${error.message} You can still continue by entering the make and model manually.`,
      'error'
    );
  } finally {
    decodeBtn.disabled = false;
  }
});

leadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(leadForm);
  const payload = Object.fromEntries(formData.entries());

  payload.vin = normalizeVin(payload.vin || vinInput.value || '');
  payload.pageUrl = window.location.href;
  payload.userAgent = navigator.userAgent;

  if (!payload.vin) {
    setStatus(leadStatus, 'Add the VIN first.', 'error');
    return;
  }

  if (!payload.consent) {
    setStatus(leadStatus, 'Please agree to be contacted so the buyer can follow up.', 'error');
    return;
  }

  submitBtn.disabled = true;
  setStatus(leadStatus, 'Sending your request…');

  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Something went wrong.');
    }

    setStatus(
      leadStatus,
      'Thanks — your request is in. Check your email for confirmation. We can follow up by text or phone next.',
      'success'
    );

    leadForm.reset();
    vinInput.value = payload.vin;
    vinHidden.value = payload.vin;
    populateUtmFields();
  } catch (error) {
    setStatus(leadStatus, error.message || 'Something went wrong.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

populateUtmFields();
