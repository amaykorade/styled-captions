'use client'

import { useEffect, useState } from 'react'
import { checkFFmpegSupport, getBrowserInfo } from '@/utils/browserCheck'
import { AlertTriangle, X } from 'lucide-react'

export default function BrowserCompatibilityWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [browserInfo, setBrowserInfo] = useState<{
    browser: string
    supported: boolean
    reason?: string
    suggestions?: string[]
  } | null>(null)

  useEffect(() => {
    const support = checkFFmpegSupport()
    const browser = getBrowserInfo()
    
    setBrowserInfo({
      browser,
      supported: support.supported,
      reason: support.reason,
      suggestions: support.suggestions,
    })

    if (!support.supported) {
      setShowWarning(true)
    }
  }, [])

  if (!showWarning || !browserInfo || browserInfo.supported) {
    return null
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
            Limited Browser Support Detected
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
            Your browser ({browserInfo.browser}) may not support automatic video conversion. 
            {browserInfo.reason && ` Reason: ${browserInfo.reason}`}
          </p>
          
          {browserInfo.suggestions && (
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <p className="font-medium mb-1">Recommendations:</p>
              <ul className="list-disc list-inside space-y-1">
                {browserInfo.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
                <li>Upload MP4 files directly (no conversion needed)</li>
              </ul>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowWarning(false)}
          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
