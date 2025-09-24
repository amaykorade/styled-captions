import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    console.log('Transcribing audio file:', audioFile.name, audioFile.size)

    // Check if file is in supported format (conversion should have happened client-side)
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase()
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
    
    // Allow MOV as fallback (sometimes works with Whisper)
    const allowedFormats = [...supportedFormats, 'mov']
    
    if (!allowedFormats.includes(fileExtension || '')) {
      console.warn(`Received unsupported format: ${fileExtension}. File should have been converted client-side.`)
      return NextResponse.json(
        { 
          error: 'Unsupported file format',
          details: `File format '${fileExtension}' is not supported. Please convert to MP4 or try a different file.`
        },
        { status: 400 }
      )
    }
    
    // Warn if receiving MOV (fallback case)
    if (fileExtension === 'mov') {
      console.log('Attempting direct MOV transcription as fallback...')
    }

    // Create a transcription using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    })

    console.log('Transcription completed')

    // Transform the response to match our interface
    const segments = transcription.words?.map((word, index) => ({
      id: index.toString(),
      text: word.word,
      start: word.start,
      end: word.end,
      confidence: 1, // Whisper doesn't provide confidence scores
    })) || []

    return NextResponse.json({
      success: true,
      transcript: segments,
      fullText: transcription.text,
    })

  } catch (error) {
    console.error('Transcription error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
