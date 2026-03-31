// src/components/MeasurementsPanel.js
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const MeasurementsPanel = ({ measurements, setMeasurements }) => {
  const [filterLabel, setFilterLabel] = useState('All');

  // Derive unique labels whenever measurements change
  const uniqueLabels = useMemo(
    () => [...new Set(measurements.map((m) => m.label).filter(Boolean))],
    [measurements]
  );

  // Reset filter if the selected label disappears
  useEffect(() => {
    if (filterLabel !== 'All' && !uniqueLabels.includes(filterLabel)) {
      setFilterLabel('All');
    }
  }, [uniqueLabels, filterLabel]);

  const filtered = useMemo(
    () =>
      filterLabel === 'All'
        ? measurements
        : measurements.filter((m) => m.label === filterLabel),
    [measurements, filterLabel]
  );

  // Rotation plot data: only when a single label with ≥ 2 points is selected
  const plotData = useMemo(() => {
    if (filterLabel === 'All' || filtered.length < 2) return null;
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.observationTime) - new Date(b.observationTime)
    );
    const t0 = new Date(sorted[0].observationTime).getTime();
    const hours = sorted.map((m) => (new Date(m.observationTime) - t0) / 3_600_000);
    const lons  = sorted.map((m) => m.helioLongitude);
    const lats  = sorted.map((m) => m.helioLatitude);
    return { hours, lons, lats, label: filterLabel };
  }, [filtered, filterLabel]);

  const deleteOne = (index) => {
    // Find the original index in the full measurements array
    const toDelete = filtered[index];
    setMeasurements((prev) => prev.filter((m) => m !== toDelete));
  };

  const clearAll = () => {
    if (window.confirm('Clear all measurements?')) setMeasurements([]);
  };

  const downloadCSV = () => {
    if (!filtered.length) return;
    const keys = Object.keys(filtered[0]);
    const rows = [keys.join(',')];
    for (const row of filtered) {
      rows.push(
        keys
          .map((k) => {
            const v = row[k];
            return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(',')
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solar_measurements.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Recorded Measurements
        </h3>
        {measurements.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              title="Export CSV"
            >
              ↓ CSV
            </button>
            <button
              onClick={clearAll}
              className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-300 transition-colors"
              title="Clear all measurements"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {measurements.length === 0 ? (
        <p className="text-xs text-slate-500">No measurements recorded yet. Click on the solar image to begin.</p>
      ) : (
        <>
          {/* Filter */}
          {uniqueLabels.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Filter:</label>
              <select
                className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-violet-500"
                value={filterLabel}
                onChange={(e) => setFilterLabel(e.target.value)}
              >
                <option value="All">All labels</option>
                {uniqueLabels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg overflow-hidden border border-slate-700">
            <div className="max-h-52 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-800 text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Image</th>
                    <th className="px-2 py-2 text-left font-medium">Label</th>
                    <th className="px-2 py-2 text-right font-medium">Lon °</th>
                    <th className="px-2 py-2 text-right font-medium">Lat °</th>
                    <th className="px-2 py-2 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <tr
                      key={i}
                      className={`border-t border-slate-700/50 ${
                        i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/30'
                      }`}
                    >
                      <td className="px-2 py-1.5 text-slate-300 truncate max-w-[80px]" title={m.image}>
                        {m.image.length > 12 ? m.image.slice(0, 11) + '…' : m.image}
                      </td>
                      <td className="px-2 py-1.5 text-slate-300">{m.label || '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-slate-200">
                        {m.helioLongitude.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-slate-200">
                        {m.helioLatitude.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => deleteOne(i)}
                          className="text-slate-600 hover:text-red-400 transition-colors leading-none"
                          title="Delete this measurement"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-right">
            {filtered.length} measurement{filtered.length !== 1 ? 's' : ''}
            {filterLabel !== 'All' ? ` for "${filterLabel}"` : ' total'}
          </p>

          {/* Rotation plot */}
          {plotData && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-3 py-1.5 bg-slate-800 border-b border-slate-700">
                Longitude Track — {plotData.label}
              </div>
              <div className="bg-slate-900 p-1">
                <Plot
                  data={[
                    {
                      x: plotData.hours,
                      y: plotData.lons,
                      type: 'scatter',
                      mode: 'lines+markers',
                      name: 'Longitude',
                      marker: { color: '#e879f9', size: 6 },
                      line:   { color: '#e879f9', width: 1.5 },
                    },
                  ]}
                  layout={{
                    paper_bgcolor: 'transparent',
                    plot_bgcolor:  'transparent',
                    font: { color: '#94a3b8', size: 10, family: 'monospace' },
                    xaxis: {
                      title: 'Hours since first obs.',
                      gridcolor: '#334155',
                      zerolinecolor: '#475569',
                    },
                    yaxis: {
                      title: 'Helio Lon (°)',
                      gridcolor: '#334155',
                      zerolinecolor: '#475569',
                    },
                    margin: { l: 50, r: 15, t: 10, b: 45 },
                    height: 220,
                    showlegend: false,
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {filterLabel !== 'All' && filtered.length < 2 && (
            <p className="text-xs text-slate-500 italic">
              Record at least 2 measurements for &ldquo;{filterLabel}&rdquo; to see the rotation plot.
            </p>
          )}
        </>
      )}

      {/* Explainer */}
      <details className="border border-slate-700 rounded-lg">
        <summary className="px-3 py-2 bg-slate-800 cursor-pointer text-xs font-medium text-slate-300 select-none">
          About Solar Differential Rotation
        </summary>
        <div className="px-3 py-2 text-xs text-slate-400 space-y-1.5">
          <p>
            The Sun rotates faster at the equator (~25 days) than near the poles (~36 days).
            Track a sunspot across multiple images to measure this differential rotation.
          </p>
          <p>
            Assign the same <strong className="text-slate-300">label</strong> to measurements of
            the same feature across different images, then use the filter above to see its
            longitude drift over time.
          </p>
          <p className="text-slate-500">
            Longitude values are computed using the Carrington coordinate system with B₀, L₀,
            and P calculated from the observation time of each image.
          </p>
        </div>
      </details>
    </div>
  );
};

export default MeasurementsPanel;
