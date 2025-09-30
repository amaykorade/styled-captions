'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { exportVideoWithCaptions } from '@/services/videoExportService'
import { exportVideoWithCanvas, isCanvasExportSupported } from '@/services/canvasExportService'
import { exportVideoWithFixedCaptions, exportVideoWithCanvas as exportVideoWithFixedCanvas } from '@/services/fixedExportService'
import { testSimpleExport, testCaptionExport } from '@/services/simpleExportService'
import { runFullDiagnostic } from '@/services/diagnosticExportService'
import { exportVideoCanvasOnly } from '@/services/workingExportService'
import { exportVideoFast } from '@/services/fastExportService'
import { exportVideoWYSIWYG, getPreviewCanvasDimensions } from '@/services/wysiwygExportService'
import { transcodeBlobToFormat } from '@/services/fileConversionService'
import { Download, Loader2, CheckCircle, AlertCircle, Share2, TestTube } from 'lucide-react'

export default function ExportPanel() {
  const {
    videoFile,
    keyPhrases,
    captionMode,
    getCurrentCaptions,
    getExportReadyCaptions,
    previewCanvasWidth,
    previewCanvasHeight,
    previewRenderedVideoWidth,
    previewRenderedVideoHeight,
    isExporting,
    exportProgress,
    exportedVideoUrl,
    setIsExporting,
    setExportProgress,
    setExportedVideoUrl,
    setCurrentStep,
  } = useAppStore()

  const [exportError, setExportError] = useState<string | null>(null)
  const [exportMethod, setExportMethod] = useState<'ffmpeg' | 'canvas'>('ffmpeg')
  const [format, setFormat] = useState<'webm' | 'mp4' | 'mov'>('webm')
  const [previewCanvasRef, setPreviewCanvasRef] = useState<HTMLCanvasElement | null>(null)

  const currentCaptions = getCurrentCaptions()
  const selectedPhrases = currentCaptions.filter(p => p.isSelected)

  const handleExport = async () => {
    if (!videoFile || selectedPhrases.length === 0) return

    setIsExporting(true)
    setExportError(null)
    setExportProgress(0)

    try {
      console.log('🎬 Starting WYSIWYG video export...')
      
      // Create a temporary video element to get dimensions
      const tempVideo = document.createElement('video')
      tempVideo.src = URL.createObjectURL(videoFile)
      
      await new Promise((resolve) => {
        tempVideo.onloadedmetadata = resolve
      })
      
      // Prefer exact preview canvas dimensions from the live editor if available
      const previewDimensions = (previewCanvasWidth && previewCanvasHeight)
        ? { width: previewCanvasWidth, height: previewCanvasHeight }
        : getPreviewCanvasDimensions(tempVideo)
      console.log(`📐 Using preview dimensions: ${previewDimensions.width}x${previewDimensions.height}`)
      
      // Get the EXACT current state from the interactive editor
      const exportReadyCaptions = getExportReadyCaptions()
      console.log('🎬 EXPORT STARTING - Using live editor state:')
      console.table(exportReadyCaptions.map(c => ({
        text: c.text.substring(0, 25) + '...',
        selected: c.isSelected ? '✅' : '❌',
        fontSize: c.style?.fontSize + 'px',
        posX: c.style?.customX?.toFixed(1) + '%',
        posY: c.style?.customY?.toFixed(1) + '%',
        width: c.style?.maxWidth?.toFixed(1) + '%',
        color: c.style?.color,
        font: c.style?.fontFamily
      })))
      
      // Only export selected captions
      const selectedForExport = exportReadyCaptions.filter(c => c.isSelected)
      console.log(`📝 Exporting ${selectedForExport.length} selected captions out of ${exportReadyCaptions.length} total`)

      // Use WYSIWYG export that matches preview exactly
      console.log('🎯 Using WYSIWYG export service')
      
      const outputUrl = await exportVideoWYSIWYG(
        videoFile,
        selectedForExport,
        previewDimensions,
        (progress) => setExportProgress(progress),
        {
          previewRenderedVideoWidth: previewRenderedVideoWidth,
          previewRenderedVideoHeight: previewRenderedVideoHeight
        }
      )
      
      if (format === 'webm') {
        setExportedVideoUrl(outputUrl)
      } else {
        // Fetch webm and transcode to target format
        const res = await fetch(outputUrl)
        const webmBlob = await res.blob()
        const { blob, mime } = await transcodeBlobToFormat(webmBlob, format, (p) => setExportProgress(p))
        const finalUrl = URL.createObjectURL(blob)
        setExportedVideoUrl(finalUrl)
      }
      console.log('✅ WYSIWYG export completed - should match preview exactly!')
      
    } catch (error) {
      console.error('❌ WYSIWYG export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFastExport = async () => {
    if (!videoFile || selectedPhrases.length === 0) return

    setIsExporting(true)
    setExportError(null)
    setExportProgress(0)

    try {
      console.log('⚡ Starting FAST export...')
      const outputUrl = await exportVideoFast(
        videoFile,
        currentCaptions,
        (progress) => setExportProgress(progress)
      )
      setExportedVideoUrl(outputUrl)
      console.log('✅ Fast export completed!')
    } catch (error) {
      console.error('❌ Fast export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Fast export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleTestExport = async () => {
    if (!videoFile) return

    setIsExporting(true)
    setExportError(null)
    setExportProgress(0)

    try {
      console.log('Starting test export (no captions)...')
      const outputUrl = await testSimpleExport(
        videoFile,
        (progress) => setExportProgress(progress)
      )
      setExportedVideoUrl(outputUrl)
      console.log('Test export successful')
    } catch (error) {
      console.error('Test export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Test export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleTestCaptionExport = async () => {
    if (!videoFile) return

    setIsExporting(true)
    setExportError(null)
    setExportProgress(0)

    try {
      console.log('Starting test caption export...')
      const outputUrl = await testCaptionExport(
        videoFile,
        'Test Caption',
        (progress) => setExportProgress(progress)
      )
      setExportedVideoUrl(outputUrl)
      console.log('Test caption export successful')
    } catch (error) {
      console.error('Test caption export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Test caption export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDiagnosticTest = async () => {
    if (!videoFile) return

    setIsExporting(true)
    setExportError(null)
    setExportProgress(0)

    try {
      console.log('🔍 Starting full diagnostic...')
      const results = await runFullDiagnostic(
        videoFile,
        keyPhrases,
        (progress) => setExportProgress(progress)
      )
      
      console.log('🔍 Diagnostic Results:', results)
      
      // Find the last successful step
      const lastSuccess = results.filter(r => r.result).pop()
      if (lastSuccess && lastSuccess.result) {
        setExportedVideoUrl(lastSuccess.result)
        console.log(`✅ Diagnostic completed - Step ${lastSuccess.step} was the last to succeed`)
      } else {
        setExportError('All diagnostic steps failed. Check console for details.')
      }
      
    } catch (error) {
      console.error('Diagnostic failed:', error)
      setExportError(error instanceof Error ? error.message : 'Diagnostic failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCanvasOnlyExport = async () => {
    if (!videoFile || selectedPhrases.length === 0) return

    setIsExporting(true)
    setExportError(null)
    setExportProgress(0)

    try {
      console.log('🎨 Starting Canvas-Only export (guaranteed to work)...')
      const outputUrl = await exportVideoCanvasOnly(
        videoFile,
        keyPhrases,
        (progress) => setExportProgress(progress)
      )
      setExportedVideoUrl(outputUrl)
      console.log('✅ Canvas-Only export successful!')
    } catch (error) {
      console.error('❌ Even Canvas-Only export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Canvas export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownload = () => {
    if (!exportedVideoUrl) return
    ;(async () => {
      try {
        const response = await fetch(exportedVideoUrl)
        const blob = await response.blob()
        const mime = blob.type || (format === 'mp4' ? 'video/mp4' : format === 'mov' ? 'video/quicktime' : 'video/webm')
        const ext = mime.includes('mp4') ? 'mp4' : mime.includes('quicktime') ? 'mov' : mime.includes('webm') ? 'webm' : format
        const tmpUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = tmpUrl
        a.download = `styled-captions-${Date.now()}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(tmpUrl)
      } catch (e) {
        console.error('Download failed:', e)
        alert('Download failed. Please try again.')
      }
    })()
  }

  const handleShare = async () => {
    if (!exportedVideoUrl) return

    try {
      const response = await fetch(exportedVideoUrl)
      const blob = await response.blob()
      const mime = blob.type || (format === 'mp4' ? 'video/mp4' : format === 'mov' ? 'video/quicktime' : 'video/webm')
      const ext = mime.includes('mp4') ? 'mp4' : mime.includes('quicktime') ? 'mov' : mime.includes('webm') ? 'webm' : format
      const file = new File([blob], `video-with-captions.${ext}`, { type: mime })

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Video with Styled Captions',
          text: 'Check out this video with AI-generated captions!',
          files: [file]
        })
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(exportedVideoUrl)
        alert('Video URL copied to clipboard!')
      }
    } catch (error) {
      console.error('Share failed:', error)
      alert('Share failed. You can download the video instead.')
    }
  }

  if (exportedVideoUrl) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Video Export Complete!</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your video with styled captions is ready to share
          </p>
        </div>

        {/* Video Preview */}
        <div className="bg-black rounded-lg overflow-hidden max-w-md mx-auto">
          <video
            src={exportedVideoUrl}
            controls
            className="w-full h-auto max-h-80 object-contain"
            preload="metadata"
          />
        </div>

        {/* Export Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Export Details</h4>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div>Captions: {selectedPhrases.length} phrases</div>
            <div>Format: MP4</div>
            <div>Quality: Original</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Download Video
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setExportedVideoUrl(null)
              setCurrentStep('edit')
            }}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            ← Make Changes to Captions
          </button>
        </div>
      </div>
    )
  }

  if (exportError) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
          Export Failed
        </h3>
        <p className="text-red-600 dark:text-red-300 mb-4">
          {exportError}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setCurrentStep('edit')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Back to Editor
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (isExporting) {
    const estimatedTimeRemaining = videoFile ? Math.max(0, (videoFile.size / 1000000) * 2 - (exportProgress / 100) * (videoFile.size / 1000000) * 2) : 0
    
    return (
      <div className="text-center py-12">
        <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
        <h3 className="text-lg font-semibold mb-2">Exporting Video...</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Processing your video with captions. Please wait...
        </p>
        
        <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
        
        <div className="space-y-1">
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            {exportProgress.toFixed(1)}% complete
          </p>
          {estimatedTimeRemaining > 0 && (
            <p className="text-xs text-gray-500">
              ~{Math.ceil(estimatedTimeRemaining)}s remaining
            </p>
          )}
        </div>
        
        <div className="mt-6 text-xs text-gray-400 space-y-1">
          <p>🎯 Using WYSIWYG export - preview matches final video exactly</p>
          <p>📐 Same canvas size, font sizes, and positioning as preview</p>
          <p>⚡ Captions will be burned into the video permanently</p>
          <p className="text-blue-400">💡 Check console (F12) for detailed progress</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Export Your Video</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Generate your final video with styled captions ready for social media
        </p>
      </div>

      {/* Export Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Export Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Video:</span>
            <span>{videoFile?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Caption Mode:</span>
            <span className="capitalize">
              {captionMode === 'key-phrases' ? 'Key Phrases' : 'Full Transcript'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Selected Captions:</span>
            <span>{selectedPhrases.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Output Format:</span>
            <div className="flex items-center gap-2">
              <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-900">
                <option value="webm">WebM (fast)</option>
                <option value="mp4">MP4 H.264 (compatible)</option>
                <option value="mov">MOV (QuickTime)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Caption Preview */}
      {selectedPhrases.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Caption Preview</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedPhrases.map((phrase) => (
              <div
                key={phrase.id}
                className="flex justify-between items-center text-sm"
              >
                <span>&quot;{phrase.text}&quot;</span>
                <span className="text-gray-500">
                  {phrase.start.toFixed(1)}s - {phrase.end.toFixed(1)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPhrases.length === 0 && (
        <div className="text-center py-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <p className="text-yellow-700 dark:text-yellow-400">
            No captions selected for export. Go back to the editor to select phrases.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep('edit')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Back to Editor
          </button>
          <button
            onClick={handleExport}
            disabled={selectedPhrases.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Export (WYSIWYG)
          </button>
          <button
            onClick={handleFastExport}
            disabled={selectedPhrases.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            ⚡ Fast Export
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center">
          WYSIWYG: Exact preview match | Fast: Optimized for speed
        </p>
        
        {/* Debug Test Buttons */}
        <details className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            🔧 Debug Tests (for troubleshooting)
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleTestExport}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <TestTube className="w-4 h-4" />
              Test (No Captions)
            </button>
            <button
              onClick={handleTestCaptionExport}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <TestTube className="w-4 h-4" />
              Test Simple Caption
            </button>
            <button
              onClick={handleDiagnosticTest}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
            >
              <TestTube className="w-4 h-4" />
              Full Diagnostic
            </button>
            <button
              onClick={handleCanvasOnlyExport}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
            >
              <TestTube className="w-4 h-4" />
              Canvas Only (Guaranteed)
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p>Use these to test if FFmpeg is working. Check console for detailed logs.</p>
            <p><strong>Full Diagnostic</strong> runs 4 tests to identify exactly where the export fails.</p>
          </div>
        </details>
      </div>
    </div>
  )
}
