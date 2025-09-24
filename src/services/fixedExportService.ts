import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import type { KeyPhrase } from '@/store/appStore'

let ffmpeg: FFmpeg | null = null

// Initialize FFmpeg with better error handling
async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg
  }

  try {
    ffmpeg = new FFmpeg()
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    
    console.log('Loading FFmpeg.wasm...')
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    console.log('FFmpeg.wasm loaded successfully')
    return ffmpeg
    
  } catch (error) {
    console.error('FFmpeg initialization failed:', error)
    ffmpeg = null
    throw new Error(`FFmpeg initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Fixed export function with proper error handling
export async function exportVideoWithFixedCaptions(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('=== Starting Fixed Video Export ===')
  
  try {
    // Initialize FFmpeg
    onProgress?.(5)
    const ffmpegInstance = await initFFmpeg()
    console.log('FFmpeg initialized')

    // Filter selected phrases
    const selectedPhrases = phrases.filter(p => p.isSelected)
    console.log(`Selected phrases: ${selectedPhrases.length}`)
    
    if (selectedPhrases.length === 0) {
      throw new Error('No captions selected for export')
    }

    // Write input video
    onProgress?.(10)
    console.log('Writing input video to FFmpeg filesystem...')
    const videoData = await videoFile.arrayBuffer()
    await ffmpegInstance.writeFile('input.mp4', new Uint8Array(videoData))
    console.log(`Input video written: ${videoData.byteLength} bytes`)

    onProgress?.(20)

    // Build a single, simple drawtext filter
    console.log('Building caption filters...')
    const filters: string[] = []
    
    selectedPhrases.forEach((phrase, index) => {
      // Clean the text aggressively
      const cleanText = phrase.text
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim()
        .substring(0, 50) // Limit length

      if (!cleanText) {
        console.warn(`Skipping empty phrase: "${phrase.text}"`)
        return
      }

      // Simple filter with minimal options
      const filter = `drawtext=text=${cleanText}:fontsize=32:fontcolor=white:x=(w-tw)/2:y=h-80:enable='between(t,${phrase.start.toFixed(1)},${phrase.end.toFixed(1)})'`
      filters.push(filter)
      
      console.log(`Caption ${index + 1}: "${cleanText}" (${phrase.start.toFixed(1)}s - ${phrase.end.toFixed(1)}s)`)
    })

    if (filters.length === 0) {
      throw new Error('No valid captions after text cleaning')
    }

    // Use a simple filter chain
    const videoFilter = filters.join(',')
    console.log('Final video filter:', videoFilter)

    onProgress?.(40)

    // Build FFmpeg command - keep it simple
    const args = [
      '-i', 'input.mp4',
      '-vf', videoFilter,
      '-c:a', 'copy', // Copy audio without re-encoding
      '-c:v', 'libx264', // Use H.264 for video
      '-preset', 'fast', // Fast encoding
      '-crf', '23', // Good quality
      '-movflags', '+faststart', // Web optimization
      '-y', // Overwrite output
      'output.mp4'
    ]

    console.log('FFmpeg command:', args.join(' '))

    onProgress?.(50)

    // Add logging
    ffmpegInstance.on('log', ({ type, message }) => {
      if (type === 'fferr') {
        console.error('FFmpeg stderr:', message)
      } else {
        console.log('FFmpeg stdout:', message)
      }
    })

    ffmpegInstance.on('progress', ({ progress, time }) => {
      console.log(`FFmpeg progress: ${(progress * 100).toFixed(1)}% (${time.toFixed(1)}s)`)
      const adjustedProgress = 50 + (progress * 30) // 50% to 80%
      onProgress?.(adjustedProgress)
    })

    // Execute FFmpeg
    console.log('Starting FFmpeg execution...')
    await ffmpegInstance.exec(args)
    console.log('FFmpeg execution completed')

    onProgress?.(85)

    // Check if output file exists and has content
    console.log('Reading output file...')
    let outputData
    try {
      outputData = await ffmpegInstance.readFile('output.mp4')
    } catch (readError) {
      console.error('Failed to read output file:', readError)
      throw new Error('Failed to read exported video file')
    }

    if (!outputData || outputData.length === 0) {
      console.error('Output file is empty or missing')
      throw new Error('Export produced an empty file')
    }

    console.log(`Output file size: ${outputData.length} bytes`)

    // Create blob and URL
    const outputBlob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    const outputUrl = URL.createObjectURL(outputBlob)

    onProgress?.(95)

    // Cleanup
    try {
      await ffmpegInstance.deleteFile('input.mp4')
      await ffmpegInstance.deleteFile('output.mp4')
      console.log('Cleanup completed')
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError)
    }

    onProgress?.(100)
    console.log('=== Export completed successfully ===')
    console.log('Output URL:', outputUrl)

    return outputUrl

  } catch (error) {
    console.error('=== Export failed ===')
    console.error('Error details:', error)
    
    if (error instanceof Error) {
      throw new Error(`Export failed: ${error.message}`)
    } else {
      throw new Error('Export failed with unknown error')
    }
  }
}

// Simplified canvas export as fallback
export async function exportVideoWithCanvas(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('=== Starting Canvas Export (Fallback) ===')
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas 2D context not available'))
      return
    }

    const selectedPhrases = phrases.filter(p => p.isSelected)
    
    if (selectedPhrases.length === 0) {
      reject(new Error('No captions selected'))
      return
    }

    video.onloadedmetadata = () => {
      try {
        // Set canvas size to match video
        canvas.width = Math.min(video.videoWidth, 1280) // Limit width
        canvas.height = Math.min(video.videoHeight, 720) // Limit height
        
        console.log(`Canvas size: ${canvas.width}x${canvas.height}`)
        console.log(`Video duration: ${video.duration}s`)

        // Create media recorder
        const stream = canvas.captureStream(30)
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9'
        })

        const chunks: Blob[] = []
        let frameCount = 0
        const totalFrames = Math.ceil(video.duration * 30)

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          console.log('Canvas recording stopped')
          const blob = new Blob(chunks, { type: 'video/webm' })
          const url = URL.createObjectURL(blob)
          resolve(url)
        }

        mediaRecorder.start(100)

        const drawFrame = () => {
          if (video.ended || video.paused) {
            console.log('Video ended, stopping canvas recording')
            mediaRecorder.stop()
            return
          }

          // Clear and draw video frame
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Draw active captions
          const currentTime = video.currentTime
          const activePhrases = selectedPhrases.filter(p => 
            currentTime >= p.start && currentTime <= p.end
          )

          if (activePhrases.length > 0) {
            activePhrases.forEach(phrase => {
              // Simple white text with black outline
              ctx.font = 'bold 24px Arial'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'bottom'
              
              const x = canvas.width / 2
              const y = canvas.height - 40

              // Black outline
              ctx.strokeStyle = 'black'
              ctx.lineWidth = 4
              ctx.strokeText(phrase.text, x, y)

              // White fill
              ctx.fillStyle = 'white'
              ctx.fillText(phrase.text, x, y)
            })
          }

          // Update progress
          frameCount++
          const progress = (frameCount / totalFrames) * 100
          onProgress?.(Math.min(progress, 95))

          requestAnimationFrame(drawFrame)
        }

        // Start video playback
        video.currentTime = 0
        video.play().then(() => {
          console.log('Canvas recording started')
          drawFrame()
        })

      } catch (error) {
        reject(error)
      }
    }

    video.onerror = () => {
      reject(new Error('Failed to load video for canvas export'))
    }

    video.src = URL.createObjectURL(videoFile)
  })
}
