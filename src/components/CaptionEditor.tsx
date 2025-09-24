'use client'

import { useState } from 'react'
import { useAppStore, CAPTION_STYLES } from '@/store/appStore'
import CaptionModeSelector from '@/components/CaptionModeSelector'
import QuickStyleActions from '@/components/QuickStyleActions'
import InteractiveCaptionEditor from '@/components/InteractiveCaptionEditor'
import { Palette, Type, Clock, Eye, EyeOff, Move } from 'lucide-react'

export default function CaptionEditor() {
  const {
    keyPhrases,
    fullTranscriptCaptions,
    captionMode,
    togglePhraseSelection,
    updatePhraseStyle,
    applyStyleToAll,
    applyStyleToSelected,
    setCurrentStep,
  } = useAppStore()

  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'phrases' | 'styles' | 'position' | 'timing'>('phrases')

  // Get current phrases based on mode
  const currentPhrases = captionMode === 'key-phrases' ? keyPhrases : fullTranscriptCaptions
  const selectedPhrase = currentPhrases.find(p => p.id === selectedPhraseId)
  const selectedPhrases = currentPhrases.filter(p => p.isSelected)

  const handlePhraseClick = (phraseId: string) => {
    setSelectedPhraseId(phraseId)
  }

  const handleStyleChange = (styleId: string) => {
    if (!selectedPhraseId) return
    
    const style = CAPTION_STYLES.find(s => s.id === styleId)
    if (style) {
      updatePhraseStyle(selectedPhraseId, style)
    }
  }

  const handleBulkStyleChange = (styleId: string, target: 'all' | 'selected') => {
    const style = CAPTION_STYLES.find(s => s.id === styleId)
    if (style) {
      if (target === 'all') {
        applyStyleToAll(style)
      } else {
        applyStyleToSelected(style)
      }
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const milliseconds = Math.floor((time % 1) * 100)
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Caption Mode Selector */}
      <CaptionModeSelector />
      
      {/* Quick Style Actions */}
      <QuickStyleActions />
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('phrases')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'phrases'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Type className="w-4 h-4 inline mr-2" />
          Phrases ({selectedPhrases.length})
        </button>
        <button
          onClick={() => setActiveTab('styles')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'styles'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Palette className="w-4 h-4 inline mr-2" />
          Styles
        </button>
        <button
          onClick={() => setActiveTab('position')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'position'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Move className="w-4 h-4 inline mr-2" />
          Position & Size
        </button>
        <button
          onClick={() => setActiveTab('timing')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'timing'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Timing
        </button>
      </div>

      {/* Phrases Tab */}
      {activeTab === 'phrases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Select Phrases for Captions</h4>
            <span className="text-sm text-gray-500">
              {selectedPhrases.length} selected
            </span>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentPhrases.map((phrase) => (
              <div
                key={phrase.id}
                onClick={() => handlePhraseClick(phrase.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPhraseId === phrase.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : phrase.isSelected
                    ? 'border-green-300 bg-green-50 dark:bg-green-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePhraseSelection(phrase.id)
                      }}
                      className="p-1"
                    >
                      {phrase.isSelected ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <span className="font-medium">&quot;{phrase.text}&quot;</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(phrase.start)} - {formatTime(phrase.end)}
                  </span>
                </div>
                
                {phrase.style && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Style: {phrase.style.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Styles Tab */}
      {activeTab === 'styles' && (
        <div className="space-y-6">
          {/* Bulk Styling Options */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-500" />
              Bulk Styling
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Apply styles to multiple captions at once, then customize individual captions as needed.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CAPTION_STYLES.map((style) => (
                <div key={style.id} className="space-y-2">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                    <h5 className="font-medium text-sm mb-2">{style.name}</h5>
                    <div
                      className="p-2 rounded text-center text-xs"
                      style={{
                        fontFamily: style.fontFamily,
                        fontSize: `${Math.max(10, style.fontSize * 0.4)}px`,
                        fontWeight: style.fontWeight,
                        color: style.color,
                        backgroundColor: style.backgroundColor || 'transparent',
                        textAlign: style.textAlign,
                      }}
                    >
                      Sample Text
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleBulkStyleChange(style.id, 'selected')}
                      disabled={selectedPhrases.length === 0}
                      className="flex-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Selected ({selectedPhrases.length})
                    </button>
                    <button
                      onClick={() => handleBulkStyleChange(style.id, 'all')}
                      className="flex-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      All ({currentPhrases.length})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Styling */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Individual Styling</h4>
              {selectedPhrase && (
                <span className="text-sm text-gray-500">
                  Editing: &quot;{selectedPhrase.text}&quot;
                </span>
              )}
            </div>

            {!selectedPhrase && (
              <p className="text-gray-500 text-center py-8">
                Select a phrase from the Phrases tab to customize its individual style
              </p>
            )}

            {selectedPhrase && (
              <div className="grid gap-4">
                {CAPTION_STYLES.map((style) => (
                  <div
                    key={style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedPhrase.style?.id === style.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{style.name}</h5>
                      {selectedPhrase.style?.id === style.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    
                    {/* Style Preview */}
                    <div
                      className="p-2 rounded text-center"
                      style={{
                        fontFamily: style.fontFamily,
                        fontSize: `${Math.max(14, style.fontSize * 0.6)}px`,
                        fontWeight: style.fontWeight,
                        color: style.color,
                        backgroundColor: style.backgroundColor || 'transparent',
                        textAlign: style.textAlign,
                      }}
                    >
                      {selectedPhrase.text}
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <div>Position: {style.position}</div>
                      <div>Animation: {style.animation || 'none'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Position & Size Tab */}
      {activeTab === 'position' && (
        <InteractiveCaptionEditor />
      )}

      {/* Timing Tab */}
      {activeTab === 'timing' && (
        <div className="space-y-4">
          <h4 className="font-semibold">Caption Timing</h4>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h5 className="font-medium mb-3">Timeline Preview</h5>
            <div className="space-y-2">
              {selectedPhrases.map((phrase) => (
                <div
                  key={phrase.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded"
                >
                  <span className="text-sm">&quot;{phrase.text}&quot;</span>
                  <span className="text-xs text-gray-500">
                    {formatTime(phrase.start)} - {formatTime(phrase.end)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setCurrentStep('transcribe')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Back to Transcription
        </button>
        <button
          onClick={() => setCurrentStep('export')}
          disabled={selectedPhrases.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Export ({selectedPhrases.length} captions)
        </button>
      </div>
    </div>
  )
}
