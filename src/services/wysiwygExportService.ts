// WYSIWYG Export Service - What You See Is What You Get
import type { KeyPhrase } from '@/store/appStore'

export async function exportVideoWYSIWYG(
  videoFile: File,
  phrases: KeyPhrase[],
  previewCanvasSize: { width: number; height: number },
  onProgress?: (progress: number) => void,
  opts?: {
    previewRenderedVideoWidth?: number
    previewRenderedVideoHeight?: number
  }
): Promise<string> {
  console.log('🎯 === Starting WYSIWYG Export (Exact Preview Match) ===')
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas not supported'))
      return
    }

    const selectedPhrases = phrases.filter(p => p.isSelected)
    console.log(`📝 WYSIWYG Export - Processing ${selectedPhrases.length} selected phrases:`)
    selectedPhrases.forEach((phrase, i) => {
      console.log(`  ${i + 1}. "${phrase.text.substring(0, 30)}..." - Font: ${phrase.style?.fontSize}px, Pos: (${phrase.style?.customX?.toFixed(1)}%, ${phrase.style?.customY?.toFixed(1)}%), Width: ${phrase.style?.maxWidth?.toFixed(1)}%`)
    })

    if (selectedPhrases.length === 0) {
      reject(new Error('No captions selected'))
      return
    }

    video.onloadedmetadata = () => {
      try {
        // Use original video resolution for high quality export
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        console.log(`🎯 High Quality Export: ${canvas.width}x${canvas.height} (original video resolution)`) 
        console.log(`📐 Preview was: ${previewCanvasSize.width}x${previewCanvasSize.height}`)
        
        // Calculate scaling factors from preview VIDEO BOX to high-res export
        const basePreviewW = opts?.previewRenderedVideoWidth || previewCanvasSize.width
        const basePreviewH = opts?.previewRenderedVideoHeight || previewCanvasSize.height
        const scaleX = canvas.width / basePreviewW
        const scaleY = canvas.height / basePreviewH
        console.log(`📏 Quality scaling: X=${scaleX.toFixed(2)}x, Y=${scaleY.toFixed(2)}x`)
        console.log(`📹 Video duration: ${video.duration.toFixed(1)}s`)

        // Prepare streams: canvas (video) + media element audio (WebAudio)
        const canvasStream = canvas.captureStream(30)

        // Create AudioContext after user gesture
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
        const audioCtx = new AudioCtx()
        const source = audioCtx.createMediaElementSource(video)
        const dest = audioCtx.createMediaStreamDestination()
        
        // Route audio to recorder (dest). Optionally also to local output
        source.connect(dest)
        source.connect(audioCtx.destination)

        // Mixed stream (video from canvas + audio from MediaElement)
        const mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ])

        // Pick an audio-capable mime type
        let mimeType = 'video/webm;codecs=vp9,opus'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8,opus'
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm'
        }
        // Safari prefers 'video/mp4' is NOT supported by MediaRecorder; keep WebM for cross-browser downloads
        console.log(`🎬 Using codec: ${mimeType}`)

        const mediaRecorder = new MediaRecorder(mixedStream, { 
          mimeType,
          videoBitsPerSecond: 15000000
        })

        const chunks: Blob[] = []
        let lastLogTime = 0

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          console.log('🛑 WYSIWYG recording stopped')
          const blob = new Blob(chunks, { type: mimeType })
          console.log(`📁 WYSIWYG export final size: ${blob.size} bytes`)
          const url = URL.createObjectURL(blob)
          onProgress?.(100)
          resolve(url)
        }

        mediaRecorder.onerror = (error) => {
          console.error('❌ WYSIWYG MediaRecorder error:', (error as any).error || error)
          reject(new Error('WYSIWYG recording failed'))
        }

        // Frame render loop
        const drawFrame = () => {
          if (video.ended) {
            console.log('🏁 WYSIWYG video ended, stopping recording')
            // Stop a tick later to flush last chunk
            setTimeout(() => mediaRecorder.stop(), 150)
            return
          }

          if (!video.paused) {
            // Clear and draw base video
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Time-based caption rendering
            const currentTime = video.currentTime
            const activePhrases = selectedPhrases.filter(p => currentTime >= p.start && currentTime <= p.end)

            if (activePhrases.length > 0) {
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
                const ext = phrase.style as any

                // Scale font using vertical scale to keep perceived size
                const baseFontSize = style.fontSize || 24
                const fontSize = baseFontSize * scaleY
                ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`
                ctx.textAlign = style.textAlign as CanvasTextAlign
                ctx.textBaseline = 'middle'
                if (ext?.letterSpacing) {
                  // Canvas does not support letterSpacing natively; approximate by manual drawing per letter if needed later
                }

                // Position
                let x: number, y: number
                if ('customX' in style && 'customY' in style && style.customX !== undefined && style.customY !== undefined) {
                  x = (style.customX / 100) * canvas.width
                  y = (style.customY / 100) * canvas.height
                } else {
                  x = canvas.width / 2
                  const baseSpacing = 60 * scaleY
                  const lineSpacing = (baseFontSize + 20) * scaleY
                  switch (style.position) {
                    case 'top':
                      y = baseSpacing + (index * lineSpacing)
                      break
                    case 'center':
                      y = (canvas.height / 2) + (index * lineSpacing) - (activePhrases.length * lineSpacing / 2)
                      break
                    case 'bottom':
                    default:
                      y = canvas.height - baseSpacing - (index * lineSpacing)
                      break
                  }
                }

                // Wrap text using same measurement as editor (Width relative to video frame)
                const maxWidthPercent = ('maxWidth' in style && style.maxWidth) ? style.maxWidth : 80
                const maxWidthPx = (maxWidthPercent / 100) * canvas.width

                const words = phrase.text.split(' ')
                const wrappedLines: string[] = []
                let currentLine = ''
                for (const word of words) {
                  const testLine = currentLine === '' ? word : `${currentLine} ${word}`
                  const testWidth = ctx.measureText(testLine).width
                  if (testWidth <= maxWidthPx) {
                    currentLine = testLine
                  } else {
                    if (currentLine !== '') wrappedLines.push(currentLine)
                    currentLine = word
                  }
                }
                if (currentLine !== '') wrappedLines.push(currentLine)

                // Background (optional)
                const lineHeight = fontSize * (ext?.lineHeight || 1.2)
                const totalHeight = wrappedLines.length * lineHeight
                if (style.backgroundColor) {
                  ctx.fillStyle = style.backgroundColor
                  ctx.fillRect(
                    x - maxWidthPx / 2 - (ext?.backgroundPadding ? ext.backgroundPadding * scaleX : 12 * scaleX),
                    y - totalHeight / 2 - (ext?.backgroundPadding ? ext.backgroundPadding * scaleY : 12 * scaleY),
                    maxWidthPx + (ext?.backgroundPadding ? ext.backgroundPadding * 2 * scaleX : 24),
                    totalHeight + (ext?.backgroundPadding ? ext.backgroundPadding * 2 * scaleY : 24)
                  )
                }

                // Shadow
                if (!style.backgroundColor) {
                  ctx.shadowColor = ext?.shadowColor || 'rgba(0, 0, 0, 0.8)'
                  ctx.shadowOffsetX = (ext?.shadowOffsetX ?? 2) * scaleX
                  ctx.shadowOffsetY = (ext?.shadowOffsetY ?? 2) * scaleY
                  ctx.shadowBlur = (ext?.shadowBlur ?? 4) * Math.max(scaleX, scaleY)
                } else {
                  ctx.shadowColor = 'transparent'
                }

                // Text
                ctx.fillStyle = style.color
                ctx.globalAlpha = ext?.opacity ?? 1
                wrappedLines.forEach((line, i) => {
                  const lineY = y - totalHeight / 2 + (i + 0.5) * lineHeight
                  if (ext?.outlineColor && ext?.outlineWidth) {
                    ctx.strokeStyle = ext.outlineColor
                    ctx.lineWidth = (ext.outlineWidth || 0) * Math.max(scaleX, scaleY)
                    ctx.strokeText(line, x, lineY)
                  }
                  ctx.fillText(line, x, lineY)
                })
                ctx.shadowColor = 'transparent'
                ctx.globalAlpha = 1
              })

              if (currentTime - lastLogTime > 2) {
                onProgress?.(Math.min((currentTime / video.duration) * 95, 95))
                lastLogTime = currentTime
              }
            }
          }

          // Use rAF to advance frames
          requestAnimationFrame(drawFrame)
        }

        // Recorder: start with timeslice to flush audio regularly
        console.log('🔴 Starting WYSIWYG recording with audio...')
        mediaRecorder.start(1000)

        // Video playback settings
        video.currentTime = 0
        video.playbackRate = 1.0
        video.playsInline = true
        video.muted = false // We need audio in output; AudioContext handles policy

        // Start after user gesture
        onProgress?.(5)
        video.play().then(() => {
          console.log('▶️ WYSIWYG video playback started')
          drawFrame()
        }).catch(error => {
          console.error('❌ Failed to start WYSIWYG playback:', error)
          reject(new Error('Failed to start video playback'))
        })

        // Also stop recorder explicitly when the media ends
        video.onended = () => {
          console.log('🏁 Video ended (event), stopping recorder')
          if (mediaRecorder.state === 'recording') {
            setTimeout(() => mediaRecorder.stop(), 150)
          }
        }

      } catch (error) {
        console.error('❌ WYSIWYG setup failed:', error)
        reject(error)
      }
    }

    video.onerror = (error) => {
      console.error('❌ WYSIWYG video loading failed:', error)
      reject(new Error('Failed to load video'))
    }

    // Load video
    console.log('📂 Loading video for WYSIWYG export...')
    video.src = URL.createObjectURL(videoFile)
    video.load()
  })
}

// Get the current preview canvas dimensions
export function getPreviewCanvasDimensions(videoElement: HTMLVideoElement): { width: number; height: number } {
  // Calculate the same dimensions as used in the interactive preview
  const maxWidth = 640 // Same as preview max width
  const maxHeight = 360 // Same as preview max height
  
  const scale = Math.min(maxWidth / videoElement.videoWidth, maxHeight / videoElement.videoHeight)
  
  return {
    width: Math.floor(videoElement.videoWidth * scale),
    height: Math.floor(videoElement.videoHeight * scale)
  }
}
