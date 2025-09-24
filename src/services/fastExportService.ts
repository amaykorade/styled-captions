// Fast export service - optimized for speed while maintaining quality
import type { KeyPhrase } from '@/store/appStore'

export async function exportVideoFast(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('⚡ === Starting FAST Export (Speed Optimized) ===')
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas not supported'))
      return
    }

    const selectedPhrases = phrases.filter(p => p.isSelected)
    console.log(`📝 Selected phrases: ${selectedPhrases.length}`)

    if (selectedPhrases.length === 0) {
      reject(new Error('No captions selected'))
      return
    }

    video.onloadedmetadata = () => {
      try {
        // Smaller size for faster processing but still good quality
        const targetWidth = 720 // Good balance of quality and speed
        const scale = targetWidth / video.videoWidth
        canvas.width = targetWidth
        canvas.height = Math.floor(video.videoHeight * scale)
        
        console.log(`🖼️ Fast export canvas size: ${canvas.width}x${canvas.height}`)
        console.log(`📹 Video duration: ${video.duration.toFixed(1)}s`)

        // Use WebM for faster encoding
        const mimeType = 'video/webm;codecs=vp8' // VP8 is faster than VP9
        console.log(`🎬 Using fast codec: ${mimeType}`)

        const stream = canvas.captureStream(20) // 20 FPS - good balance
        const mediaRecorder = new MediaRecorder(stream, { 
          mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
          videoBitsPerSecond: 3000000 // 3 Mbps - good quality, fast encoding
        })

        const chunks: Blob[] = []
        let lastProgressUpdate = 0

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          console.log('🛑 Fast recording stopped')
          const blob = new Blob(chunks, { type: 'video/webm' })
          console.log(`📁 Fast export final size: ${blob.size} bytes`)
          const url = URL.createObjectURL(blob)
          onProgress?.(100)
          resolve(url)
        }

        mediaRecorder.onerror = (error) => {
          console.error('❌ Fast MediaRecorder error:', error)
          reject(new Error('Fast recording failed'))
        }

        // Start recording with larger chunks for efficiency
        console.log('🔴 Starting fast recording...')
        mediaRecorder.start(1000) // Collect data every 1 second

        // Pre-calculate all caption styles for efficiency
        const styledPhrases = selectedPhrases.map(phrase => ({
          ...phrase,
          computedStyle: {
            font: `${phrase.style?.fontWeight || 'bold'} ${phrase.style?.fontSize || 24}px ${phrase.style?.fontFamily || 'Arial'}`,
            color: phrase.style?.color || '#ffffff',
            backgroundColor: phrase.style?.backgroundColor,
            textAlign: phrase.style?.textAlign || 'center',
            position: phrase.style?.position || 'bottom'
          }
        }))

        const drawFrame = () => {
          if (video.ended) {
            console.log('🏁 Fast video ended, stopping recording')
            mediaRecorder.stop()
            return
          }

          if (video.paused) {
            return
          }

          // Clear and draw video frame
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Get current time and find active captions
          const currentTime = video.currentTime
          const activePhrases = styledPhrases.filter(p => 
            currentTime >= p.start && currentTime <= p.end
          )

          // Draw captions efficiently
          if (activePhrases.length > 0) {
            activePhrases.forEach((phrase, index) => {
              const style = phrase.computedStyle

              // Scale font size for export resolution
              const originalFontSize = phrase.style?.fontSize || 24
              const baseResolution = 720
              const scaleFactor = Math.min(canvas.width, canvas.height) / baseResolution
              const scaledFontSize = Math.max(16, originalFontSize * scaleFactor * 1.5)
              
              // Apply scaled font
              ctx.font = `${phrase.style?.fontWeight || 'bold'} ${scaledFontSize}px ${phrase.style?.fontFamily || 'Arial'}`
              ctx.textAlign = style.textAlign as CanvasTextAlign
              ctx.textBaseline = 'bottom'
              
              console.log(`📏 Fast export font scaling: ${originalFontSize}px → ${scaledFontSize.toFixed(1)}px`)

              // Calculate position
              let x = canvas.width / 2
              let y = canvas.height - 50

              switch (style.textAlign) {
                case 'left':
                  x = canvas.width * 0.1
                  break
                case 'right':
                  x = canvas.width * 0.9
                  break
              }

              switch (style.position) {
                case 'top':
                  y = 50 + (index * 35)
                  break
                case 'center':
                  y = (canvas.height / 2) + (index * 35) - (activePhrases.length * 17)
                  break
                case 'bottom':
                  y = canvas.height - 50 - (index * 35)
                  break
              }

              // Draw background if specified (scale with font)
              if (style.backgroundColor) {
                const metrics = ctx.measureText(phrase.text)
                const padding = scaledFontSize * 0.3
                ctx.fillStyle = style.backgroundColor
                ctx.fillRect(
                  x - (metrics.width / 2) - padding,
                  y - scaledFontSize - padding,
                  metrics.width + (padding * 2),
                  scaledFontSize + (padding * 2)
                )
              }

              // Draw text outline if no background (scale with font)
              if (!style.backgroundColor) {
                ctx.strokeStyle = 'black'
                ctx.lineWidth = Math.max(2, scaledFontSize * 0.08)
                ctx.strokeText(phrase.text, x, y)
              }

              // Draw main text
              ctx.fillStyle = style.color
              ctx.fillText(phrase.text, x, y)
            })
          }

          // Update progress efficiently
          const now = performance.now()
          if (now - lastProgressUpdate > 1000) { // Update every 1 second
            const progress = Math.min((currentTime / video.duration) * 95, 95)
            onProgress?.(progress)
            lastProgressUpdate = now
          }

          // Continue to next frame
          requestAnimationFrame(drawFrame)
        }

        // Start video playback
        video.currentTime = 0
        video.playbackRate = 1.0 // Normal speed
        onProgress?.(5)
        
        video.play().then(() => {
          console.log('▶️ Fast export video playback started')
          drawFrame()
        }).catch(error => {
          console.error('❌ Failed to start fast export playback:', error)
          reject(new Error('Failed to start video playback'))
        })

      } catch (error) {
        console.error('❌ Fast export setup failed:', error)
        reject(error)
      }
    }

    video.onerror = (error) => {
      console.error('❌ Fast export video loading failed:', error)
      reject(new Error('Failed to load video'))
    }

    // Load video
    console.log('📂 Loading video for fast export...')
    video.src = URL.createObjectURL(videoFile)
    video.load()
  })
}
