const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const clean = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).trim();
  if (!stringValue || stringValue === '0' || stringValue.toLowerCase() === 'null') return '';
  return stringValue;
};

export async function POST(request) {
  try {
    const { vin } = await request.json();
    const normalizedVin = String(vin || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin)) {
      return json({ error: 'Invalid VIN.' }, 400);
    }

    const endpoint = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${normalizedVin}?format=json`;
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return json({ error: 'VIN service unavailable.' }, 502);
    }

    const data = await response.json();
    const row = Array.isArray(data.Results) ? data.Results[0] : null;

    if (!row) {
      return json({ error: 'VIN could not be decoded.' }, 404);
    }

    const vehicle = {
      vin: normalizedVin,
      make: clean(row.Make),
      model: clean(row.Model),
      modelYear: clean(row.ModelYear),
      bodyClass: clean(row.BodyClass),
      vehicleType: clean(row.VehicleType),
      trim: clean(row.Trim),
      series: clean(row.Series),
      engineCylinders: clean(row.EngineCylinders),
      displacementL: clean(row.DisplacementL),
      fuelTypePrimary: clean(row.FuelTypePrimary),
      driveType: clean(row.DriveType),
      transmissionStyle: clean(row.TransmissionStyle),
      doors: clean(row.Doors),
      manufacturer: clean(row.Manufacturer),
      plantCountry: clean(row.PlantCountry),
      plantCity: clean(row.PlantCity),
      errorCode: clean(row.ErrorCode),
      errorText: clean(row.ErrorText),
    };

    return json({ vehicle });
  } catch (error) {
    return json({ error: 'Could not decode VIN.' }, 500);
  }
}
