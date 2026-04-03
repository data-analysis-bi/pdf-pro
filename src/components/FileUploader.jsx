import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, X } from 'lucide-react';

export const FileUploader = ({
  files,
  setFiles,
  accept = { 'application/pdf': ['.pdf'] },
  multiple = true,
  maxFiles = 50,
  title = 'Drop PDF files here',
  subtitle = 'or click to browse files',
  showFileList = true,
}) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (multiple) {
        setFiles((prev) => [...prev, ...acceptedFiles].slice(0, maxFiles));
      } else {
        setFiles(acceptedFiles.slice(0, 1));
      }
    },
    [multiple, maxFiles, setFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`upload-zone${isDragActive ? ' drag-active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="upload-icon-wrap">
          <Upload
            size={28}
            color={isDragActive ? '#e53e3e' : '#a0aec0'}
          />
        </div>
        <p className="upload-title">{title}</p>
        <p className="upload-sub">{subtitle}</p>
      </div>

      {showFileList && files.length > 0 && (
        <div className="file-list">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="file-item">
              <FileText size={16} color="#e53e3e" style={{ flexShrink: 0 }} />
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatSize(file.size)}</span>
              <button
                className="file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
