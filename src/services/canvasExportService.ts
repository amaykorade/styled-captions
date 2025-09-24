import type { KeyPhrase } from '@/store/appStore'

// Canvas-based video export with captions (fallback when FFmpeg fails)
export async function exportVideoWithCanvas(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas 2D context not supported'))
      return
    }

    const selectedPhrases = phrases.filter(p => p.isSelected)

    if (selectedPhrases.length === 0) {
      reject(new Error('No captions selected for export'))
      return
    }

    video.onloadedmetadata = () => {
      try {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        console.log(`Video dimensions: ${canvas.width}x${canvas.height}`)

        // Set up MediaRecorder
        const stream = canvas.captureStream(30) // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9'
        })

        const chunks: Blob[] = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' })
          const url = URL.createObjectURL(blob)
          onProgress?.(100)
          resolve(url)
        }

        mediaRecorder.onerror = (error) => {
          console.error('MediaRecorder error:', error)
          reject(new Error('Failed to record video'))
        }

        // Start recording
        mediaRecorder.start(100) // Collect data every 100ms

        let frameCount = 0
        const fps = 30
        const totalFrames = Math.ceil(video.duration * fps)

        console.log(`Starting canvas export: ${video.duration}s video, ${totalFrames} frames expected`)

        const drawFrame = () => {
          if (video.ended || video.paused) {
            console.log('Video ended, stopping recording')
            mediaRecorder.stop()
            return
          }

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Draw captions for current time
          const currentTime = video.currentTime
          const activePhrases = selectedPhrases.filter(p => 
            currentTime >= p.start && currentTime <= p.end
          )

          if (activePhrases.length > 0) {
            console.log(`Frame ${frameCount}: ${activePhrases.length} active captions at ${currentTime.toFixed(2)}s`)
          }

          activePhrases.forEach(phrase => {
            if (!phrase.style) return

            const style = phrase.style

            // Set text style
            ctx.font = `${style.fontWeight || 'bold'} ${style.fontSize}px ${style.fontFamily || 'Arial'}`
            ctx.fillStyle = style.color
            ctx.textAlign = style.textAlign as CanvasTextAlign || 'center'
            ctx.textBaseline = 'middle'

            // Calculate position
            let x = canvas.width / 2
            let y = canvas.height * 0.9 // Default to bottom

            switch (style.textAlign) {
              case 'left':
                x = canvas.width * 0.1
                break
              case 'right':
                x = canvas.width * 0.9
                break
              case 'center':
                x = canvas.width / 2
                break
            }

            switch (style.position) {
              case 'top':
                y = canvas.height * 0.15
                break
              case 'center':
                y = canvas.height / 2
                break
              case 'bottom':
                y = canvas.height * 0.9
                break
            }

            // Draw background if specified
            if (style.backgroundColor) {
              const metrics = ctx.measureText(phrase.text)
              const padding = 10
              const bgWidth = metrics.width + padding * 2
              const bgHeight = style.fontSize + padding * 2

              ctx.fillStyle = style.backgroundColor
              ctx.fillRect(
                x - bgWidth / 2,
                y - bgHeight / 2,
                bgWidth,
                bgHeight
              )
            }

            // Draw text with outline for better visibility
            ctx.strokeStyle = 'black'
            ctx.lineWidth = 3
            ctx.strokeText(phrase.text, x, y)

            // Draw main text
            ctx.fillStyle = style.color
            ctx.fillText(phrase.text, x, y)
          })

          // Update progress
          frameCount++
          const progress = Math.min((frameCount / totalFrames) * 90, 90) // Reserve 10% for final processing
          onProgress?.(progress)

          // Continue to next frame
          requestAnimationFrame(drawFrame)
        }

        // Start playback and drawing
        video.currentTime = 0
        video.play().then(() => {
          onProgress?.(10)
          drawFrame()
        }).catch(error => {
          reject(new Error(`Failed to play video: ${error.message}`))
        })

      } catch (error) {
        reject(new Error(`Canvas setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    video.onerror = () => {
      reject(new Error('Failed to load video file'))
    }

    video.onended = () => {
      console.log('Video playback ended')
    }

    // Load the video
    video.src = URL.createObjectURL(videoFile)
    video.load()
  })
}

// Check if canvas export is supported
export function isCanvasExportSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return false
    if (!HTMLCanvasElement.prototype.captureStream) return false
    if (!MediaRecorder) return false
    
    // Check for VP9 codec support
    return MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
           MediaRecorder.isTypeSupported('video/webm') ||
           MediaRecorder.isTypeSupported('video/mp4')
           
  } catch {
    return false
  }
}
