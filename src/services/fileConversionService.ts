import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { checkFFmpegSupport, getBrowserInfo } from '@/utils/browserCheck'

let ffmpeg: FFmpeg | null = null

// Initialize FFmpeg for file conversion
async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg
  }

  try {
    // Check browser compatibility
    const browserSupport = checkFFmpegSupport()
    if (!browserSupport.supported) {
      const browser = getBrowserInfo()
      console.error(`FFmpeg not supported in ${browser}:`, browserSupport.reason)
      
      let errorMessage = `Video conversion is not supported in ${browser}: ${browserSupport.reason}`
      if (browserSupport.suggestions) {
        errorMessage += '\n\nSuggestions:\n' + browserSupport.suggestions.map(s => `• ${s}`).join('\n')
      }
      
      throw new Error(errorMessage)
    }

    ffmpeg = new FFmpeg()
    
    // Add logging for debugging
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg:', message)
    })
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    
    console.log('Loading FFmpeg.wasm...')
    
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript')
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    
    await ffmpeg.load({
      coreURL,
      wasmURL,
    })

    console.log('FFmpeg.wasm loaded successfully')
    return ffmpeg
    
  } catch (error) {
    console.error('FFmpeg initialization failed:', error)
    ffmpeg = null
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('SharedArrayBuffer')) {
        throw new Error('Video conversion requires SharedArrayBuffer support. Please use Chrome or Firefox with HTTPS.')
      } else if (error.message.includes('fetch')) {
        throw new Error('Failed to load FFmpeg.wasm. Please check your internet connection.')
      } else {
        throw new Error(`FFmpeg initialization failed: ${error.message}`)
      }
    }
    
    throw new Error('Video conversion is not available in this browser.')
  }
}

// Convert video file to MP4 format for OpenAI Whisper compatibility
export async function convertToWhisperCompatible(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  const whisperSupportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
  
  // If already supported, return as-is
  if (whisperSupportedFormats.includes(fileExtension || '')) {
    return file
  }

  let ffmpegInstance: FFmpeg | null = null

  try {
    onProgress?.(5)
    console.log(`Starting conversion of ${fileExtension} file...`)
    
    // Initialize FFmpeg with better error handling
    try {
      ffmpegInstance = await initFFmpeg()
      console.log('FFmpeg initialized successfully')
    } catch (initError) {
      console.error('FFmpeg initialization failed:', initError)
      throw new Error('Video conversion is not available in this browser. Please convert your file to MP4 manually or use a different browser.')
    }
    
    onProgress?.(15)
    
    // Write input file to FFmpeg filesystem
    const inputData = await file.arrayBuffer()
    const inputFileName = `input.${fileExtension}`
    const outputFileName = 'output.mp4'
    
    console.log(`Writing ${inputFileName} to FFmpeg filesystem...`)
    await ffmpegInstance.writeFile(inputFileName, new Uint8Array(inputData))
    
    onProgress?.(30)
    
    // Use simpler conversion arguments for better compatibility
    const args = [
      '-i', inputFileName,
      '-c:v', 'copy', // Try to copy video codec first (faster)
      '-c:a', 'aac',
      '-movflags', 'frag_keyframe+empty_moov', // Better web compatibility
      '-y', // Overwrite output file
      outputFileName
    ]
    
    console.log('Starting FFmpeg conversion with args:', args)
    
    // Set up progress logging
    ffmpegInstance.on('log', ({ message }) => {
      console.log('FFmpeg log:', message)
    })
    
    ffmpegInstance.on('progress', ({ progress }) => {
      const conversionProgress = 30 + (progress * 0.5) // 30% to 80%
      onProgress?.(Math.min(conversionProgress, 80))
    })
    
    await ffmpegInstance.exec(args)
    
    onProgress?.(85)
    console.log('FFmpeg conversion completed')
    
    // Read converted file
    const outputData = await ffmpegInstance.readFile(outputFileName)
    if (!outputData || outputData.length === 0) {
      throw new Error('Conversion produced empty file')
    }
    
    const convertedBlob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    
    // Create new File object with MP4 extension
    const originalName = file.name.substring(0, file.name.lastIndexOf('.'))
    const convertedFile = new File([convertedBlob], `${originalName}.mp4`, {
      type: 'video/mp4',
      lastModified: Date.now()
    })
    
    console.log(`Conversion successful: ${convertedFile.size} bytes`)
    onProgress?.(95)
    
    // Clean up
    try {
      await ffmpegInstance.deleteFile(inputFileName)
      await ffmpegInstance.deleteFile(outputFileName)
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError)
      // Don't throw, conversion was successful
    }
    
    onProgress?.(100)
    return convertedFile
    
  } catch (error) {
    console.error('File conversion failed:', error)
    
    // Clean up on error
    if (ffmpegInstance) {
      try {
        await ffmpegInstance.deleteFile('input.' + fileExtension)
        await ffmpegInstance.deleteFile('output.mp4')
      } catch {
        // Ignore cleanup errors
      }
    }
    
    // Provide more helpful error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('SharedArrayBuffer')) {
      throw new Error(`Video conversion requires SharedArrayBuffer support. Please try uploading an MP4 file instead, or enable SharedArrayBuffer in your browser.`)
    } else if (errorMessage.includes('not available')) {
      throw new Error(`Video conversion is not available in this browser. Please convert your ${fileExtension?.toUpperCase()} file to MP4 manually.`)
    } else {
      throw new Error(`Failed to convert ${fileExtension?.toUpperCase()} file: ${errorMessage}. Please try uploading an MP4 file instead.`)
    }
  }
}

// Check if file needs conversion
export function needsConversion(file: File): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  const whisperSupportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
  
  return !whisperSupportedFormats.includes(fileExtension || '')
}

// Get human-readable file format name
export function getFormatName(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const formatNames: { [key: string]: string } = {
    'mov': 'QuickTime Video',
    'avi': 'AVI Video',
    'mkv': 'Matroska Video',
    'mp4': 'MP4 Video',
    'webm': 'WebM Video',
    'mpeg': 'MPEG Video',
    'mp3': 'MP3 Audio',
    'wav': 'WAV Audio',
    'm4a': 'M4A Audio',
    'ogg': 'OGG Audio',
    'flac': 'FLAC Audio'
  }
  
  return formatNames[extension || ''] || extension?.toUpperCase() || 'Unknown'
}

// Transcode a source Blob (e.g., recorded WebM) to the desired container/codec
export async function transcodeBlobToFormat(
  inputBlob: Blob,
  target: 'mp4' | 'mov',
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; mime: string; fileName: string }> {
  let ffmpegInstance: FFmpeg | null = null

  try {
    onProgress?.(5)
    try {
      ffmpegInstance = await initFFmpeg()
    } catch (e) {
      throw new Error('FFmpeg not available in this browser to transcode. Try a different browser or use the WebM file.')
    }

    onProgress?.(15)
    const inputData = new Uint8Array(await inputBlob.arrayBuffer())
    const inputName = 'input.webm'
    const outputName = target === 'mp4' ? 'output.mp4' : 'output.mov'
    const mime = target === 'mp4' ? 'video/mp4' : 'video/quicktime'

    await ffmpegInstance.writeFile(inputName, inputData)
    onProgress?.(30)

    // Conservative, broadly compatible encodes
    const argsBase = [
      '-i', inputName,
      '-r', '30',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-shortest'
    ]
    const args = target === 'mp4'
      ? [...argsBase, '-movflags', '+faststart', '-y', outputName]
      : [...argsBase, '-f', 'mov', '-y', outputName]

    ffmpegInstance.on('progress', ({ progress }) => {
      // map 30..95
      const p = 30 + Math.min(65, Math.max(0, progress * 65))
      onProgress?.(p)
    })

    try {
      await ffmpegInstance.exec(args)
    } catch (e) {
      // Retry without audio track (some inputs lack audio and AAC encode can fail)
      const retryArgs = target === 'mp4'
        ? ['-i', inputName, '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '23', '-an', '-movflags', '+faststart', '-y', outputName]
        : ['-i', inputName, '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '23', '-an', '-f', 'mov', '-y', outputName]
      await ffmpegInstance.exec(retryArgs)
    }
    onProgress?.(96)

    const outputData = await ffmpegInstance.readFile(outputName)
    if (!outputData || (outputData as Uint8Array).length === 0) {
      throw new Error('Transcode produced empty file')
    }
    const outBlob = new Blob([outputData as BlobPart], { type: mime })

    // Cleanup
    try {
      await ffmpegInstance.deleteFile(inputName)
      await ffmpegInstance.deleteFile(outputName)
    } catch {}

    onProgress?.(100)
    return { blob: outBlob, mime, fileName: outputName }
  } catch (err) {
    throw err instanceof Error ? err : new Error('Transcoding failed')
  }
}
