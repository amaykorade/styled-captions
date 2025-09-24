import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import type { KeyPhrase } from '@/store/appStore'

let ffmpeg: FFmpeg | null = null

// Initialize FFmpeg
async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg
  }

  try {
    ffmpeg = new FFmpeg()
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    
    console.log('🔧 Loading FFmpeg.wasm...')
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    console.log('✅ FFmpeg.wasm loaded successfully')
    return ffmpeg
    
  } catch (error) {
    console.error('❌ FFmpeg initialization failed:', error)
    ffmpeg = null
    throw error
  }
}

// Step 1: Test basic video copy (no filters)
export async function testBasicCopy(
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('🧪 === DIAGNOSTIC STEP 1: Basic Video Copy ===')
  
  try {
    const ffmpegInstance = await initFFmpeg()
    onProgress?.(10)

    // Write input
    console.log('📁 Writing input file...')
    const videoData = await videoFile.arrayBuffer()
    await ffmpegInstance.writeFile('input.mp4', new Uint8Array(videoData))
    console.log(`✅ Input written: ${videoData.byteLength} bytes`)

    onProgress?.(30)

    // Simple copy command
    const args = ['-i', 'input.mp4', '-c', 'copy', '-t', '5', '-y', 'output.mp4']
    console.log('🎬 FFmpeg command:', args.join(' '))

    // Add logging
    ffmpegInstance.on('log', ({ type, message }) => {
      console.log(`FFmpeg ${type}:`, message)
    })

    onProgress?.(50)

    await ffmpegInstance.exec(args)
    console.log('✅ FFmpeg execution completed')

    onProgress?.(80)

    // Check output
    const outputData = await ffmpegInstance.readFile('output.mp4')
    console.log(`📊 Output file size: ${outputData.length} bytes`)

    if (!outputData || outputData.length === 0) {
      throw new Error('Basic copy produced empty file - FFmpeg is broken')
    }

    // Create blob
    const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    const url = URL.createObjectURL(blob)

    // Cleanup
    await ffmpegInstance.deleteFile('input.mp4')
    await ffmpegInstance.deleteFile('output.mp4')

    onProgress?.(100)
    console.log('✅ Step 1 PASSED: Basic copy works')
    return url

  } catch (error) {
    console.error('❌ Step 1 FAILED:', error)
    throw error
  }
}

// Step 2: Test simple drawtext filter
export async function testSimpleDrawtext(
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('🧪 === DIAGNOSTIC STEP 2: Simple Drawtext ===')
  
  try {
    const ffmpegInstance = await initFFmpeg()
    onProgress?.(10)

    // Write input
    console.log('📁 Writing input file...')
    const videoData = await videoFile.arrayBuffer()
    await ffmpegInstance.writeFile('input.mp4', new Uint8Array(videoData))

    onProgress?.(30)

    // Very simple drawtext - no special characters, no timing
    const args = [
      '-i', 'input.mp4',
      '-vf', 'drawtext=text=TEST:fontsize=24:fontcolor=white:x=10:y=10',
      '-c:a', 'copy',
      '-t', '5',
      '-y', 'output.mp4'
    ]
    console.log('🎬 FFmpeg command:', args.join(' '))

    // Add logging
    ffmpegInstance.on('log', ({ type, message }) => {
      console.log(`FFmpeg ${type}:`, message)
    })

    onProgress?.(50)

    await ffmpegInstance.exec(args)
    console.log('✅ FFmpeg execution completed')

    onProgress?.(80)

    // Check output
    const outputData = await ffmpegInstance.readFile('output.mp4')
    console.log(`📊 Output file size: ${outputData.length} bytes`)

    if (!outputData || outputData.length === 0) {
      throw new Error('Simple drawtext produced empty file - drawtext filter is broken')
    }

    // Create blob
    const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    const url = URL.createObjectURL(blob)

    // Cleanup
    await ffmpegInstance.deleteFile('input.mp4')
    await ffmpegInstance.deleteFile('output.mp4')

    onProgress?.(100)
    console.log('✅ Step 2 PASSED: Simple drawtext works')
    return url

  } catch (error) {
    console.error('❌ Step 2 FAILED:', error)
    throw error
  }
}

// Step 3: Test drawtext with timing
export async function testTimedDrawtext(
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('🧪 === DIAGNOSTIC STEP 3: Timed Drawtext ===')
  
  try {
    const ffmpegInstance = await initFFmpeg()
    onProgress?.(10)

    // Write input
    console.log('📁 Writing input file...')
    const videoData = await videoFile.arrayBuffer()
    await ffmpegInstance.writeFile('input.mp4', new Uint8Array(videoData))

    onProgress?.(30)

    // Drawtext with timing - this is where it might break
    const args = [
      '-i', 'input.mp4',
      '-vf', 'drawtext=text=TIMED:fontsize=24:fontcolor=white:x=10:y=10:enable=between(t\\,1\\,3)',
      '-c:a', 'copy',
      '-t', '5',
      '-y', 'output.mp4'
    ]
    console.log('🎬 FFmpeg command:', args.join(' '))

    // Add logging
    ffmpegInstance.on('log', ({ type, message }) => {
      console.log(`FFmpeg ${type}:`, message)
    })

    onProgress?.(50)

    await ffmpegInstance.exec(args)
    console.log('✅ FFmpeg execution completed')

    onProgress?.(80)

    // Check output
    const outputData = await ffmpegInstance.readFile('output.mp4')
    console.log(`📊 Output file size: ${outputData.length} bytes`)

    if (!outputData || outputData.length === 0) {
      throw new Error('Timed drawtext produced empty file - timing syntax is broken')
    }

    // Create blob
    const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    const url = URL.createObjectURL(blob)

    // Cleanup
    await ffmpegInstance.deleteFile('input.mp4')
    await ffmpegInstance.deleteFile('output.mp4')

    onProgress?.(100)
    console.log('✅ Step 3 PASSED: Timed drawtext works')
    return url

  } catch (error) {
    console.error('❌ Step 3 FAILED:', error)
    throw error
  }
}

// Step 4: Test with actual captions (simplified)
export async function testActualCaptions(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('🧪 === DIAGNOSTIC STEP 4: Actual Captions ===')
  
  try {
    const ffmpegInstance = await initFFmpeg()
    onProgress?.(10)

    const selectedPhrases = phrases.filter(p => p.isSelected)
    if (selectedPhrases.length === 0) {
      throw new Error('No captions selected')
    }

    console.log(`📝 Processing ${selectedPhrases.length} captions`)

    // Write input
    const videoData = await videoFile.arrayBuffer()
    await ffmpegInstance.writeFile('input.mp4', new Uint8Array(videoData))

    onProgress?.(30)

    // Take only the first caption to test
    const firstPhrase = selectedPhrases[0]
    const cleanText = firstPhrase.text
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 20)

    if (!cleanText) {
      throw new Error('Caption text became empty after cleaning')
    }

    console.log(`🎯 Testing with caption: "${cleanText}" (${firstPhrase.start}s - ${firstPhrase.end}s)`)

    // Use the simplest possible timing syntax
    const filter = `drawtext=text=${cleanText}:fontsize=24:fontcolor=white:x=10:y=10:enable=between(t\\,${firstPhrase.start.toFixed(0)}\\,${firstPhrase.end.toFixed(0)})`
    
    const args = [
      '-i', 'input.mp4',
      '-vf', filter,
      '-c:a', 'copy',
      '-t', '10',
      '-y', 'output.mp4'
    ]

    console.log('🎬 FFmpeg filter:', filter)
    console.log('🎬 Full command:', args.join(' '))

    // Add detailed logging
    ffmpegInstance.on('log', ({ type, message }) => {
      if (type === 'fferr' && message.includes('error')) {
        console.error('🚨 FFmpeg ERROR:', message)
      } else {
        console.log(`FFmpeg ${type}:`, message)
      }
    })

    onProgress?.(50)

    await ffmpegInstance.exec(args)
    console.log('✅ FFmpeg execution completed')

    onProgress?.(80)

    // Check output
    const outputData = await ffmpegInstance.readFile('output.mp4')
    console.log(`📊 Output file size: ${outputData.length} bytes`)

    if (!outputData || outputData.length === 0) {
      throw new Error('Caption test produced empty file - caption filter is broken')
    }

    // Create blob
    const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
    const url = URL.createObjectURL(blob)

    // Cleanup
    await ffmpegInstance.deleteFile('input.mp4')
    await ffmpegInstance.deleteFile('output.mp4')

    onProgress?.(100)
    console.log('✅ Step 4 PASSED: Actual captions work')
    return url

  } catch (error) {
    console.error('❌ Step 4 FAILED:', error)
    throw error
  }
}

// Run all diagnostic steps
export async function runFullDiagnostic(
  videoFile: File,
  phrases: KeyPhrase[],
  onProgress?: (progress: number) => void
): Promise<{ step: number; result?: string; error?: string }[]> {
  console.log('🔍 === RUNNING FULL DIAGNOSTIC ===')
  
  const results: { step: number; result?: string; error?: string }[] = []

  // Step 1: Basic copy
  try {
    onProgress?.(0)
    const result1 = await testBasicCopy(videoFile, (p) => onProgress?.(p * 0.25))
    results.push({ step: 1, result: result1 })
  } catch (error) {
    results.push({ step: 1, error: error instanceof Error ? error.message : 'Unknown error' })
    console.log('❌ Stopping diagnostic - basic copy failed')
    return results
  }

  // Step 2: Simple drawtext
  try {
    onProgress?.(25)
    const result2 = await testSimpleDrawtext(videoFile, (p) => onProgress?.(25 + p * 0.25))
    results.push({ step: 2, result: result2 })
  } catch (error) {
    results.push({ step: 2, error: error instanceof Error ? error.message : 'Unknown error' })
    console.log('❌ Stopping diagnostic - simple drawtext failed')
    return results
  }

  // Step 3: Timed drawtext
  try {
    onProgress?.(50)
    const result3 = await testTimedDrawtext(videoFile, (p) => onProgress?.(50 + p * 0.25))
    results.push({ step: 3, result: result3 })
  } catch (error) {
    results.push({ step: 3, error: error instanceof Error ? error.message : 'Unknown error' })
    console.log('❌ Stopping diagnostic - timed drawtext failed')
    return results
  }

  // Step 4: Actual captions
  try {
    onProgress?.(75)
    const result4 = await testActualCaptions(videoFile, phrases, (p) => onProgress?.(75 + p * 0.25))
    results.push({ step: 4, result: result4 })
  } catch (error) {
    results.push({ step: 4, error: error instanceof Error ? error.message : 'Unknown error' })
  }

  onProgress?.(100)
  console.log('🔍 === DIAGNOSTIC COMPLETE ===')
  return results
}
