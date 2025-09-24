import { convertToWhisperCompatible, needsConversion, getFormatName } from './fileConversionService'

export interface TranscriptionSegment {
  id: string
  text: string
  start: number
  end: number
  confidence?: number
}

export interface KeyPhrase {
  id: string
  text: string
  start: number
  end: number
  isSelected: boolean
  reason?: string
  priority?: number
}

// Extract audio from video file and convert if necessary
export async function extractAudioFromVideo(
  videoFile: File, 
  onProgress?: (progress: number, status: string) => void
): Promise<File> {
  try {
    // Check if file needs conversion
    if (needsConversion(videoFile)) {
      const formatName = getFormatName(videoFile)
      onProgress?.(0, `Converting ${formatName} to MP4...`)
      
      try {
        const convertedFile = await convertToWhisperCompatible(videoFile, (conversionProgress) => {
          onProgress?.(conversionProgress * 0.8, `Converting ${formatName} to MP4...`) // Use 80% of progress for conversion
        })
        
        onProgress?.(80, 'Conversion complete, preparing for transcription...')
        return convertedFile
        
      } catch (conversionError) {
        console.error('Conversion failed, attempting direct upload:', conversionError)
        
        // Fallback: Try sending the original file anyway
        // Some formats like MOV might work directly with Whisper
        onProgress?.(40, 'Conversion failed, trying direct upload...')
        
        // For MOV files specifically, they sometimes work with Whisper
        const fileExtension = videoFile.name.split('.').pop()?.toLowerCase()
        if (fileExtension === 'mov') {
          onProgress?.(60, 'Attempting direct MOV file processing...')
          return videoFile
        }
        
        // For other formats, throw the conversion error
        throw conversionError
      }
    }
    
    // File is already in supported format
    onProgress?.(80, 'File ready for transcription...')
    return videoFile
    
  } catch (error) {
    console.error('File processing failed:', error)
    throw error
  }
}

// Transcribe audio using our API
export async function transcribeAudio(
  audioFile: File,
  onProgress?: (progress: number, status: string) => void
): Promise<{
  transcript: TranscriptionSegment[]
  fullText: string
}> {
  onProgress?.(0, 'Sending file for transcription...')
  const formData = new FormData()
  formData.append('audio', audioFile)

  onProgress?.(20, 'Processing with AI transcription...')

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || 'Transcription failed')
  }

  onProgress?.(90, 'Transcription complete!')

  const result = await response.json()
  return {
    transcript: result.transcript,
    fullText: result.fullText,
  }
}

// Analyze transcript for key phrases
export async function analyzeKeyPhrases(
  transcript: TranscriptionSegment[],
  fullText: string
): Promise<KeyPhrase[]> {
  const response = await fetch('/api/analyze-phrases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      fullText,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || 'Phrase analysis failed')
  }

  const result = await response.json()
  return result.keyPhrases
}

// Generate full transcript captions (every word/phrase)
export function generateFullTranscriptCaptions(transcript: TranscriptionSegment[]): KeyPhrase[] {
  // Group words into phrases of 3-5 words for better readability
  const phrases: KeyPhrase[] = []
  const wordsPerPhrase = 4
  
  for (let i = 0; i < transcript.length; i += wordsPerPhrase) {
    const wordGroup = transcript.slice(i, i + wordsPerPhrase)
    
    if (wordGroup.length === 0) continue
    
    const phrase: KeyPhrase = {
      id: `transcript-${i}`,
      text: wordGroup.map(w => w.text).join(' '),
      start: wordGroup[0].start,
      end: wordGroup[wordGroup.length - 1].end,
      isSelected: true, // Auto-select all for full transcript mode
      reason: 'Full transcript caption',
      priority: 5 // Medium priority for all
    }
    
    phrases.push(phrase)
  }
  
  console.log(`Generated ${phrases.length} full transcript captions`)
  return phrases
}
