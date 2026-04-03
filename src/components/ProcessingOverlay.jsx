import React from 'react';

export const ProcessingOverlay = ({ isProcessing, progress = 0, message = 'Processing...' }) => {
  if (!isProcessing) return null;
  return (
    <div className="overlay">
      <div className="overlay-card">
        <div className="overlay-spinner" />
        <p className="overlay-title">{message}</p>
        {progress > 0 && (
          <>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-text">{Math.round(progress)}%</p>
          </>
        )}
      </div>
    </div>
  );
};
