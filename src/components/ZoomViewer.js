// src/components/ZoomViewer.js
import React from 'react';

const ZoomViewer = ({ image }) => (
  <div className="rounded-lg overflow-hidden border border-slate-600 bg-slate-900">
    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-3 py-1.5 bg-slate-800 border-b border-slate-700">
      Zoom View
    </div>
    <div className="p-2" style={{ height: 240 }}>
      {image ? (
        <img src={image} alt="Zoomed region" style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }} />
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-xs text-slate-500">No selection</p>
        </div>
      )}
    </div>
  </div>
);

export default ZoomViewer;
