'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Video, AlertCircle } from 'lucide-react'

interface VideoUploadProps {
  onVideoSelect: (file: File) => void
}

export default function VideoUpload({ onVideoSelect }: VideoUploadProps) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    
    if (acceptedFiles.length === 0) {
      setError('Please select a valid video file')
      return
    }

    const file = acceptedFiles[0]
    
    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB')
      return
    }

    // Validate duration would go here (we'll add this later)
    onVideoSelect(file)
  }, [onVideoSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.mpeg', '.avi', '.mkv'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac']
    },
    maxFiles: 1,
    multiple: false
  })

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          {isDragActive ? (
            <Upload className="w-12 h-12 text-blue-500" />
          ) : (
            <Video className="w-12 h-12 text-gray-400" />
          )}
          
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? 'Drop your video here' : 'Upload your video'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Drag and drop a video file, or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports MP4, MOV, WebM, MPEG, AVI, MKV, MP3, WAV, M4A, OGG, FLAC (max 100MB, 60 seconds)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
        </div>
      )}
    </div>
  )
}
