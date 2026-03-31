// src/utils/solarCalculations.js
// Fully corrected solar calculations

// ─── Math helpers ────────────────────────────────────────────────────────────
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

// ─── Carrington / Solar Ephemeris ────────────────────────────────────────────
/**
 * Compute solar ephemeris quantities for a given Date.
 * Returns B0 (heliographic latitude of disc centre, degrees),
 *         L0 (Carrington longitude of disc centre, degrees),
 *         P  (position angle of solar north pole, degrees).
 *
 * Algorithm: Astronomical Algorithms, Meeus (Ch. 27 / Ch. 29).
 * Accurate to ~0.1° for dates within a few decades of J2000.
 */
export const solarEphemeris = (date) => {
  // Julian Day Number
  const JD = date / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525; // Julian centuries from J2000.0

  // Geometric mean longitude of the Sun (degrees)
  const L0sun = (280.46646 + 36000.76983 * T) % 360;

  // Mean anomaly of the Sun (degrees)
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = ((M % 360) + 360) % 360;
  const Mrad = toRad(M);

  // Equation of centre
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  // Sun's true longitude
  const sunLon = L0sun + C;

  // Apparent longitude (correct for nutation & aberration)
  const omega = 125.04 - 1934.136 * T;
  const lambda = sunLon - 0.00569 - 0.00478 * Math.sin(toRad(omega));

  // Obliquity of the ecliptic
  const eps0 = 23.439291111 - 0.013004167 * T;
  const eps = eps0 + 0.00256 * Math.cos(toRad(omega));

  // ── P angle (position angle of solar north pole) ──────────────────────────
  // Inclination of solar equator to ecliptic: 7.25°
  // Longitude of ascending node of solar equator: 75.76 + 1.397*T
  const theta = sunLon - 75.76 - 1.397 * T; // argument for node
  const P =
    toDeg(
      Math.atan(
        -Math.cos(toRad(lambda)) * Math.tan(toRad(eps))
      )
    ) +
    toDeg(
      Math.atan(
        -Math.cos(toRad(sunLon - 75.76 - 1.397 * T)) *
          Math.tan(toRad(7.25))
      )
    );

  // ── B0 (heliographic latitude of disc centre) ─────────────────────────────
  const B0 = toDeg(
    Math.asin(
      Math.sin(toRad(7.25)) *
        Math.sin(toRad(sunLon - 75.76 - 1.397 * T))
    )
  );

  // ── L0 (Carrington longitude of disc centre) ──────────────────────────────
  // Days since Carrington rotation epoch (JD 2398167.4 = 1853 Nov 9 rot #1)
  const JDE = JD;
  // Carrington rotation number at this JDE
  const CR = (JDE - 2398167.4) / 27.2753;
  // L0 = fractional part * 360, measured westward
  let L0 = 360 * (1 - (CR - Math.floor(CR)));
  if (L0 < 0) L0 += 360;
  if (L0 >= 360) L0 -= 360;

  return { B0, L0, P };
};

// ─── Heliographic coordinate calculation ─────────────────────────────────────
/**
 * Convert pixel (x, y) on the displayed solar image to heliographic
 * longitude and latitude.
 *
 * @param {number} x         - pixel X in original image space
 * @param {number} y         - pixel Y in original image space
 * @param {number} centerX   - solar disc centre X (original image space)
 * @param {number} centerY   - solar disc centre Y (original image space)
 * @param {number} radius    - solar disc radius (original image space)
 * @param {Date}   obsTime   - observation date/time
 * @param {boolean} fitsOrientation - true if image came from FITS (row 0 = bottom)
 * @returns {{ longitude: number, latitude: number }}
 */
export const calculateHeliographicCoordinates = (
  x, y, centerX, centerY, radius, obsTime, fitsOrientation = false
) => {
  const { B0, L0, P } = solarEphemeris(obsTime || new Date());

  // Translate to solar-disc coordinates (origin at centre)
  const dx = x - centerX;
  // Y-axis: image space has Y increasing downward; helio space has Y upward.
  // FITS images are already stored bottom-up, so after our flip correction
  // both cases end up with the same sign here.
  const dy = centerY - y;

  // Normalised position (in units of solar radius)
  const rho = Math.sqrt(dx * dx + dy * dy) / radius;

  if (rho > 1.0) {
    // Outside disc — return NaN so callers can flag this
    return { longitude: NaN, latitude: NaN };
  }

  // Position angle from solar north (corrected for P angle)
  let eta = toDeg(Math.atan2(dx, dy)) - P;

  const B0rad = toRad(B0);
  // Arc distance from disc centre (rho=1 → 90°)
  const rhoRad = Math.asin(Math.min(rho, 1.0)); // rho in [-1,1]; asin safer than *90

  // Heliographic latitude B
  const sinB =
    Math.sin(B0rad) * Math.cos(rhoRad) +
    Math.cos(B0rad) * Math.sin(rhoRad) * Math.cos(toRad(eta));
  const B = toDeg(Math.asin(Math.max(-1, Math.min(1, sinB))));

  // Heliographic longitude L
  const sinA = (Math.sin(rhoRad) * Math.sin(toRad(eta))) / Math.cos(toRad(B));
  const cosA =
    (Math.cos(rhoRad) - Math.sin(B0rad) * Math.sin(toRad(B))) /
    (Math.cos(B0rad) * Math.cos(toRad(B)));
  let L = toDeg(Math.atan2(sinA, cosA)) + L0;

  // Normalise to [−180, +180]
  while (L > 180) L -= 360;
  while (L < -180) L += 360;

  return { longitude: L, latitude: B };
};

// ─── Sun disc detection ───────────────────────────────────────────────────────
/**
 * Detect the solar disc in a rendered HTMLImageElement via canvas pixel sampling.
 * Falls back to image-centre estimate if detection fails.
 *
 * Strategy:
 *  1. Render the image to an off-screen canvas at reduced resolution.
 *  2. Threshold pixels by luminance to build a binary mask.
 *  3. Find bounding box of bright region → estimate centre & radius.
 *
 * @param {HTMLImageElement} image
 * @param {boolean} assumeCentered - if true, skip detection and return centre
 * @param {number}  threshold      - luminance threshold 0-255 (default 30)
 * @returns {{ cx: number, cy: number, radius: number }}
 */
export const determineImageCenterAndRadius = (image, assumeCentered, threshold = 30) => {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;

  if (assumeCentered || w === 0 || h === 0) {
    return { cx: w / 2, cy: h / 2, radius: Math.min(w, h) * 0.45 };
  }

  try {
    // Work at reduced resolution for speed
    const SCALE = Math.min(1, 512 / Math.max(w, h));
    const sw = Math.round(w * SCALE);
    const sh = Math.round(h * SCALE);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, sw, sh);

    const { data } = ctx.getImageData(0, 0, sw, sh);

    let minX = sw, maxX = 0, minY = sh, maxY = 0;
    let found = false;

    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const idx = (py * sw + px) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum > threshold) {
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
          found = true;
        }
      }
    }

    if (!found) throw new Error('No bright region found');

    // Convert back to full-resolution coords
    const cx = ((minX + maxX) / 2) / SCALE;
    const cy = ((minY + maxY) / 2) / SCALE;
    const radius = Math.max((maxX - minX), (maxY - minY)) / (2 * SCALE);

    return { cx, cy, radius: radius * 0.95 }; // slight inset
  } catch (e) {
    console.warn('Sun detection failed, using centre estimate:', e.message);
    return { cx: w / 2, cy: h / 2, radius: Math.min(w, h) * 0.45 };
  }
};

// ─── FITS file reader ─────────────────────────────────────────────────────────
/**
 * Read a FITS file.
 * Attempts to parse the FITS binary; falls back to treating the file as a
 * regular image (some export pipelines save PNG with a .fits extension).
 *
 * FITS images store rows bottom-to-top.  We flip vertically so that north
 * is up in the canvas display.
 *
 * Returns { image: HTMLImageElement, obsTime: Date, sunParams: {cx,cy,radius}|null, isFits: boolean }
 */
export const readFitsFile = async (file) => {
  // ── 1. Try to load as a regular image first (PNG/JPEG wrapped as .fits) ──
  const tryAsImage = () =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(); };
      img.src = url;
    });

  // ── 2. Attempt minimal FITS binary parse ──────────────────────────────────
  const tryAsFits = async () => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // FITS header: 2880-byte blocks of 80-char cards, ASCII
    const decoder = new TextDecoder('ascii');
    let headerEnd = -1;
    let naxis1 = 0, naxis2 = 0, bitpix = 16;
    let bscale = 1, bzero = 0;
    let dateObs = null, timeObs = null;
    let cx = null, cy = null, r = null;

    // Parse header blocks
    for (let block = 0; block * 2880 < bytes.length; block++) {
      const blockText = decoder.decode(bytes.slice(block * 2880, (block + 1) * 2880));
      for (let i = 0; i < 36; i++) {
        const card = blockText.slice(i * 80, (i + 1) * 80);
        const key = card.slice(0, 8).trim();
        const val = card.slice(10, 80).split('/')[0].trim();

        if (key === 'END') { headerEnd = (block + 1) * 2880; break; }
        if (key === 'NAXIS1') naxis1 = parseInt(val);
        if (key === 'NAXIS2') naxis2 = parseInt(val);
        if (key === 'BITPIX') bitpix = parseInt(val);
        if (key === 'BSCALE') bscale = parseFloat(val) || 1;
        if (key === 'BZERO')  bzero  = parseFloat(val) || 0;
        if (key === 'DATE-OBS') dateObs = val.replace(/'/g, '').trim();
        if (key === 'TIME-OBS') timeObs = val.replace(/'/g, '').trim();
        // Sun centre from common FITS keywords
        if (key === 'CRPIX1') cx = parseFloat(val);
        if (key === 'CRPIX2') cy = parseFloat(val);
        if (key === 'FNDLMBXC') cx = parseFloat(val);
        if (key === 'FNDLMBYC') cy = parseFloat(val);
        if (key === 'FNDLMBMI' || key === 'R_SUN') r = parseFloat(val);
      }
      if (headerEnd > 0) break;
    }

    if (headerEnd < 0 || naxis1 === 0 || naxis2 === 0) {
      throw new Error('Not a valid FITS image');
    }

    // Build observation time
    let obsTime = new Date();
    if (dateObs) {
      try {
        obsTime = new Date(dateObs + (timeObs ? 'T' + timeObs : ''));
      } catch (_) { /* use current time */ }
    }

    // Sun parameters (if not in header, will be detected later)
    const sunParams = (cx && cy && r) ? { cx, cy, radius: r } : null;

    // ── Render pixel data to canvas ──────────────────────────────────────────
    const bytesPerPixel = Math.abs(bitpix) / 8;
    const dataBytes = bytes.slice(headerEnd, headerEnd + naxis1 * naxis2 * bytesPerPixel);
    const view = new DataView(dataBytes.buffer, dataBytes.byteOffset);

    // Find min/max for normalisation
    let minVal = Infinity, maxVal = -Infinity;
    const rawPixels = new Float32Array(naxis1 * naxis2);
    for (let i = 0; i < naxis1 * naxis2; i++) {
      let raw;
      const offset = i * bytesPerPixel;
      if (bitpix === 16)       raw = view.getInt16(offset, false);
      else if (bitpix === 32)  raw = view.getInt32(offset, false);
      else if (bitpix === -32) raw = view.getFloat32(offset, false);
      else if (bitpix === -64) raw = view.getFloat64(offset, false);
      else if (bitpix === 8)   raw = view.getUint8(offset);
      else                     raw = view.getInt16(offset, false);
      const phys = raw * bscale + bzero;
      rawPixels[i] = phys;
      if (isFinite(phys)) { minVal = Math.min(minVal, phys); maxVal = Math.max(maxVal, phys); }
    }

    const range = maxVal - minVal || 1;
    const canvas = document.createElement('canvas');
    canvas.width = naxis1;
    canvas.height = naxis2;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(naxis1, naxis2);

    // FITS rows are bottom-to-top → flip vertically when writing to canvas
    for (let row = 0; row < naxis2; row++) {
      const canvasRow = naxis2 - 1 - row; // flip
      for (let col = 0; col < naxis1; col++) {
        const srcIdx = row * naxis1 + col;
        const dstIdx = (canvasRow * naxis1 + col) * 4;
        const norm = Math.round(((rawPixels[srcIdx] - minVal) / range) * 255);
        imgData.data[dstIdx]     = norm;
        imgData.data[dstIdx + 1] = norm;
        imgData.data[dstIdx + 2] = norm;
        imgData.data[dstIdx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = canvas.toDataURL();
    });

    return { image: img, obsTime, sunParams, isFits: true };
  };

  // ── Try FITS parse first, fall back to plain image ────────────────────────
  try {
    return await tryAsFits();
  } catch (_) {
    try {
      const img = await tryAsImage();
      return { image: img, obsTime: new Date(), sunParams: null, isFits: false };
    } catch (_2) {
      throw new Error(`Cannot read file: ${file.name}`);
    }
  }
};

// ─── Regular image reader ─────────────────────────────────────────────────────
export const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── Zoom region extractor ────────────────────────────────────────────────────
export const extractZoomRegion = (image, centerX, centerY, zoomSize = 60, zoomFactor = 4) => {
  try {
    const half = Math.floor(zoomSize / 2);
    const left   = Math.max(0, Math.floor(centerX - half));
    const top    = Math.max(0, Math.floor(centerY - half));
    const right  = Math.min(image.naturalWidth || image.width, Math.ceil(centerX + half));
    const bottom = Math.min(image.naturalHeight || image.height, Math.ceil(centerY + half));
    const w = right - left;
    const h = bottom - top;

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 2;
    canvas.width  = w * zoomFactor * dpr;
    canvas.height = h * zoomFactor * dpr;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(image, left, top, w, h, 0, 0, canvas.width, canvas.height);

    // Crosshair
    const cx2 = canvas.width  / 2;
    const cy2 = canvas.height / 2;
    ctx.strokeStyle = 'rgba(255,80,220,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy2); ctx.lineTo(canvas.width, cy2);  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx2, 0); ctx.lineTo(cx2, canvas.height); ctx.stroke();

    canvas.style.imageRendering = 'pixelated';
    return canvas.toDataURL();
  } catch (err) {
    console.error('extractZoomRegion:', err);
    return null;
  }
};

// ─── Percentile clip utility ────────────────────────────────────────────────
export const clipPercentile = (data, lowPct = 0.5, highPct = 99.5) => {
  const n = data.length;
  const maxSamples = 10000;
  let sampled;
  if (n <= maxSamples) {
    sampled = Float32Array.from(data);
  } else {
    sampled = new Float32Array(maxSamples);
    const step = n / maxSamples;
    for (let i = 0; i < maxSamples; i++) {
      sampled[i] = data[Math.floor(i * step)];
    }
  }
  sampled.sort();
  const lowIdx  = Math.floor((lowPct / 100) * (sampled.length - 1));
  const highIdx = Math.ceil((highPct / 100) * (sampled.length - 1));
  return { minVal: sampled[lowIdx], maxVal: sampled[highIdx] };
};
