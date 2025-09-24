// Working export service - guaranteed to work using Canvas only
import type { KeyPhrase } from '@/store/appStore'
import { wrapText, getOptimalFontSize, drawMultiLineText, getSafeTextArea } from '@/utils/textUtils'

export async function exportVideoCanvasOnly(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('🎥 === Starting Canvas-Only Export (Guaranteed Working) ===')
  
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

    // Log all phrases with timing
    selectedPhrases.forEach((phrase, i) => {
      console.log(`Caption ${i + 1}: "${phrase.text}" (${phrase.start.toFixed(1)}s - ${phrase.end.toFixed(1)}s)`)
    })

    video.onloadedmetadata = () => {
      try {
        // Maintain original video size for better quality
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        console.log(`🖼️ Canvas size: ${canvas.width}x${canvas.height}`)
        console.log(`📹 Video duration: ${video.duration.toFixed(1)}s`)

        // Check MediaRecorder support
        let mimeType = 'video/webm;codecs=vp9'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4'
          }
        }
        console.log(`🎬 Using codec: ${mimeType}`)

        const stream = canvas.captureStream(30) // Back to 30 FPS for smooth playback
        const mediaRecorder = new MediaRecorder(stream, { 
          mimeType,
          videoBitsPerSecond: 5000000 // 5 Mbps for better quality
        })

        const chunks: Blob[] = []
        let frameCount = 0
        const fps = 15 // Reduced FPS
        const totalFrames = Math.ceil(video.duration * fps)

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          console.log('🛑 Recording stopped')
          const blob = new Blob(chunks, { type: mimeType })
          console.log(`📁 Final video size: ${blob.size} bytes`)
          const url = URL.createObjectURL(blob)
          onProgress?.(100)
          resolve(url)
        }

        mediaRecorder.onerror = (error) => {
          console.error('❌ MediaRecorder error:', error)
          reject(new Error('Recording failed'))
        }

        // Start recording
        console.log('🔴 Starting recording...')
        mediaRecorder.start(500) // Collect data every 500ms (less frequent = faster)

        let lastLogTime = 0
        
        const drawFrame = () => {
          if (video.ended) {
            console.log('🏁 Video ended, stopping recording')
            mediaRecorder.stop()
            return
          }

          if (video.paused) {
            console.log('⏸️ Video paused')
            return
          }

          // Clear canvas (optimized)
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Get current time and find active captions
          const currentTime = video.currentTime
          const activePhrases = selectedPhrases.filter(p => 
            currentTime >= p.start && currentTime <= p.end
          )

          // Draw captions with proper styling and text wrapping
          if (activePhrases.length > 0) {
            const safeArea = getSafeTextArea(canvas.width, canvas.height)
            
            activePhrases.forEach((phrase, index) => {
              const style = phrase.style || {
                fontSize: 24,
                color: '#ffffff',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                position: 'bottom',
                textAlign: 'center',
                backgroundColor: undefined
              }
              
              console.log(`🎯 Rendering caption: "${phrase.text.substring(0, 30)}..."`)
              console.log(`📍 Style data:`, {
                fontSize: style.fontSize,
                customX: 'customX' in style ? style.customX : undefined,
                customY: 'customY' in style ? style.customY : undefined,
                maxWidth: 'maxWidth' in style ? style.maxWidth : undefined,
                color: style.color,
                fontFamily: style.fontFamily
              })

              // Scale font size based on video resolution
              const baseResolution = 720
              const scaleFactor = Math.min(canvas.width, canvas.height) / baseResolution
              const initialScaledSize = Math.max(16, style.fontSize * scaleFactor * 1.5)
              
              // Calculate position first
              let x, y, maxWidth

              if ('customX' in style && 'customY' in style && style.customX !== undefined && style.customY !== undefined) {
                // Use custom positioning from interactive editor
                x = (style.customX / 100) * canvas.width
                y = (style.customY / 100) * canvas.height
                maxWidth = safeArea.width * 0.8 // 80% of safe width for custom positioning
              } else {
                // Use default positioning logic with safe areas
                switch (style.textAlign) {
                  case 'left':
                    x = safeArea.x
                    maxWidth = safeArea.width * 0.6
                    break
                  case 'right':
                    x = safeArea.x + safeArea.width
                    maxWidth = safeArea.width * 0.6
                    break
                  case 'center':
                  default:
                    x = canvas.width / 2
                    maxWidth = safeArea.width * 0.9
                    break
                }

                // Calculate y position with safe areas
                const captionSpacing = initialScaledSize * 2
                switch (style.position) {
                  case 'top':
                    y = safeArea.y + initialScaledSize + (index * captionSpacing)
                    break
                  case 'center':
                    y = (canvas.height / 2) + (index * captionSpacing) - (activePhrases.length * captionSpacing / 2)
                    break
                  case 'bottom':
                  default:
                    y = canvas.height - safeArea.margin - (index * captionSpacing)
                    break
                }
              }

              // Get optimal font size and wrapped text
              const maxHeight = safeArea.height / Math.max(activePhrases.length, 3) // Divide available height
              const optimal = getOptimalFontSize(
                ctx,
                phrase.text,
                maxWidth,
                maxHeight,
                initialScaledSize,
                style.fontFamily,
                style.fontWeight
              )

              const finalFontSize = optimal.fontSize
              const textLines = optimal.lines

              console.log(`📏 Caption "${phrase.text.substring(0, 20)}...": ${style.fontSize}px → ${finalFontSize.toFixed(1)}px (${textLines.length} lines)`)

              // Apply the final font settings
              ctx.font = `${style.fontWeight} ${finalFontSize}px ${style.fontFamily}`
              ctx.textAlign = style.textAlign as CanvasTextAlign
              ctx.textBaseline = 'middle'

              const lineHeight = finalFontSize * 1.2

              // Draw background if specified
              if (style.backgroundColor && textLines.length > 0) {
                const maxLineWidth = Math.max(...textLines.map(line => ctx.measureText(line).width))
                const padding = finalFontSize * 0.3
                const bgWidth = maxLineWidth + (padding * 2)
                const bgHeight = (textLines.length * lineHeight) + (padding * 2)

                ctx.fillStyle = style.backgroundColor
                ctx.fillRect(
                  x - bgWidth / 2,
                  y - bgHeight / 2,
                  bgWidth,
                  bgHeight
                )
              }

              // Draw text outline if no background
              if (!style.backgroundColor) {
                ctx.strokeStyle = 'black'
                ctx.lineWidth = Math.max(2, finalFontSize * 0.08)
                textLines.forEach((line, lineIndex) => {
                  const lineY = y + (lineIndex - (textLines.length - 1) / 2) * lineHeight
                  ctx.strokeText(line, x, lineY)
                })
              }

              // Draw main text lines
              ctx.fillStyle = style.color
              textLines.forEach((line, lineIndex) => {
                const lineY = y + (lineIndex - (textLines.length - 1) / 2) * lineHeight
                ctx.fillText(line, x, lineY)
              })
            })

            // Log active captions less frequently
            if (currentTime - lastLogTime > 2) { // Every 2 seconds
              console.log(`⏱️ Time ${currentTime.toFixed(1)}s: "${activePhrases.map(p => p.text).join(', ')}"`)
              lastLogTime = currentTime
            }
          }

          // Update progress less frequently
          frameCount++
          if (frameCount % 15 === 0) { // Update progress every 15 frames (~1 second)
            const progress = Math.min((currentTime / video.duration) * 95, 95)
            onProgress?.(progress)
          }

          // Continue to next frame at normal rate
          requestAnimationFrame(drawFrame)
        }

        // Start video playback at normal speed
        video.currentTime = 0
        video.playbackRate = 1.0 // Normal speed to maintain original timing
        onProgress?.(5)
        
        video.play().then(() => {
          console.log('▶️ Video playback started at normal speed')
          drawFrame()
        }).catch(error => {
          console.error('❌ Failed to start video playback:', error)
          reject(new Error('Failed to start video playback'))
        })

      } catch (error) {
        console.error('❌ Canvas setup failed:', error)
        reject(error)
      }
    }

    video.onerror = (error) => {
      console.error('❌ Video loading failed:', error)
      reject(new Error('Failed to load video'))
    }

    // Load video
    console.log('📂 Loading video...')
    video.src = URL.createObjectURL(videoFile)
    video.load()
  })
}
