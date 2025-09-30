'use client'

import { useAppStore } from '@/store/appStore'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Type, 
  Palette, 
  Move, 
  RotateCw, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react'

interface ContextToolbarProps {
  phraseId: string
}

export default function ContextToolbar({ phraseId }: ContextToolbarProps) {
  const { 
    phrases, 
    updatePhraseStyle, 
    selectedPhraseId,
    setSelectedPhraseId 
  } = useAppStore()

  const phrase = phrases.find(p => p.id === phraseId)
  if (!phrase) return null

  const currentStyle = phrase.style

  const handleStyleChange = (property: string, value: any) => {
    updatePhraseStyle(phraseId, {
      ...currentStyle,
      [property]: value
    })
  }

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value)
    if (size > 0) {
      handleStyleChange('fontSize', size)
    }
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStyleChange('color', e.target.value)
  }

  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStyleChange('backgroundColor', e.target.value)
  }

  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    handleStyleChange('textAlign', align)
  }

  const handleFontWeightChange = (weight: 'normal' | 'bold') => {
    handleStyleChange('fontWeight', weight)
  }

  return (
    <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
      {/* Selected Text Info */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Type className="w-4 h-4" />
        <span className="truncate max-w-32">
          "{phrase.text.substring(0, 20)}{phrase.text.length > 20 ? '...' : ''}"
        </span>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Font Controls */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">Size</label>
        <input
          type="number"
          value={currentStyle.fontSize}
          onChange={handleFontSizeChange}
          className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          min="8"
          max="200"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">Weight</label>
        <button
          onClick={() => handleFontWeightChange(currentStyle.fontWeight === 'bold' ? 'normal' : 'bold')}
          className={`p-1 rounded ${currentStyle.fontWeight === 'bold' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <Bold className="w-4 h-4" />
        </button>
      </div>

      {/* Color Controls */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">Text</label>
        <input
          type="color"
          value={currentStyle.color}
          onChange={handleColorChange}
          className="w-6 h-6 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">Bg</label>
        <input
          type="color"
          value={currentStyle.backgroundColor || '#000000'}
          onChange={handleBackgroundColorChange}
          className="w-6 h-6 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
        />
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Alignment Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleTextAlignChange('left')}
          className={`p-1 rounded ${currentStyle.textAlign === 'left' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleTextAlignChange('center')}
          className={`p-1 rounded ${currentStyle.textAlign === 'center' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleTextAlignChange('right')}
          className={`p-1 rounded ${currentStyle.textAlign === 'right' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setSelectedPhraseId(null)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
          title="Deselect"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* More Options */}
      <button className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300">
        More Options
      </button>
    </div>
  )
}
