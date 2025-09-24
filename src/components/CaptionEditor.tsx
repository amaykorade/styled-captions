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
    updatePhraseText,
    applyStyleToAll,
    applyStyleToSelected,
    setCurrentStep,
  } = useAppStore()

  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'phrases' | 'styles' | 'position' | 'timing'>('phrases')

  // Custom style builder state
  const [customTextColor, setCustomTextColor] = useState<string>('#ffffff')
  const [customHasBackground, setCustomHasBackground] = useState<boolean>(false)
  const [customBackgroundColor, setCustomBackgroundColor] = useState<string>('#000000CC')
  const [customFontFamily, setCustomFontFamily] = useState<string>('Inter, sans-serif')
  const [customFontWeight, setCustomFontWeight] = useState<string>('bold')
  const [customFontSize, setCustomFontSize] = useState<number>(24)
  const [customTextAlign, setCustomTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [customPosition, setCustomPosition] = useState<'top' | 'center' | 'bottom'>('bottom')
  const [customLetterSpacing, setCustomLetterSpacing] = useState<number>(0)
  const [customLineHeight, setCustomLineHeight] = useState<number>(1.2)
  const [customOpacity, setCustomOpacity] = useState<number>(1)
  const [customShadowColor, setCustomShadowColor] = useState<string>('rgba(0,0,0,0.8)')
  const [customShadowBlur, setCustomShadowBlur] = useState<number>(4)
  const [customShadowX, setCustomShadowX] = useState<number>(2)
  const [customShadowY, setCustomShadowY] = useState<number>(2)
  const [customOutlineColor, setCustomOutlineColor] = useState<string>('')
  const [customOutlineWidth, setCustomOutlineWidth] = useState<number>(0)
  const [customBgPadding, setCustomBgPadding] = useState<number>(12)
  const [customBgRadius, setCustomBgRadius] = useState<number>(4)

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

  const handleApplyCustom = (target: 'selected' | 'all') => {
    const newStyle = {
      id: 'custom',
      name: 'Custom Style',
      fontFamily: customFontFamily,
      fontSize: customFontSize,
      fontWeight: customFontWeight,
      color: customTextColor,
      backgroundColor: customHasBackground ? customBackgroundColor : undefined,
      textAlign: customTextAlign,
      position: customPosition,
      letterSpacing: customLetterSpacing,
      lineHeight: customLineHeight,
      opacity: customOpacity,
      shadowColor: customShadowColor,
      shadowBlur: customShadowBlur,
      shadowOffsetX: customShadowX,
      shadowOffsetY: customShadowY,
      outlineColor: customOutlineColor || undefined,
      outlineWidth: customOutlineWidth || undefined,
      backgroundPadding: customBgPadding,
      backgroundRadius: customBgRadius
    } as const
    if (target === 'all') {
      applyStyleToAll(newStyle)
    } else {
      applyStyleToSelected(newStyle)
    }
  }

  const handleApplyCustomToOne = () => {
    if (!selectedPhraseId) return
    const newStyle = {
      id: 'custom',
      name: 'Custom Style',
      fontFamily: customFontFamily,
      fontSize: customFontSize,
      fontWeight: customFontWeight,
      color: customTextColor,
      backgroundColor: customHasBackground ? customBackgroundColor : undefined,
      textAlign: customTextAlign,
      position: customPosition,
      letterSpacing: customLetterSpacing,
      lineHeight: customLineHeight,
      opacity: customOpacity,
      shadowColor: customShadowColor,
      shadowBlur: customShadowBlur,
      shadowOffsetX: customShadowX,
      shadowOffsetY: customShadowY,
      outlineColor: customOutlineColor || undefined,
      outlineWidth: customOutlineWidth || undefined,
      backgroundPadding: customBgPadding,
      backgroundRadius: customBgRadius
    } as const
    updatePhraseStyle(selectedPhraseId, newStyle as any)
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
                    <input
                      type="text"
                      defaultValue={phrase.text}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const val = e.currentTarget.value.trim()
                        if (val && val !== phrase.text) {
                          updatePhraseText(phrase.id, val)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur()
                        }
                      }}
                      className="font-medium bg-transparent border-b border-dashed border-gray-300 focus:border-blue-400 outline-none text-sm md:text-base px-1"
                    />
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

          {/* Custom Style Builder */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Custom Style Builder</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Text Color */}
              <div className="flex items-center justify-between p-3 rounded border">
                <label className="text-sm">Text color</label>
                <input type="color" value={customTextColor} onChange={(e) => setCustomTextColor(e.target.value)} className="h-8 w-12 cursor-pointer bg-transparent border rounded" />
              </div>
              {/* Background toggle + color */}
              <div className="flex items-center justify-between p-3 rounded border">
                <label className="text-sm">Background</label>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={customHasBackground} onChange={(e) => setCustomHasBackground(e.target.checked)} />
                  <input type="color" value={customBackgroundColor} disabled={!customHasBackground} onChange={(e) => setCustomBackgroundColor(e.target.value)} className="h-8 w-12 cursor-pointer bg-transparent border rounded disabled:opacity-50" />
                </div>
              </div>
              {/* Font family */}
              <div className="flex items-center justify-between p-3 rounded border">
                <label className="text-sm">Font</label>
                <select value={customFontFamily} onChange={(e) => setCustomFontFamily(e.target.value)} className="text-sm border rounded px-2 py-1 bg-transparent">
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Impact, sans-serif">Impact</option>
                  <option value="Comic Sans MS, cursive">Comic Sans</option>
                </select>
              </div>
              {/* Weight */}
              <div className="flex items-center justify-between p-3 rounded border">
                <label className="text-sm">Weight</label>
                <select value={customFontWeight} onChange={(e) => setCustomFontWeight(e.target.value)} className="text-sm border rounded px-2 py-1 bg-transparent">
                  <option value="normal">Normal</option>
                  <option value="medium">Medium</option>
                  <option value="semibold">Semibold</option>
                  <option value="bold">Bold</option>
                  <option value="900">Black</option>
                </select>
              </div>
              {/* Font size */}
              <div className="flex items-center justify-between p-3 rounded border">
                <label className="text-sm">Font size</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={12} max={72} value={customFontSize} onChange={(e) => setCustomFontSize(parseInt(e.target.value))} />
                  <span className="text-sm text-gray-500 w-10 text-right">{customFontSize}px</span>
                </div>
              </div>
              {/* Align */}
              <div className="flex items-center justify-between p-3 rounded border">
                <label className="text-sm">Align</label>
                <select value={customTextAlign} onChange={(e) => setCustomTextAlign(e.target.value as any)} className="text-sm border rounded px-2 py-1 bg-transparent">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              {/* Position */}
              <div className="flex items-center justify-between p-3 rounded border">
                <label className="text-sm">Position</label>
                <select value={customPosition} onChange={(e) => setCustomPosition(e.target.value as any)} className="text-sm border rounded px-2 py-1 bg-transparent">
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>

            {/* Preview & Apply */}
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div className="p-4 border rounded">
                <div
                  className="rounded text-center"
                  style={{
                    fontFamily: customFontFamily,
                    fontSize: `${customFontSize}px`,
                    fontWeight: customFontWeight as any,
                    color: customTextColor,
                    backgroundColor: customHasBackground ? customBackgroundColor : 'transparent',
                    letterSpacing: `${customLetterSpacing}px`,
                    lineHeight: customLineHeight,
                    opacity: customOpacity,
                    textShadow: `${customShadowX}px ${customShadowY}px ${customShadowBlur}px ${customShadowColor}`,
                    borderRadius: `${customBgRadius}px`,
                    padding: customHasBackground ? `${customBgPadding}px` : undefined
                  }}
                >
                  Your custom caption style
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleApplyCustom('selected')} disabled={selectedPhrases.length === 0} className="flex-1 px-3 py-2 text-sm rounded bg-black text-white disabled:opacity-50">
                  Apply to Selected ({selectedPhrases.length})
                </button>
                <button onClick={() => handleApplyCustom('all')} className="flex-1 px-3 py-2 text-sm rounded border">
                  Apply to All ({currentPhrases.length})
                </button>
                <button onClick={handleApplyCustomToOne} disabled={!selectedPhraseId} className="flex-1 px-3 py-2 text-sm rounded border">
                  Apply to This Phrase {selectedPhrase ? `("${selectedPhrase.text.substring(0, 16)}${selectedPhrase.text.length > 16 ? '…' : ''}")` : ''}
                </button>
                {/* Advanced controls rows */}
                <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                  <label className="flex items-center justify-between gap-3">Letter spacing (px)
                    <input type="number" value={customLetterSpacing} onChange={(e) => setCustomLetterSpacing(parseInt(e.target.value || '0'))} className="w-20 border rounded px-2 py-1 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Line height
                    <input type="number" step="0.1" min="0.8" max="2" value={customLineHeight} onChange={(e) => setCustomLineHeight(parseFloat(e.target.value || '1.2'))} className="w-20 border rounded px-2 py-1 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Opacity
                    <input type="range" min={0.1} max={1} step={0.05} value={customOpacity} onChange={(e) => setCustomOpacity(parseFloat(e.target.value))} />
                  </label>
                  <label className="flex items-center justify-between gap-3">Shadow color
                    <input type="color" value={customShadowColor} onChange={(e) => setCustomShadowColor(e.target.value)} className="h-8 w-12 border rounded" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Shadow blur
                    <input type="number" value={customShadowBlur} onChange={(e) => setCustomShadowBlur(parseInt(e.target.value || '0'))} className="w-20 border rounded px-2 py-1 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Shadow X
                    <input type="number" value={customShadowX} onChange={(e) => setCustomShadowX(parseInt(e.target.value || '0'))} className="w-20 border rounded px-2 py-1 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Shadow Y
                    <input type="number" value={customShadowY} onChange={(e) => setCustomShadowY(parseInt(e.target.value || '0'))} className="w-20 border rounded px-2 py-1 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Outline color
                    <input type="color" value={customOutlineColor} onChange={(e) => setCustomOutlineColor(e.target.value)} className="h-8 w-12 border rounded" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Outline width
                    <input type="number" min={0} value={customOutlineWidth} onChange={(e) => setCustomOutlineWidth(parseInt(e.target.value || '0'))} className="w-20 border rounded px-2 py-1 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Background padding
                    <input type="number" min={0} value={customBgPadding} onChange={(e) => setCustomBgPadding(parseInt(e.target.value || '0'))} className="w-20 border rounded px-2 py-1 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between gap-3">Background radius
                    <input type="number" min={0} value={customBgRadius} onChange={(e) => setCustomBgRadius(parseInt(e.target.value || '0'))} className="w-20 border rounded px-2 py-1 bg-transparent" />
                  </label>
                </div>
              </div>
            </div>
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
