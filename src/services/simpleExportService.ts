import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

// Initialize FFmpeg
async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg
  }

  ffmpeg = new FFmpeg()
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

// Simple test export - just copy the video without any captions first
export async function testSimpleExport(
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('Starting simple test export...')
    const ffmpegInstance = await initFFmpeg()
    
    onProgress?.(10)
    
    // Write input video to FFmpeg filesystem
    const videoData = await videoFile.arrayBuffer()
    await ffmpegInstance.writeFile('input.mp4', new Uint8Array(videoData))
    
    onProgress?.(30)
    
    // Simple copy without any filters - just to test FFmpeg works
    const args = [
      '-i', 'input.mp4',
      '-c', 'copy', // Copy without re-encoding
      '-t', '10', // Limit to 10 seconds
      '-y',
      'output.mp4'
    ]
    
    console.log('Test FFmpeg args:', args)
    
    // Add logging
    ffmpegInstance.on('log', ({ type, message }) => {
      console.log(`FFmpeg ${type}:`, message)
    })
    
    onProgress?.(50)
    
    await ffmpegInstance.exec(args)
    
    onProgress?.(80)
    
    // Read output file
    const outputData = await ffmpegInstance.readFile('output.mp4')
    
    if (!outputData || outputData.length === 0) {
      throw new Error('Test export produced empty file')
    }
    
    console.log(`Test output file size: ${outputData.length} bytes`)
    
    const outputBlob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    const outputUrl = URL.createObjectURL(outputBlob)
    
    // Clean up
    try {
      await ffmpegInstance.deleteFile('input.mp4')
      await ffmpegInstance.deleteFile('output.mp4')
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError)
    }
    
    onProgress?.(100)
    console.log('Simple test export completed successfully')
    
    return outputUrl
    
  } catch (error) {
    console.error('Test export failed:', error)
    throw error
  }
}

// Test export with a single simple caption
export async function testCaptionExport(
  videoFile: File,
  testText: string = 'Test Caption',
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('Starting caption test export...')
    const ffmpegInstance = await initFFmpeg()
    
    onProgress?.(10)
    
    // Write input video to FFmpeg filesystem
    const videoData = await videoFile.arrayBuffer()
    await ffmpegInstance.writeFile('input.mp4', new Uint8Array(videoData))
    
    onProgress?.(30)
    
    // Very simple drawtext filter
    const videoFilter = `drawtext=text='${testText}':fontsize=24:fontcolor=white:x=10:y=10`
    
    const args = [
      '-i', 'input.mp4',
      '-vf', videoFilter,
      '-c:a', 'copy',
      '-t', '10', // Limit to 10 seconds
      '-y',
      'output.mp4'
    ]
    
    console.log('Caption test FFmpeg args:', args)
    console.log('Caption test filter:', videoFilter)
    
    // Add logging
    ffmpegInstance.on('log', ({ type, message }) => {
      console.log(`FFmpeg ${type}:`, message)
    })
    
    onProgress?.(50)
    
    await ffmpegInstance.exec(args)
    
    onProgress?.(80)
    
    // Read output file
    const outputData = await ffmpegInstance.readFile('output.mp4')
    
    if (!outputData || outputData.length === 0) {
      throw new Error('Caption test export produced empty file')
    }
    
    console.log(`Caption test output file size: ${outputData.length} bytes`)
    
    const outputBlob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    const outputUrl = URL.createObjectURL(outputBlob)
    
    // Clean up
    try {
      await ffmpegInstance.deleteFile('input.mp4')
      await ffmpegInstance.deleteFile('output.mp4')
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError)
    }
    
    onProgress?.(100)
    console.log('Caption test export completed successfully')
    
    return outputUrl
    
  } catch (error) {
    console.error('Caption test export failed:', error)
    throw error
  }
}
