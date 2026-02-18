import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { Button } from '../ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  accept?: Record<string, string[]>;
  label?: string;
  /** Use 'dark' when inside a dark modal (e.g. Employee Photo) so preview matches the UI */
  theme?: 'light' | 'dark';
}

export function FileUpload({ 
  onFileSelect, 
  selectedFile, 
  onClear,
  accept = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls']
  },
  label = 'Upload Excel File',
  theme = 'light'
}: FileUploadProps) {
  const isDark = theme === 'dark';
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false
  });

  // Determine file type description based on accept prop
  const getFileTypeDescription = () => {
    const acceptKeys = Object.keys(accept);
    const hasImage = acceptKeys.some(key => key === 'image/*' || key.startsWith('image/'));
    const hasPpt = acceptKeys.some(key => key.includes('presentation') || key.includes('powerpoint'));
    const hasPdf = acceptKeys.some(key => key.includes('pdf'));
    if (hasImage) return 'PNG, JPG, JPEG, GIF';
    if (hasPpt && hasPdf) return 'PowerPoint (.pptx, .ppt) or PDF (.pdf)';
    if (hasPpt) return 'PowerPoint (.pptx, .ppt)';
    if (hasPdf) return 'PDF (.pdf)';
    return 'Excel (.xlsx, .xls)';
  };

  return (
    <div className="space-y-4">
      <label className={`text-sm ${isDark ? 'text-white' : 'text-white'}`}>{label}</label>
      
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${isDragActive 
              ? 'border-pink-500 bg-pink-500/10' 
              : isDark 
                ? 'border-white/20 hover:border-white/40 bg-white/10' 
                : 'border-white/20 hover:border-white/40 bg-white/5'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-white/70' : 'text-gray-400'}`} />
          <p className={isDark ? 'text-white mb-2' : 'text-white mb-2'}>
            {isDragActive ? 'Drop file here' : 'Drag & drop file here, or click to select'}
          </p>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-400'}`}>
            Supports: {getFileTypeDescription()}
          </p>
        </div>
      ) : (
        <div
          className={
            isDark
              ? 'border border-white/20 rounded-lg p-4 bg-[#3d0f1f] flex items-center justify-between gap-3 overflow-hidden'
              : 'border border-white/20 rounded-lg p-4 bg-white/5 flex items-center justify-between gap-3 overflow-hidden'
          }
        >
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            {selectedFile.type.startsWith('image/') ? (
              <div
                className={
                  isDark
                    ? 'relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-white/10 border border-white/20'
                    : 'relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-white/10 border border-white/20'
                }
              >
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                />
              </div>
            ) : (
              <File className="w-8 h-8 text-pink-500 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1 overflow-hidden w-0">
              <p
                className="text-white text-sm"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-all',
                }}
              >
                {selectedFile.name}
              </p>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-white/60' : 'text-gray-400'}`}>
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className={isDark ? 'text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0' : 'text-gray-400 hover:text-white flex-shrink-0'}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
