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

const DEFAULT_DECODE_LABEL = (decodeBtn?.textContent || 'Continue').trim();
const DEFAULT_SUBMIT_LABEL = (submitBtn?.textContent || 'Request my offer').trim();

let decodedVehicle = null;

const setStatus = (element, message, state = '') => {
  if (!element) return;
  element.textContent = message;

  if (state) {
    element.setAttribute('data-state', state);
  } else {
    element.removeAttribute('data-state');
  }
};

const setButtonState = (button, isLoading, loadingLabel, defaultLabel) => {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingLabel : defaultLabel;
};

const normalizeVin = (value = '') => String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const isValidVin = (vin) => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
const digitsOnly = (value = '') => String(value).replace(/\D/g, '');

const readJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const populateUtmFields = () => {
  const params = new URLSearchParams(window.location.search);

  Object.entries(utmFields).forEach(([key, input]) => {
    if (!input) return;
    input.value = params.get(key) || '';
  });
};

const clearDecodedHiddenFields = () => {
  decodedMakeHidden.value = '';
  decodedModelHidden.value = '';
  decodedYearHidden.value = '';
  decodedBodyHidden.value = '';
  decodedTypeHidden.value = '';
};

const toggleManualFields = (show) => {
  manualNote.classList.toggle('is-hidden', !show);
  manualMakeWrap.classList.toggle('is-hidden', !show);
  manualModelWrap.classList.toggle('is-hidden', !show);
  manualMakeInput.required = show;
  manualModelInput.required = show;
};

const hideLeadFlow = () => {
  vehicleCard.classList.add('is-hidden');
  leadCard.classList.add('is-hidden');
};

const resetDecodedState = () => {
  decodedVehicle = null;
  clearDecodedHiddenFields();
  decodeSummary.innerHTML = '';
  toggleManualFields(false);
  setStatus(leadStatus, '');
};

const buildSummaryValues = (vehicle = {}) => {
  const primaryTitle = [vehicle.modelYear, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const trimLine = [vehicle.series, vehicle.trim].filter(Boolean).join(' ').trim();
  const engineLine = [
    vehicle.engineCylinders ? `${vehicle.engineCylinders} cyl` : '',
    vehicle.displacementL ? `${vehicle.displacementL}L` : '',
  ]
    .filter(Boolean)
    .join(' • ');

  return [
    primaryTitle,
    trimLine,
    vehicle.bodyClass,
    vehicle.vehicleType,
    vehicle.driveType,
    vehicle.transmissionStyle,
    engineLine,
    vehicle.fuelTypePrimary,
    vehicle.manufacturer,
  ].filter(Boolean);
};

const renderSummary = (vehicle = {}) => {
  decodeSummary.innerHTML = '';

  const values = buildSummaryValues(vehicle);

  if (!values.length) {
    const fallback = document.createElement('p');
    fallback.className = 'helper-text';
    fallback.textContent = 'Your VIN is saved. Add the vehicle details below to continue.';
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

const validateLeadPayload = (payload) => {
  const requiredFields = [
    ['fullName', 'Please enter your full name.'],
    ['mobile', 'Please enter your mobile number.'],
    ['email', 'Please enter your email address.'],
    ['zip', 'Please enter your ZIP code.'],
    ['miles', 'Please enter the vehicle mileage.'],
  ];

  for (const [field, message] of requiredFields) {
    if (!String(payload[field] || '').trim()) {
      return message;
    }
  }

  const mobileDigits = digitsOnly(payload.mobile);
  if (mobileDigits.length < 10) {
    return 'Please enter a valid mobile number.';
  }

  const zipDigits = digitsOnly(payload.zip);
  if (zipDigits.length < 5) {
    return 'Please enter a valid ZIP code.';
  }

  const milesDigits = digitsOnly(payload.miles);
  if (!milesDigits.length) {
    return 'Please enter the vehicle mileage.';
  }

  const vehicleMake = String(payload.decodedMake || payload.manualMake || '').trim();
  const vehicleModel = String(payload.decodedModel || payload.manualModel || '').trim();

  if (!vehicleMake || !vehicleModel) {
    return 'Please confirm the make and model of your vehicle.';
  }

  if (!payload.consent) {
    return 'Please confirm that we can contact you about your vehicle request.';
  }

  return '';
};

if (vinInput) {
  vinInput.addEventListener('input', () => {
    const normalizedVin = normalizeVin(vinInput.value);
    const vinChanged = normalizedVin !== vinHidden.value;

    vinInput.value = normalizedVin;
    vinHidden.value = normalizedVin;

    if (vinChanged) {
      resetDecodedState();
      hideLeadFlow();
      setStatus(vinStatus, '');
    }
  });
}

if (vinForm) {
  vinForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const vin = normalizeVin(vinInput.value);
    vinInput.value = vin;
    vinHidden.value = vin;

    resetDecodedState();

    if (!isValidVin(vin)) {
      setStatus(vinStatus, 'Enter a valid 17-character VIN. VINs do not use I, O, or Q.', 'error');
      hideLeadFlow();
      return;
    }

    setButtonState(decodeBtn, true, 'Decoding…', DEFAULT_DECODE_LABEL);
    setStatus(vinStatus, 'Looking up your vehicle…');

    try {
      const response = await fetch('/api/decode-vin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vin }),
      });

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(result.error || 'We could not identify that VIN right now.');
      }

      decodedVehicle = result.vehicle || {};

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
          ? 'We found your vehicle. Confirm the details below and continue.'
          : 'We saved your VIN. If anything is missing, add the make and model below.',
        decodedEnough ? 'success' : 'error'
      );

      vehicleCard.classList.remove('is-hidden');
      leadCard.classList.remove('is-hidden');
      leadCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      resetDecodedState();
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
      setButtonState(decodeBtn, false, 'Decoding…', DEFAULT_DECODE_LABEL);
    }
  });
}

if (leadForm) {
  leadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(leadForm);
    const payload = Object.fromEntries(formData.entries());

    payload.vin = normalizeVin(payload.vin || vinInput.value || '');
    payload.pageUrl = window.location.href;
    payload.userAgent = navigator.userAgent;

    if (!payload.vin) {
      setStatus(leadStatus, 'Please enter the VIN first.', 'error');
      return;
    }

    const validationMessage = validateLeadPayload(payload);
    if (validationMessage) {
      setStatus(leadStatus, validationMessage, 'error');
      return;
    }

    setButtonState(submitBtn, true, 'Submitting…', DEFAULT_SUBMIT_LABEL);
    setStatus(leadStatus, 'Submitting your request…');

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(result.error || 'We could not submit your request right now.');
      }

      setStatus(
        leadStatus,
        'Thank you — your request has been submitted. Please check your email for confirmation. A follow-up may come by phone, text, or email.',
        'success'
      );

      leadForm.reset();
      vinInput.value = payload.vin;
      vinHidden.value = payload.vin;
      populateUtmFields();
      toggleManualFields(!(decodedMakeHidden.value && decodedModelHidden.value));
    } catch (error) {
      setStatus(leadStatus, error.message || 'We could not submit your request right now.', 'error');
    } finally {
      setButtonState(submitBtn, false, 'Submitting…', DEFAULT_SUBMIT_LABEL);
    }
  });
}

populateUtmFields();
