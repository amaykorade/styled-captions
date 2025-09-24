'use client'

import { useAppStore, CAPTION_STYLES } from '@/store/appStore'
import { Wand2, CheckSquare, Square } from 'lucide-react'

export default function QuickStyleActions() {
  const {
    getCurrentCaptions,
    applyStyleToAll,
    applyStyleToSelected,
    togglePhraseSelection,
  } = useAppStore()

  const currentCaptions = getCurrentCaptions()
  const selectedCaptions = currentCaptions.filter(c => c.isSelected)
  const allSelected = currentCaptions.length > 0 && selectedCaptions.length === currentCaptions.length

  const handleSelectAll = () => {
    currentCaptions.forEach(caption => {
      if (!caption.isSelected) {
        togglePhraseSelection(caption.id)
      }
    })
  }

  const handleDeselectAll = () => {
    currentCaptions.forEach(caption => {
      if (caption.isSelected) {
        togglePhraseSelection(caption.id)
      }
    })
  }

  const handleQuickStyle = (styleId: string) => {
    const style = CAPTION_STYLES.find(s => s.id === styleId)
    if (style) {
      if (selectedCaptions.length > 0) {
        applyStyleToSelected(style)
      } else {
        applyStyleToAll(style)
      }
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-purple-500" />
        Quick Actions
      </h4>
      
      {/* Selection Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={allSelected ? handleDeselectAll : handleSelectAll}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-500" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
        
        <span className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
          {selectedCaptions.length} of {currentCaptions.length} selected
        </span>
      </div>

      {/* Quick Style Buttons */}
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Apply popular styles instantly:
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickStyle('modern')}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-800 to-black text-white text-sm rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all"
          >
            <span className="w-2 h-2 bg-white rounded-full"></span>
            Modern
          </button>
          
          <button
            onClick={() => handleQuickStyle('playful')}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm rounded-lg hover:from-pink-400 hover:to-red-400 transition-all"
          >
            <span className="w-2 h-2 bg-yellow-300 rounded-full"></span>
            Playful
          </button>
          
          <button
            onClick={() => handleQuickStyle('elegant')}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 text-sm rounded-lg hover:from-gray-50 hover:to-gray-100 transition-all border"
          >
            <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
            Elegant
          </button>
          
          <button
            onClick={() => handleQuickStyle('bold')}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-sm rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all font-bold"
          >
            <span className="w-2 h-2 bg-black rounded-full"></span>
            Bold Impact
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          {selectedCaptions.length > 0 
            ? `Will apply to ${selectedCaptions.length} selected captions`
            : `Will apply to all ${currentCaptions.length} captions`
          }
        </p>
      </div>
    </div>
  )
}
