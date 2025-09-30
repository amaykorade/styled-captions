'use client'

import { useAppStore } from '@/store/appStore'
import { Sparkles, FileText, ToggleLeft, ToggleRight } from 'lucide-react'

export default function CaptionModeSelector() {
  const {
    captionMode,
    keyPhrases,
    fullTranscriptCaptions,
    setCaptionMode,
  } = useAppStore()

  const keyPhrasesCount = keyPhrases.filter(p => p.isSelected).length
  const fullTranscriptCount = fullTranscriptCaptions.filter(p => p.isSelected).length

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-blue-500" />
        Caption Mode
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Key Phrases Mode */}
        <button
          onClick={() => setCaptionMode('key-phrases')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            captionMode === 'key-phrases'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="font-medium">Key Phrases Only</span>
            </div>
            {captionMode === 'key-phrases' ? (
              <ToggleRight className="w-5 h-5 text-blue-500" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            AI-selected engaging phrases for maximum impact
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Selected by AI</span>
            <span className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-1 rounded">
              {keyPhrasesCount} captions
            </span>
          </div>
        </button>

        {/* Full Transcript Mode */}
        <button
          onClick={() => setCaptionMode('full-transcript')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            captionMode === 'full-transcript'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              <span className="font-medium">Full Transcript</span>
            </div>
            {captionMode === 'full-transcript' ? (
              <ToggleRight className="w-5 h-5 text-blue-500" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Complete transcript with every word shown
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Complete coverage</span>
            <span className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">
              {fullTranscriptCount} captions
            </span>
          </div>
        </button>
      </div>

      {/* Removed verbose mode info to keep UI clean */}
    </div>
  )
}
