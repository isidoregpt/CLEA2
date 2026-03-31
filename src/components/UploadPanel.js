// src/components/UploadPanel.js
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const UploadPanel = ({ onFileUpload }) => {
  const [status, setStatus] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      setStatus(`Loading ${acceptedFiles.length} file(s)…`);
      try {
        await onFileUpload(acceptedFiles);
        setStatus(`${acceptedFiles.length} file(s) loaded.`);
      } catch (e) {
        setStatus(`Error: ${e.message}`);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg':       [],
      'image/png':        [],
      'image/fits':       [],
      'application/fits': [],
      'application/json': [],
      '.fits': [],
      '.fit':  [],
      '.json': [],
    },
    multiple: true,
  });

  return (
    <div className="mt-6">
      <h2 className="font-semibold text-sm uppercase tracking-widest text-slate-400 mb-2">
        Load Images
      </h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-violet-400 bg-violet-950/30'
            : 'border-slate-600 hover:border-slate-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-slate-400 text-sm">
          {isDragActive ? (
            <span className="text-violet-300">Drop files here…</span>
          ) : (
            <>
              <p>Drag & drop or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">JPG · PNG · FITS · JSON</p>
              <p className="text-xs text-slate-500">Pair PNG+JSON for embedded sun parameters</p>
            </>
          )}
        </div>
      </div>

      {status && (
        <p
          className={`mt-2 text-xs rounded px-2 py-1 ${
            status.startsWith('Error')
              ? 'bg-red-900/40 text-red-300'
              : 'bg-slate-700/60 text-slate-300'
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
};

export default UploadPanel;
