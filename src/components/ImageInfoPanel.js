// src/components/ImageInfoPanel.js
import React from 'react';
import { solarEphemeris } from '../utils/solarCalculations';

const Row = ({ label, value }) => (
  <div className="flex justify-between items-baseline py-1.5 border-b border-slate-700/50 last:border-0">
    <span className="text-xs text-slate-400">{label}</span>
    <span className="text-xs text-slate-200 font-mono ml-4 text-right">{value}</span>
  </div>
);

const ImageInfoPanel = ({
  originalDimensions,
  displayDimensions,
  obsTime,
  sunParams,
  adjustedSunParams,
  imageScale,
  centerXOffset,
  centerYOffset,
  radiusCorrection,
  forceFitsData,
  currentFilename,
}) => {
  const isFits =
    currentFilename &&
    (currentFilename.toLowerCase().endsWith('.fits') ||
      currentFilename.toLowerCase().endsWith('.fit'));

  const paramSource = forceFitsData && isFits ? 'FITS Header' : 'Detection';

  const ephem = obsTime ? solarEphemeris(obsTime) : null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Image Information
      </h3>

      <div className="bg-slate-800/50 rounded-lg px-3 py-1">
        <Row label="File" value={currentFilename || '—'} />
        <Row label="Original size" value={`${originalDimensions.width} × ${originalDimensions.height} px`} />
        <Row label="Display size"  value={`${displayDimensions.width} × ${displayDimensions.height} px`} />
        <Row label="Scale factor"  value={imageScale.toFixed(3) + '×'} />
        {obsTime && (
          <Row label="Observation time" value={obsTime.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'} />
        )}
        <Row label="Sun params from" value={paramSource} />
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 pt-1">
        Sun Disc (original px)
      </h3>
      <div className="bg-slate-800/50 rounded-lg px-3 py-1">
        <Row label="Centre X" value={sunParams.cx.toFixed(1)} />
        <Row label="Centre Y" value={sunParams.cy.toFixed(1)} />
        <Row label="Radius"   value={sunParams.radius.toFixed(1)} />
        <Row label="Radius correction" value={radiusCorrection.toFixed(2) + '×'} />
        <Row label="X offset" value={centerXOffset + ' px'} />
        <Row label="Y offset" value={centerYOffset + ' px'} />
      </div>

      {ephem && (
        <>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 pt-1">
            Solar Ephemeris
          </h3>
          <div className="bg-slate-800/50 rounded-lg px-3 py-1">
            <Row label="B₀ (sub-earth lat)" value={ephem.B0.toFixed(3) + '°'} />
            <Row label="L₀ (Carrington lon)" value={ephem.L0.toFixed(3) + '°'} />
            <Row label="P (north pole angle)" value={ephem.P.toFixed(3) + '°'} />
          </div>
        </>
      )}
    </div>
  );
};

export default ImageInfoPanel;
