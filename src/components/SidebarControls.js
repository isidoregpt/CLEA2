// src/components/SidebarControls.js
import React from 'react';

const Slider = ({ label, min, max, step, value, onChange, display }) => (
  <div>
    <div className="flex justify-between items-baseline mb-1">
      <label className="text-xs text-slate-400">{label}</label>
      <span className="text-xs font-mono text-slate-300">{display ?? value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-500"
    />
  </div>
);

const Toggle = ({ id, label, checked, onChange }) => (
  <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
    <div className="relative">
      <input
        type="checkbox"
        id={id}
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className={`w-8 h-4 rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-slate-600'}`} />
      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </div>
    <span className="text-xs text-slate-300">{label}</span>
  </label>
);

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-700 pb-1">
      {title}
    </h2>
    {children}
  </div>
);

const SidebarControls = ({
  forceFitsData, setForceFitsData,
  radiusCorrection, setRadiusCorrection,
  centerXOffset, setCenterXOffset,
  centerYOffset, setCenterYOffset,
  selectionMode, setSelectionMode,
  detectionMethod, setDetectionMethod,
  contourThreshold, setContourThreshold,
  showSunBoundary, setShowSunBoundary,
  disableBoundaryCheck, setDisableBoundaryCheck,
  animationRunning, setAnimationRunning,
  animationSpeed, setAnimationSpeed,
  currentImageIndex, setCurrentImageIndex,
  totalImages,
  zoomSize, setZoomSize,
  zoomFactor, setZoomFactor,
}) => (
  <div className="space-y-5">
    {/* ── Image & Detection ── */}
    <Section title="Image">
      <Toggle
        id="forceFitsData"
        label="Prefer FITS header data"
        checked={forceFitsData}
        onChange={setForceFitsData}
      />

      <div>
        <p className="text-xs text-slate-400 mb-1">Sun Detection Method</p>
        <div className="flex gap-3">
          {['center', 'detect'].map((m) => (
            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="detectionMethod"
                value={m}
                checked={detectionMethod === m}
                onChange={() => setDetectionMethod(m)}
                className="accent-violet-500"
              />
              <span className="text-xs text-slate-300 capitalize">
                {m === 'center' ? 'Assume Centred' : 'Auto-detect'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {detectionMethod === 'detect' && (
        <Slider
          label="Luminance threshold"
          min={5} max={80} step={1}
          value={contourThreshold}
          onChange={(v) => setContourThreshold(Math.round(v))}
        />
      )}
    </Section>

    {/* ── Boundary circle ── */}
    <Section title="Boundary Circle">
      <Toggle id="showBoundary" label="Show boundary" checked={showSunBoundary} onChange={setShowSunBoundary} />
      <Toggle id="disableBoundary" label="Allow off-disc clicks" checked={disableBoundaryCheck} onChange={setDisableBoundaryCheck} />
      <Slider
        label="Radius correction"
        min={0.5} max={3.0} step={0.05}
        value={radiusCorrection}
        onChange={setRadiusCorrection}
        display={radiusCorrection.toFixed(2) + '×'}
      />
      <Slider
        label="Horizontal offset"
        min={-200} max={200} step={1}
        value={centerXOffset}
        onChange={(v) => setCenterXOffset(Math.round(v))}
        display={centerXOffset + ' px'}
      />
      <Slider
        label="Vertical offset"
        min={-200} max={200} step={1}
        value={centerYOffset}
        onChange={(v) => setCenterYOffset(Math.round(v))}
        display={centerYOffset + ' px'}
      />
    </Section>

    {/* ── Selection mode ── */}
    <Section title="Selection Mode">
      <div className="flex gap-3">
        {['point', 'rect'].map((m) => (
          <label key={m} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="selectionMode"
              value={m}
              checked={selectionMode === m}
              onChange={() => setSelectionMode(m)}
              className="accent-violet-500"
            />
            <span className="text-xs text-slate-300 capitalize">{m === 'point' ? 'Point' : 'Rectangle'}</span>
          </label>
        ))}
      </div>
    </Section>

    {/* ── Zoom viewer ── */}
    <Section title="Zoom Viewer">
      <Slider label="Region size (px)" min={20} max={300} step={5} value={zoomSize} onChange={(v) => setZoomSize(Math.round(v))} display={zoomSize + ' px'} />
      <Slider label="Zoom factor" min={2} max={12} step={1} value={zoomFactor} onChange={(v) => setZoomFactor(Math.round(v))} display={zoomFactor + '×'} />
    </Section>

    {/* ── Animation ── */}
    <Section title="Animation">
      <Slider
        label="Frame delay"
        min={100} max={2000} step={50}
        value={animationSpeed}
        onChange={(v) => setAnimationSpeed(Math.round(v))}
        display={animationSpeed + ' ms'}
      />

      <div className="flex gap-2">
        <button
          className="flex-1 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-40 transition-colors"
          onClick={() => { setAnimationRunning(false); setCurrentImageIndex(Math.max(0, currentImageIndex - 1)); }}
          disabled={animationRunning || totalImages === 0}
        >
          ◀ Prev
        </button>
        <button
          className={`flex-1 py-1.5 text-xs rounded font-semibold transition-colors ${
            animationRunning
              ? 'bg-red-700 hover:bg-red-600 text-white'
              : 'bg-violet-700 hover:bg-violet-600 text-white'
          } disabled:opacity-40`}
          onClick={() => setAnimationRunning(!animationRunning)}
          disabled={totalImages < 2}
        >
          {animationRunning ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          className="flex-1 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-40 transition-colors"
          onClick={() => { setAnimationRunning(false); setCurrentImageIndex(Math.min(totalImages - 1, currentImageIndex + 1)); }}
          disabled={animationRunning || totalImages === 0}
        >
          Next ▶
        </button>
      </div>

      {totalImages > 0 && (
        <p className="text-xs text-center text-slate-500">
          Frame {currentImageIndex + 1} / {totalImages}
        </p>
      )}
    </Section>
  </div>
);

export default SidebarControls;
