import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import type { KeyPhrase, CaptionStyle } from '@/store/appStore'

let ffmpeg: FFmpeg | null = null

// Initialize FFmpeg
async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg

  ffmpeg = new FFmpeg()
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

// Generate subtitle file (SRT format)
function generateSubtitleFile(phrases: KeyPhrase[]): string {
  const selectedPhrases = phrases.filter(p => p.isSelected)
  
  if (selectedPhrases.length === 0) {
    return ''
  }
  
  let srt = ''
  selectedPhrases.forEach((phrase, index) => {
    const startTime = formatSRTTime(phrase.start)
    const endTime = formatSRTTime(phrase.end)
    
    srt += `${index + 1}\n`
    srt += `${startTime} --> ${endTime}\n`
    srt += `${phrase.text.replace(/\n/g, ' ')}\n\n` // Clean text for SRT format
  })
  
  console.log('Generated SRT content:', srt)
  return srt
}

// Format time for SRT (HH:MM:SS,mmm)
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

// Generate FFmpeg filter for styled captions
function generateCaptionFilter(phrases: KeyPhrase[]): string {
  const selectedPhrases = phrases.filter(p => p.isSelected)
  
  if (selectedPhrases.length === 0) return ''
  
  let filter = '[0:v]'
  
  selectedPhrases.forEach((phrase, index) => {
    const style = phrase.style
    if (!style) return
    
    // Calculate position
    let x = 'w/2' // center by default
    let y = 'h*0.85' // bottom by default
    
    switch (style.position) {
      case 'top':
        y = 'h*0.15'
        break
      case 'center':
        y = 'h/2'
        break
      case 'bottom':
        y = 'h*0.85'
        break
    }
    
    switch (style.textAlign) {
      case 'left':
        x = 'w*0.1'
        break
      case 'right':
        x = 'w*0.9'
        break
      case 'center':
        x = 'w/2'
        break
    }
    
    // Convert color to FFmpeg format
    const color = style.color.replace('#', '0x')
    const bgColor = style.backgroundColor ? style.backgroundColor.replace('#', '0x') : '0x00000000'
    
    // Create text filter
    const textFilter = `drawtext=text='${phrase.text.replace(/'/g, "\\'")}':fontsize=${style.fontSize}:fontcolor=${color}:x=${x}:y=${y}:enable='between(t,${phrase.start},${phrase.end})'`
    
    if (index === 0) {
      filter += textFilter
    } else {
      filter += `,${textFilter}`
    }
    
    if (index < selectedPhrases.length - 1) {
      filter += `[v${index}];[v${index}]`
    }
  })
  
  return filter
}

// Export video with captions
export async function exportVideoWithCaptions(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const ffmpegInstance = await initFFmpeg()
    
    // Write input video to FFmpeg filesystem
    const videoData = await videoFile.arrayBuffer()
    await ffmpegInstance.writeFile('input.mp4', new Uint8Array(videoData))
    
    onProgress?.(20)
    
    // Generate subtitle file (for fallback, but we're using drawtext now)
    const srtContent = generateSubtitleFile(phrases)
    if (srtContent) {
      const srtData = new TextEncoder().encode(srtContent)
      await ffmpegInstance.writeFile('subtitles.srt', srtData)
    }
    
    onProgress?.(40)
    
    // Build FFmpeg command
    const selectedPhrases = phrases.filter(p => p.isSelected)
    
    if (selectedPhrases.length === 0) {
      throw new Error('No captions selected for export')
    }
    
    // Get the args and filter from the helper function
    const { args, videoFilter } = buildFFmpegCommand()
    
    function buildFFmpegCommand() {
      // Try simpler approach first - single drawtext filter for testing
      if (selectedPhrases.length === 1) {
        const phrase = selectedPhrases[0]
        const style = phrase.style || {
          fontSize: 24,
          color: '#ffffff',
          fontFamily: 'Arial',
          position: 'bottom'
        }
        
        // Very simple text sanitization
        const sanitizedText = phrase.text.replace(/'/g, '').replace(/"/g, '').substring(0, 50) // Limit length
        
        // Simple single drawtext filter
        const videoFilter = `drawtext=text='${sanitizedText}':fontsize=24:fontcolor=white:x=(w-tw)/2:y=h-50:enable='between(t,${phrase.start},${phrase.end})'`
        
        console.log('Using simple single filter:', videoFilter)
        
        const args = [
          '-i', 'input.mp4',
          '-vf', videoFilter,
          '-c:a', 'copy',
          '-t', '30', // Limit to 30 seconds for testing
          '-y',
          'output.mp4'
        ]
        
        console.log('Simple FFmpeg args:', args)
        return { args, videoFilter }
      }
      
      // For multiple captions, use more complex approach
      const drawTextFilters: string[] = []
      
      selectedPhrases.forEach((phrase, index) => {
        const style = phrase.style || {
          fontSize: 24,
          color: '#ffffff',
          fontFamily: 'Arial',
          position: 'bottom'
        }
        
        // Sanitize text more aggressively for FFmpeg
        const sanitizedText = phrase.text
          .replace(/['"]/g, '') // Remove quotes entirely
          .replace(/[:\[\]]/g, '') // Remove problematic characters
          .replace(/[^\w\s]/g, '') // Keep only alphanumeric and spaces
          .substring(0, 30) // Limit length
        
        if (!sanitizedText.trim()) {
          console.warn('Skipping empty phrase after sanitization:', phrase.text)
          return
        }
        
        // Simple drawtext filter
        const drawTextFilter = `drawtext=text='${sanitizedText}':fontsize=${style.fontSize}:fontcolor=white:x=(w-tw)/2:y=h-60:enable='between(t,${phrase.start},${phrase.end})'`
        
        drawTextFilters.push(drawTextFilter)
      })
      
      if (drawTextFilters.length === 0) {
        throw new Error('No valid captions to render after text sanitization')
      }
      
      // Combine all filters with comma separation
      const videoFilter = drawTextFilters.join(',')
      
      const args = [
        '-i', 'input.mp4',
        '-vf', videoFilter,
        '-c:a', 'copy',
        '-t', '30', // Limit to 30 seconds for testing
        '-y',
        'output.mp4'
      ]
      
      return { args, videoFilter }
    }
    
    console.log('FFmpeg args:', args)
    console.log('Video filter:', videoFilter)
    
    onProgress?.(60)
    
    // Execute FFmpeg command with error handling
    try {
      console.log('Starting FFmpeg execution...')
      
      // Add progress and log listeners
      ffmpegInstance.on('progress', ({ progress, time }) => {
        console.log(`FFmpeg progress: ${(progress * 100).toFixed(1)}% (time: ${time}s)`)
        const adjustedProgress = 60 + (progress * 20) // Map to 60-80% range
        onProgress?.(adjustedProgress)
      })
      
      ffmpegInstance.on('log', ({ type, message }) => {
        if (type === 'fferr') {
          console.error('FFmpeg error:', message)
        } else {
          console.log('FFmpeg log:', message)
        }
      })
      
      await ffmpegInstance.exec(args)
      console.log('FFmpeg execution completed successfully')
    } catch (ffmpegError) {
      console.error('FFmpeg execution failed:', ffmpegError)
      
      // Try to get more detailed error information
      try {
        const logData = await ffmpegInstance.readFile('ffmpeg2pass-0.log').catch(() => null)
        if (logData && typeof logData !== 'string') {
          console.log('FFmpeg log file:', new TextDecoder().decode(logData as Uint8Array))
        }
      } catch {
        // Ignore log file errors
      }
      
      throw new Error(`Video processing failed: ${ffmpegError instanceof Error ? ffmpegError.message : 'Unknown FFmpeg error'}`)
    }
    
    onProgress?.(80)
    
    // Read output file
    console.log('Reading output file...')
    const outputData = await ffmpegInstance.readFile('output.mp4')
    
    if (!outputData || outputData.length === 0) {
      throw new Error('FFmpeg produced an empty output file')
    }
    
    console.log(`Output file size: ${outputData.length} bytes`)
    const outputBlob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    const outputUrl = URL.createObjectURL(outputBlob)
    console.log('Video export completed successfully')
    
    onProgress?.(100)
    
    // Clean up
    try {
      await ffmpegInstance.deleteFile('input.mp4')
      if (srtContent) {
        await ffmpegInstance.deleteFile('subtitles.srt')
      }
      await ffmpegInstance.deleteFile('output.mp4')
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError)
      // Don't throw, export was successful
    }
    
    return outputUrl
    
  } catch (error) {
    console.error('Video export failed:', error)
    throw error
  }
}

// Alternative: Canvas-based approach for more control over styling
export async function exportVideoWithCanvasCaptions(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Cannot create canvas context'))
      return
    }
    
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const mediaRecorder = new MediaRecorder(canvas.captureStream(), {
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
        resolve(url)
      }
      
      mediaRecorder.start()
      
      const drawFrame = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Draw captions for current time
        const currentTime = video.currentTime
        const activePhrases = phrases.filter(p => 
          p.isSelected && currentTime >= p.start && currentTime <= p.end
        )
        
        activePhrases.forEach(phrase => {
          if (!phrase.style) return
          
          const style = phrase.style
          
          // Set text style
          ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
          ctx.fillStyle = style.color
          ctx.textAlign = style.textAlign as CanvasTextAlign
          
          // Calculate position
          let x = canvas.width / 2
          let y = canvas.height * 0.85
          
          switch (style.position) {
            case 'top':
              y = canvas.height * 0.15
              break
            case 'center':
              y = canvas.height / 2
              break
            case 'bottom':
              y = canvas.height * 0.85
              break
          }
          
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
          
          // Draw background if specified
          if (style.backgroundColor) {
            const metrics = ctx.measureText(phrase.text)
            const padding = 10
            ctx.fillStyle = style.backgroundColor
            ctx.fillRect(
              x - metrics.width / 2 - padding,
              y - style.fontSize - padding,
              metrics.width + padding * 2,
              style.fontSize + padding * 2
            )
          }
          
          // Draw text
          ctx.fillStyle = style.color
          ctx.fillText(phrase.text, x, y)
        })
        
        if (!video.ended) {
          requestAnimationFrame(drawFrame)
        } else {
          mediaRecorder.stop()
        }
      }
      
      video.play()
      drawFrame()
    }
    
    video.onerror = () => {
      reject(new Error('Failed to load video'))
    }
    
    video.src = URL.createObjectURL(videoFile)
  })
}
