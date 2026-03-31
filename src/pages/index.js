// src/pages/index.js
import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import {
  calculateHeliographicCoordinates,
  determineImageCenterAndRadius,
  readImageFile,
  readFitsFile,
  extractZoomRegion,
} from '../utils/solarCalculations';

// SSR-safe dynamic imports
const KonvaComponents  = dynamic(() => import('../components/KonvaComponents'),  { ssr: false });
const UploadPanel      = dynamic(() => import('../components/UploadPanel'),      { ssr: false });
const ZoomViewer       = dynamic(() => import('../components/ZoomViewer'),       { ssr: false });
const SidebarControls  = dynamic(() => import('../components/SidebarControls'),  { ssr: false });
const MeasurementsPanel= dynamic(() => import('../components/MeasurementsPanel'),{ ssr: false });
const ImageInfoPanel   = dynamic(() => import('../components/ImageInfoPanel'),   { ssr: false });

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_DISPLAY_WIDTH  = 800;
const MAX_DISPLAY_HEIGHT = 700;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scaledDimensions = (w, h) => {
  let scale = 1;
  if (w > MAX_DISPLAY_WIDTH)  scale = Math.min(scale, MAX_DISPLAY_WIDTH  / w);
  if (h > MAX_DISPLAY_HEIGHT) scale = Math.min(scale, MAX_DISPLAY_HEIGHT / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale), scale };
};

export default function Home() {
  // ── Image store ─────────────────────────────────────────────────────────────
  const [images, setImages]               = useState({});        // filename → imageRecord
  const [sortedFilenames, setSortedFilenames] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ── Current image derived state ─────────────────────────────────────────────
  const [currentImage, setCurrentImage]   = useState(null);
  const [obsTime,      setObsTime]        = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions,  setDisplayDimensions]  = useState({ width: 800, height: 600 });
  const [imageScale,   setImageScale]     = useState(1);
  const [sunParams,    setSunParams]      = useState({ cx: 0, cy: 0, radius: 0 });
  const [adjustedSunParams, setAdjustedSunParams] = useState({ cx: 0, cy: 0, radius: 0 });

  // ── Selection state ──────────────────────────────────────────────────────────
  const [currentSelection,   setCurrentSelection]   = useState(null);
  const [selectionCoords,    setSelectionCoords]    = useState(null);
  const [heliographicCoords, setHeliographicCoords] = useState(null);
  const [distanceFromCenter, setDistanceFromCenter] = useState(null);
  const [zoomedRegion,       setZoomedRegion]       = useState(null);

  // ── Measurement store ────────────────────────────────────────────────────────
  const [measurements, setMeasurements]   = useState([]);
  const [featureLabel, setFeatureLabel]   = useState('');

  // ── Configuration ────────────────────────────────────────────────────────────
  const [forceFitsData,       setForceFitsData]       = useState(true);
  const [radiusCorrection,    setRadiusCorrection]    = useState(1.0);
  const [centerXOffset,       setCenterXOffset]       = useState(0);
  const [centerYOffset,       setCenterYOffset]       = useState(0);
  const [detectionMethod,     setDetectionMethod]     = useState('detect');
  const [contourThreshold,    setContourThreshold]    = useState(30);
  const [showSunBoundary,     setShowSunBoundary]     = useState(true);
  const [disableBoundaryCheck,setDisableBoundaryCheck]= useState(false);
  const [selectionMode,       setSelectionMode]       = useState('point');
  const [zoomSize,            setZoomSize]            = useState(100);
  const [zoomFactor,          setZoomFactor]          = useState(6);

  // ── Animation ────────────────────────────────────────────────────────────────
  const [animationRunning, setAnimationRunning] = useState(false);
  const [animationSpeed,   setAnimationSpeed]   = useState(500);
  const animationRef = useRef(null);

  // ── UI tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('measurements');

  // ── Error state ──────────────────────────────────────────────────────────────
  const [error, setError] = useState('');

  // ─── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (animationRunning && sortedFilenames.length > 1) {
      animationRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % sortedFilenames.length);
      }, animationSpeed);
    }
    return () => clearInterval(animationRef.current);
  }, [animationRunning, animationSpeed, sortedFilenames.length]);

  // ─── Load current image when index changes ────────────────────────────────
  useEffect(() => {
    if (!sortedFilenames.length) return;
    const idx = Math.min(currentImageIndex, sortedFilenames.length - 1);
    const rec = images[sortedFilenames[idx]];
    if (!rec) return;

    setCurrentImage(rec.image);
    setObsTime(rec.obsTime);
    setOriginalDimensions({ width: rec.width, height: rec.height });

    const { width, height, scale } = scaledDimensions(rec.width, rec.height);
    setDisplayDimensions({ width, height });
    setImageScale(scale);

    setSunParams(rec.sunParams || { cx: rec.width / 2, cy: rec.height / 2, radius: Math.min(rec.width, rec.height) * 0.45 });

    // Clear selection when switching images
    setCurrentSelection(null);
    setSelectionCoords(null);
    setHeliographicCoords(null);
    setDistanceFromCenter(null);
    setZoomedRegion(null);
    setError('');
  }, [currentImageIndex, sortedFilenames, images]);

  // ─── Recalculate adjusted sun params whenever relevant config changes ─────
  useEffect(() => {
    if (!sunParams.radius) return;
    setAdjustedSunParams({
      cx:     sunParams.cx     * imageScale + centerXOffset,
      cy:     sunParams.cy     * imageScale + centerYOffset,
      radius: sunParams.radius * imageScale * radiusCorrection,
    });
  }, [sunParams, imageScale, centerXOffset, centerYOffset, radiusCorrection]);

  // ─── File upload handler ──────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (files) => {
    const newImages = { ...images };
    let anyLoaded = false;

    // Group files by base name (strip extension)
    const groups = {};
    for (const file of files) {
      const parts = file.name.split('.');
      const ext   = parts.pop().toLowerCase();
      const base  = parts.join('.');
      if (!groups[base]) groups[base] = {};
      if (['fits', 'fit'].includes(ext)) groups[base].fits = file;
      else if (['png', 'jpg', 'jpeg'].includes(ext)) groups[base].image = file;
      else if (ext === 'json') groups[base].json = file;
    }

    for (const [base, group] of Object.entries(groups)) {
      // Skip already-loaded
      if (Object.keys(newImages).some((n) => n.startsWith(base))) continue;

      try {
        let rec;

        if (group.fits) {
          // ── FITS file ──
          const result = await readFitsFile(group.fits);
          rec = {
            image:    result.image,
            obsTime:  result.obsTime,
            width:    result.image.naturalWidth  || result.image.width,
            height:   result.image.naturalHeight || result.image.height,
            sunParams: (forceFitsData && result.sunParams) ? result.sunParams : null,
            isFits:   true,
          };
        } else if (group.image) {
          // ── PNG / JPG ──
          const img = await readImageFile(group.image);
          let obsTimeData = new Date();
          let sunParamsData = null;

          // Try companion JSON
          if (group.json) {
            try {
              const text = await group.json.text();
              const meta = JSON.parse(text);

              if (meta.sun_params) {
                sunParamsData = meta.sun_params;
              } else if (meta.header) {
                const h = meta.header;
                if (h.FNDLMBXC && h.FNDLMBYC && (h.FNDLMBMI || h.FNDLMBMA)) {
                  const minor = parseFloat(h.FNDLMBMI || h.FNDLMBMA);
                  const major = parseFloat(h.FNDLMBMA || h.FNDLMBMI);
                  sunParamsData = {
                    cx:     parseFloat(h.FNDLMBXC),
                    cy:     parseFloat(h.FNDLMBYC),
                    radius: (minor + major) / 2,
                  };
                }
              }

              if (meta.observation_time) {
                obsTimeData = new Date(meta.observation_time);
              } else if (meta.header?.['DATE-OBS']) {
                const d = meta.header['DATE-OBS'];
                const t = meta.header['TIME-OBS'] || '00:00:00';
                obsTimeData = new Date(`${d}T${t}`);
              }
            } catch (e) {
              console.warn('JSON parse error:', e);
            }
          }

          rec = {
            image:     img,
            obsTime:   obsTimeData,
            width:     img.naturalWidth  || img.width,
            height:    img.naturalHeight || img.height,
            sunParams: sunParamsData,
            isFits:    false,
          };
        } else {
          continue; // JSON-only group — skip
        }

        // Detect sun if no params yet
        if (!rec.sunParams) {
          const assumeCentered = rec.isFits && forceFitsData
            ? false
            : detectionMethod === 'center';
          rec.sunParams = determineImageCenterAndRadius(
            rec.image,
            assumeCentered,
            contourThreshold
          );
        }

        newImages[group.fits ? group.fits.name : group.image.name] = rec;
        anyLoaded = true;
      } catch (e) {
        console.error(`Error loading ${base}:`, e);
      }
    }

    if (anyLoaded) {
      setImages(newImages);
      const sorted = Object.keys(newImages).sort();
      setSortedFilenames(sorted);
      setCurrentImageIndex(0);
    }
  }, [images, forceFitsData, detectionMethod, contourThreshold]);

  // ─── Selection handler (called by KonvaComponents) ────────────────────────
  const handleSelectionMade = useCallback((selection) => {
    if (!currentImage || animationRunning) return;

    // Centre of selection in display coords
    const dispX = selection.x + (selection.width  > 1 ? selection.width  / 2 : 0);
    const dispY = selection.y + (selection.height > 1 ? selection.height / 2 : 0);

    // Boundary check
    if (!disableBoundaryCheck && adjustedSunParams.radius > 0) {
      const dist = Math.hypot(dispX - adjustedSunParams.cx, dispY - adjustedSunParams.cy);
      if (dist > adjustedSunParams.radius * 1.02) {
        setError('Selection is outside the solar disc. Enable "Allow off-disc clicks" to override.');
        return;
      }
    }
    setError('');

    // Convert display → original image coordinates
    const origX = dispX / imageScale;
    const origY = dispY / imageScale;

    // Heliographic coordinates (uses obsTime for live B0/L0/P)
    const hc = calculateHeliographicCoordinates(
      origX, origY,
      sunParams.cx, sunParams.cy,
      sunParams.radius,
      obsTime || new Date()
    );

    if (isNaN(hc.longitude) || isNaN(hc.latitude)) {
      setError('Point is outside the solar disc (normalised radius > 1). Try adjusting the boundary circle.');
      return;
    }

    const dist    = Math.hypot(origX - sunParams.cx, origY - sunParams.cy);
    const distPct = (dist / sunParams.radius) * 100;

    setCurrentSelection(selection);
    setSelectionCoords({ display: { x: dispX, y: dispY }, original: { x: origX, y: origY } });
    setHeliographicCoords(hc);
    setDistanceFromCenter({ pixels: dist, percent: distPct });
    setZoomedRegion(extractZoomRegion(currentImage, origX, origY, zoomSize, zoomFactor));
  }, [
    currentImage, animationRunning, disableBoundaryCheck,
    adjustedSunParams, imageScale, sunParams, obsTime, zoomSize, zoomFactor,
  ]);

  // ─── Record measurement ───────────────────────────────────────────────────
  const recordMeasurement = () => {
    if (!selectionCoords || !heliographicCoords) return;
    setMeasurements((prev) => [
      ...prev,
      {
        image:           sortedFilenames[currentImageIndex],
        observationTime: obsTime ? obsTime.toISOString() : new Date().toISOString(),
        pixelX:          selectionCoords.original.x,
        pixelY:          selectionCoords.original.y,
        helioLongitude:  heliographicCoords.longitude,
        helioLatitude:   heliographicCoords.latitude,
        distancePercent: distanceFromCenter?.percent ?? 0,
        label:           featureLabel.trim(),
      },
    ]);
    setFeatureLabel('');
  };

  // ─── Derived: current filename ────────────────────────────────────────────
  const currentFilename = sortedFilenames[currentImageIndex] || '';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Head>
        <title>CLEAjs — Solar Rotation Analysis</title>
        <meta name="description" content="Heliographic coordinate measurement tool for solar rotation labs" />
      </Head>

      {/* ════ Sidebar ════ */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
        {/* Logo / title */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-800">
          <h1 className="text-base font-bold tracking-tight text-white">☀️ CLEAjs</h1>
          <p className="text-xs text-slate-500 mt-0.5">Solar Rotation Analysis</p>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <SidebarControls
            forceFitsData={forceFitsData}             setForceFitsData={setForceFitsData}
            radiusCorrection={radiusCorrection}       setRadiusCorrection={setRadiusCorrection}
            centerXOffset={centerXOffset}             setCenterXOffset={setCenterXOffset}
            centerYOffset={centerYOffset}             setCenterYOffset={setCenterYOffset}
            selectionMode={selectionMode}             setSelectionMode={setSelectionMode}
            detectionMethod={detectionMethod}         setDetectionMethod={setDetectionMethod}
            contourThreshold={contourThreshold}       setContourThreshold={setContourThreshold}
            showSunBoundary={showSunBoundary}         setShowSunBoundary={setShowSunBoundary}
            disableBoundaryCheck={disableBoundaryCheck} setDisableBoundaryCheck={setDisableBoundaryCheck}
            animationRunning={animationRunning}       setAnimationRunning={setAnimationRunning}
            animationSpeed={animationSpeed}           setAnimationSpeed={setAnimationSpeed}
            currentImageIndex={currentImageIndex}     setCurrentImageIndex={setCurrentImageIndex}
            totalImages={sortedFilenames.length}
            zoomSize={zoomSize}                       setZoomSize={setZoomSize}
            zoomFactor={zoomFactor}                   setZoomFactor={setZoomFactor}
          />
        </div>

        {/* Upload panel */}
        <div className="px-4 pb-4 border-t border-slate-800 pt-3">
          <UploadPanel onFileUpload={handleFileUpload} />
        </div>
      </aside>

      {/* ════ Main content ════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 h-12">
          <div className="text-sm font-medium text-slate-200 truncate">
            {currentFilename
              ? <><span className="text-slate-500 mr-2">{currentImageIndex + 1}/{sortedFilenames.length}</span>{currentFilename}</>
              : <span className="text-slate-500">No image loaded — upload images in the sidebar</span>
            }
          </div>
          {obsTime && (
            <div className="text-xs text-slate-500 font-mono ml-4 flex-shrink-0">
              {obsTime.toISOString().replace('T', ' ').slice(0, 19)} UTC
            </div>
          )}
        </header>

        {/* Body: image + right panel */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Image canvas area ── */}
          <main className="flex-1 flex items-start justify-center p-4 overflow-auto bg-slate-950">
            {currentImage ? (
              <div className="relative">
                {animationRunning ? (
                  // Simple img tag during animation for performance
                  <img
                    src={currentImage.src}
                    alt="Solar image"
                    style={{ width: displayDimensions.width, height: displayDimensions.height, display: 'block' }}
                  />
                ) : (
                  <KonvaComponents
                    image={currentImage}
                    width={displayDimensions.width}
                    height={displayDimensions.height}
                    showSunBoundary={showSunBoundary}
                    sunParams={adjustedSunParams}
                    currentSelection={currentSelection}
                    selectionMode={selectionMode}
                    onSelectionMade={handleSelectionMade}
                  />
                )}

                {/* Error overlay */}
                {error && (
                  <div className="absolute bottom-2 left-2 right-2 bg-red-900/80 border border-red-700 text-red-200 text-xs px-3 py-2 rounded-lg">
                    ⚠ {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-6xl mb-4">☀</div>
                <p className="text-sm">Upload solar images to begin.</p>
                <p className="text-xs mt-1">Supports JPG · PNG · FITS · PNG+JSON pairs</p>
              </div>
            )}
          </main>

          {/* ── Right panel ── */}
          <aside className="w-80 flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">

            {/* Tabs */}
            <div className="flex flex-shrink-0 border-b border-slate-800">
              {['measurements', 'imageInfo'].map((tab) => (
                <button
                  key={tab}
                  className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                    activeTab === tab
                      ? 'text-violet-300 border-b-2 border-violet-500'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'measurements' ? 'Measure' : 'Image Info'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'measurements' ? (
                <div className="space-y-4">
                  {/* Selection data */}
                  {!animationRunning && selectionCoords && heliographicCoords && (
                    <div className="bg-slate-800/60 rounded-lg p-3 space-y-2 border border-slate-700">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Current Selection
                      </h3>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-500">Display</span>
                        <span className="font-mono text-slate-200">
                          ({selectionCoords.display.x.toFixed(1)}, {selectionCoords.display.y.toFixed(1)})
                        </span>
                        <span className="text-slate-500">Original</span>
                        <span className="font-mono text-slate-200">
                          ({selectionCoords.original.x.toFixed(1)}, {selectionCoords.original.y.toFixed(1)})
                        </span>
                        <span className="text-slate-500">Helio Lon</span>
                        <span className="font-mono text-violet-300 font-bold">
                          {heliographicCoords.longitude.toFixed(3)}°
                        </span>
                        <span className="text-slate-500">Helio Lat</span>
                        <span className="font-mono text-violet-300 font-bold">
                          {heliographicCoords.latitude.toFixed(3)}°
                        </span>
                        <span className="text-slate-500">Distance</span>
                        <span className="font-mono text-slate-200">
                          {distanceFromCenter?.pixels.toFixed(1)} px ({distanceFromCenter?.percent.toFixed(1)}%)
                        </span>
                      </div>

                      {/* Zoom viewer */}
                      {zoomedRegion && (
                        <div className="mt-2">
                          <ZoomViewer image={zoomedRegion} />
                        </div>
                      )}

                      {/* Record measurement */}
                      <div className="pt-2 border-t border-slate-700 space-y-2">
                        <input
                          type="text"
                          placeholder="Feature label (e.g. Sunspot A)"
                          className="w-full text-xs bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                          value={featureLabel}
                          onChange={(e) => setFeatureLabel(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') recordMeasurement(); }}
                        />
                        <button
                          onClick={recordMeasurement}
                          className="w-full py-1.5 text-xs font-semibold rounded bg-violet-700 hover:bg-violet-600 text-white transition-colors"
                        >
                          Record Measurement
                        </button>
                      </div>
                    </div>
                  )}

                  {!animationRunning && !selectionCoords && currentImage && (
                    <p className="text-xs text-slate-500">
                      Click{selectionMode === 'rect' ? ' and drag' : ''} on the solar image to select a feature.
                    </p>
                  )}

                  {animationRunning && (
                    <p className="text-xs text-slate-500">Pause the animation to make measurements.</p>
                  )}

                  <MeasurementsPanel
                    measurements={measurements}
                    setMeasurements={setMeasurements}
                  />
                </div>
              ) : (
                <ImageInfoPanel
                  originalDimensions={originalDimensions}
                  displayDimensions={displayDimensions}
                  obsTime={obsTime}
                  sunParams={sunParams}
                  adjustedSunParams={adjustedSunParams}
                  imageScale={imageScale}
                  centerXOffset={centerXOffset}
                  centerYOffset={centerYOffset}
                  radiusCorrection={radiusCorrection}
                  forceFitsData={forceFitsData}
                  currentFilename={currentFilename}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
