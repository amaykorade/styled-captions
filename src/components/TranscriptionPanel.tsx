'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { transcribeAudio, analyzeKeyPhrases, extractAudioFromVideo, generateFullTranscriptCaptions } from '@/services/transcriptionService'
import { Loader2, CheckCircle, AlertCircle, Play, Pause } from 'lucide-react'

export default function TranscriptionPanel() {
  const {
    videoFile,
    transcript,
    keyPhrases,
    isTranscribing,
    transcriptionError,
    setTranscript,
    setKeyPhrases,
    setFullTranscriptCaptions,
    setIsTranscribing,
    setTranscriptionError,
    setCurrentStep,
  } = useAppStore()

  const [currentPhase, setCurrentPhase] = useState<'extracting' | 'transcribing' | 'analyzing' | 'complete'>('extracting')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (videoFile && transcript.length === 0 && !isTranscribing) {
      startTranscription()
    }
  }, [videoFile])

  const startTranscription = async () => {
    if (!videoFile) return

    setIsTranscribing(true)
    setTranscriptionError(null)
    setProgress(0)

    try {
      // Phase 1: Extract/Convert audio
      setCurrentPhase('extracting')
      setStatusMessage('Preparing file for transcription...')
      const audioFile = await extractAudioFromVideo(videoFile, (progress, status) => {
        setProgress(Math.min(progress, 30)) // Cap at 30% for this phase
        setStatusMessage(status)
      })

      // Phase 2: Transcribe
      setCurrentPhase('transcribing')
      setStatusMessage('Transcribing with AI...')
      const { transcript: transcriptSegments, fullText } = await transcribeAudio(audioFile, (progress, status) => {
        setProgress(30 + (progress * 0.4)) // 30% to 70%
        setStatusMessage(status)
      })
      setTranscript(transcriptSegments)

      // Phase 3: Analyze key phrases and generate full transcript
      setCurrentPhase('analyzing')
      setStatusMessage('Analyzing key phrases with AI...')
      setProgress(70)
      const keyPhrasesResult = await analyzeKeyPhrases(transcriptSegments, fullText)
      setKeyPhrases(keyPhrasesResult)
      
      setStatusMessage('Generating full transcript captions...')
      setProgress(85)
      const fullTranscriptResult = generateFullTranscriptCaptions(transcriptSegments)
      setFullTranscriptCaptions(fullTranscriptResult)
      setProgress(100)

      // Complete
      setCurrentPhase('complete')
      setStatusMessage('Analysis complete!')
      setCurrentStep('edit')

    } catch (error) {
      console.error('Transcription failed:', error)
      setTranscriptionError(error instanceof Error ? error.message : 'Transcription failed')
    } finally {
      setIsTranscribing(false)
    }
  }

  const getPhaseText = () => {
    if (statusMessage) {
      return statusMessage
    }
    
    switch (currentPhase) {
      case 'extracting':
        return 'Preparing file for transcription...'
      case 'transcribing':
        return 'Transcribing speech to text...'
      case 'analyzing':
        return 'Analyzing key phrases with AI...'
      case 'complete':
        return 'Transcription complete!'
      default:
        return 'Processing...'
    }
  }

  const getPhaseIcon = () => {
    if (transcriptionError) {
      return <AlertCircle className="w-8 h-8 text-red-500" />
    }
    
    if (currentPhase === 'complete') {
      return <CheckCircle className="w-8 h-8 text-green-500" />
    }

    return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
  }

  if (transcriptionError) {
    const isConversionError = transcriptionError.includes('convert') || transcriptionError.includes('SharedArrayBuffer')
    
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
          Transcription Failed
        </h3>
        <p className="text-red-600 dark:text-red-300 mb-4">
          {transcriptionError}
        </p>
        
        {isConversionError && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4 text-left">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              💡 Suggested Solutions:
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
              <li>Convert your video to MP4 format before uploading</li>
              <li>Try using a different browser (Chrome or Firefox work best)</li>
              <li>Use a smaller file size (under 50MB)</li>
              <li>Try uploading the file directly as MP4 instead</li>
            </ul>
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setTranscriptionError(null)
              setCurrentStep('upload')
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Upload Different File
          </button>
          <button
            onClick={startTranscription}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (currentPhase === 'complete' && keyPhrases.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <h3 className="text-lg font-semibold">Key Phrases Identified</h3>
        </div>

        <div className="space-y-3">
          {keyPhrases.map((phrase) => (
            <div
              key={phrase.id}
              className={`p-3 rounded-lg border transition-colors ${
                phrase.isSelected
                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">&quot;{phrase.text}&quot;</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {phrase.start.toFixed(1)}s - {phrase.end.toFixed(1)}s
                  </span>
                  {phrase.priority && phrase.priority >= 8 && (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                      High Priority
                    </span>
                  )}
                </div>
              </div>
              {phrase.reason && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {phrase.reason}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Debug info - shows first few transcript segments */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">Debug: Raw Transcript Sample</summary>
          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs max-h-32 overflow-y-auto">
            {transcript.slice(0, 10).map((segment, i) => (
              <div key={i}>
                [{segment.start.toFixed(1)}s-{segment.end.toFixed(1)}s] {segment.text}
              </div>
            ))}
            {transcript.length > 10 && <div>... and {transcript.length - 10} more segments</div>}
          </div>
        </details>

        <div className="pt-4 border-t">
          <button
            onClick={() => setCurrentStep('edit')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue to Caption Editor
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="mb-6">
        {getPhaseIcon()}
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {getPhaseText()}
      </h3>
      
      <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This may take a few moments...
      </p>
    </div>
  )
}
