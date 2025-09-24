'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { Move, RotateCcw, ZoomIn, ZoomOut, Maximize2, Minimize2, Link, Unlink, ArrowLeftRight, Play, Pause, Plus } from 'lucide-react'

interface CaptionPosition {
  x: number
  y: number
  fontSize: number
  maxWidth: number // Horizontal width control like Canva
}

export default function InteractiveCaptionEditor() {
  const {
    videoFile,
    getCurrentCaptions,
    updatePhraseStyle,
    syncFontSizeToAll,
    currentTime,
    setExportReadyCaptions,
  } = useAppStore()

  const [isDragging, setIsDragging] = useState(false)
  const [draggedCaptionId, setDraggedCaptionId] = useState<string | null>(null)
  const [isResizingWidth, setIsResizingWidth] = useState(false)
  const [resizingCaptionId, setResizingCaptionId] = useState<string | null>(null)
  const [captionPositions, setCaptionPositions] = useState<Record<string, CaptionPosition>>({})
  const [previewTime, setPreviewTime] = useState(5) // Default preview time
  const [syncFontSizes, setSyncFontSizes] = useState(true) // Sync font sizes by default
  const [syncWidths, setSyncWidths] = useState(true) // Sync widths by default
  const [isPlaying, setIsPlaying] = useState(false)
  const [isEditingId, setIsEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [duration, setDuration] = useState<number>(0)
  const videoUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : ''), [videoFile])

  // Cleanup created object URL when file changes/unmounts
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])
  
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { setCurrentTime, captionMode, updatePhraseText, addCustomCaption, setPreviewCanvasDimensions, setPreviewRenderedVideoDimensions, setPreviewVideoOffsets, videoUrl: storeVideoUrl } = useAppStore()
  const currentCaptions = getCurrentCaptions()
  const selectedCaptions = currentCaptions.filter(c => c.isSelected)
  
  // Get captions active at current preview time
  const activeCaptions = selectedCaptions.filter(c => 
    previewTime >= c.start && previewTime <= c.end
  )

  // Sync previewTime with actual video playback
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTimeUpdate = () => {
      setPreviewTime(video.currentTime)
      setCurrentTime(video.currentTime)
    }
    const onLoadedMetadata = () => {
      setDuration(video.duration || 0)
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [videoRef, setCurrentTime])

  // Report current preview canvas dimensions to store so export can scale correctly
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      setPreviewCanvasDimensions(container.clientWidth, container.clientHeight)
    })
    observer.observe(container)
    // Initial set
    setPreviewCanvasDimensions(container.clientWidth, container.clientHeight)
    return () => observer.disconnect()
  }, [containerRef, setPreviewCanvasDimensions])

  // Measure the actual video render box (letterbox aware) and offsets
  useEffect(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return

    const measure = () => {
      const cw = container.clientWidth
      const ch = container.clientHeight
      const vw = video.videoWidth || cw
      const vh = video.videoHeight || ch
      const scale = Math.min(cw / vw, ch / vh)
      const renderedW = Math.floor(vw * scale)
      const renderedH = Math.floor(vh * scale)
      const offsetX = Math.floor((cw - renderedW) / 2)
      const offsetY = Math.floor((ch - renderedH) / 2)
      setPreviewRenderedVideoDimensions(renderedW, renderedH)
      setPreviewVideoOffsets(offsetX, offsetY)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(container)
    video.addEventListener('loadedmetadata', measure)
    return () => {
      ro.disconnect()
      video.removeEventListener('loadedmetadata', measure)
    }
  }, [containerRef, videoRef, setPreviewRenderedVideoDimensions, setPreviewVideoOffsets])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      const playPromise = video.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => setIsPlaying(true)).catch(() => {
          // Ignore AbortError when source updates or quick scrubs
        })
      } else {
        setIsPlaying(true)
      }
    }
  }

  const scrubTo = (time: number) => {
    const video = videoRef.current
    if (!video) return
    const t = Math.max(0, Math.min(video.duration || 0, time))
    video.currentTime = t
    setPreviewTime(t)
    setCurrentTime(t)
  }

  const handleMouseDown = (captionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDraggedCaptionId(captionId)
  }

  const handleWidthResizeStart = (captionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizingWidth(true)
    setResizingCaptionId(captionId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const containerWidth = rect.width
    const containerHeight = rect.height
    const vw = videoRef.current?.videoWidth || containerWidth
    const vh = videoRef.current?.videoHeight || containerHeight
    const scale = Math.min(containerWidth / vw, containerHeight / vh)
    const renderedW = vw * scale
    const renderedH = vh * scale
    const offsetX = (containerWidth - renderedW) / 2
    const offsetY = (containerHeight - renderedH) / 2

    // Map mouse position to percent within the video box (not the full container)
    const xInBox = ((e.clientX - rect.left - offsetX) / renderedW) * 100
    const yInBox = ((e.clientY - rect.top - offsetY) / renderedH) * 100
    const x = Math.max(0, Math.min(100, xInBox))
    const y = Math.max(0, Math.min(100, yInBox))

    if (isDragging && draggedCaptionId) {
      // Handle position dragging
      setCaptionPositions(prev => ({
        ...prev,
        [draggedCaptionId]: {
          ...prev[draggedCaptionId],
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y))
        }
      }))
    } else if (isResizingWidth && resizingCaptionId) {
      // Handle width resizing
      const currentPos = captionPositions[resizingCaptionId] || { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
      const centerXPercent = currentPos.x
      const centerXpx = (centerXPercent / 100) * renderedW
      const mouseXInBoxPx = Math.max(0, Math.min(renderedW, (x / 100) * renderedW))
      const distanceFromCenterPx = Math.abs(mouseXInBoxPx - centerXpx)
      const newWidth = Math.max(20, Math.min(95, (distanceFromCenterPx * 2 / renderedW) * 100)) // percent of video box

      if (syncWidths) {
        // Update all captions when syncing
        const updatedPositions: Record<string, CaptionPosition> = {}
        selectedCaptions.forEach(caption => {
          const pos = captionPositions[caption.id] || { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
          updatedPositions[caption.id] = { ...pos, maxWidth: newWidth }
        })
        setCaptionPositions(prev => ({ ...prev, ...updatedPositions }))
      } else {
        // Update only the resized caption
        setCaptionPositions(prev => ({
          ...prev,
          [resizingCaptionId]: {
            ...prev[resizingCaptionId],
            maxWidth: newWidth
          }
        }))
      }
    }
  }

  const handleMouseUp = () => {
    if (isDragging && draggedCaptionId) {
      // Update the caption style with new position
      const position = captionPositions[draggedCaptionId]
      if (position) {
        const caption = currentCaptions.find(c => c.id === draggedCaptionId)
        if (caption && caption.style) {
          const newStyle = {
            ...caption.style,
            customX: position.x,
            customY: position.y,
            fontSize: position.fontSize || caption.style.fontSize,
            maxWidth: position.maxWidth
          }
          updatePhraseStyle(draggedCaptionId, newStyle)
        }
      }
    } else if (isResizingWidth && resizingCaptionId) {
      // Update the caption style with new width
      const position = captionPositions[resizingCaptionId]
      if (position) {
        if (syncWidths) {
          // Apply width to all captions when syncing
          selectedCaptions.forEach(caption => {
            if (caption.style) {
              const pos = captionPositions[caption.id] || { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
              const newStyle = {
                ...caption.style,
                maxWidth: position.maxWidth,
                customX: pos.x,
                customY: pos.y
              }
              updatePhraseStyle(caption.id, newStyle)
            }
          })
          console.log(`📏 Drag-synced width to ${position.maxWidth.toFixed(0)}% for all captions`)
        } else {
          // Update only the dragged caption
          const caption = currentCaptions.find(c => c.id === resizingCaptionId)
          if (caption && caption.style) {
            const newStyle = {
              ...caption.style,
              maxWidth: position.maxWidth,
              customX: position.x,
              customY: position.y
            }
            updatePhraseStyle(resizingCaptionId, newStyle)
          }
        }
      }
    }
    
    setIsDragging(false)
    setDraggedCaptionId(null)
    setIsResizingWidth(false)
    setResizingCaptionId(null)
  }

  const adjustFontSize = (captionId: string, delta: number) => {
    const currentPos = captionPositions[captionId] || { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
    const newFontSize = Math.max(12, Math.min(72, currentPos.fontSize + delta))
    
    if (syncFontSizes) {
      // Update all captions to the same font size
      const updatedPositions: Record<string, CaptionPosition> = {}
      selectedCaptions.forEach(caption => {
        const pos = captionPositions[caption.id] || { x: 50, y: 85, fontSize: 24 }
        updatedPositions[caption.id] = { ...pos, fontSize: newFontSize }
        
        // Update each caption's style
        if (caption.style) {
          const newStyle = {
            ...caption.style,
            fontSize: newFontSize,
            customX: pos.x,
            customY: pos.y,
            maxWidth: pos.maxWidth
          }
          updatePhraseStyle(caption.id, newStyle)
        }
      })
      
      setCaptionPositions(prev => ({ ...prev, ...updatedPositions }))
      console.log(`📏 Synced font size to ${newFontSize}px for all ${selectedCaptions.length} captions`)
    } else {
      // Update only the specific caption
      setCaptionPositions(prev => ({
        ...prev,
        [captionId]: { ...currentPos, fontSize: newFontSize }
      }))

      // Update the caption style
      const caption = currentCaptions.find(c => c.id === captionId)
      if (caption && caption.style) {
        const newStyle = {
          ...caption.style,
          fontSize: newFontSize,
          customX: currentPos.x,
          customY: currentPos.y,
          maxWidth: currentPos.maxWidth
        }
        updatePhraseStyle(captionId, newStyle)
      }
      console.log(`📏 Updated font size to ${newFontSize}px for "${caption?.text}"`)
    }
  }

  const resetPosition = (captionId: string) => {
    setCaptionPositions(prev => ({
      ...prev,
      [captionId]: { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
    }))

    const caption = currentCaptions.find(c => c.id === captionId)
    if (caption && caption.style) {
      const newStyle = {
        ...caption.style,
        customX: undefined,
        customY: undefined,
        fontSize: 24,
        maxWidth: undefined
      }
      updatePhraseStyle(captionId, newStyle)
    }
  }

  const adjustWidth = (captionId: string, delta: number) => {
    const currentPos = captionPositions[captionId] || { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
    const newWidth = Math.max(20, Math.min(95, currentPos.maxWidth + delta))
    
    if (syncWidths) {
      // Update all captions to the same width
      const updatedPositions: Record<string, CaptionPosition> = {}
      selectedCaptions.forEach(caption => {
        const pos = captionPositions[caption.id] || { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
        updatedPositions[caption.id] = { ...pos, maxWidth: newWidth }
        
        // Update each caption's style
        if (caption.style) {
          const newStyle = {
            ...caption.style,
            maxWidth: newWidth,
            customX: pos.x,
            customY: pos.y
          }
          updatePhraseStyle(caption.id, newStyle)
        }
      })
      
      setCaptionPositions(prev => ({ ...prev, ...updatedPositions }))
      console.log(`📏 Synced width to ${newWidth}% for all ${selectedCaptions.length} captions`)
    } else {
      // Update only the specific caption
      setCaptionPositions(prev => ({
        ...prev,
        [captionId]: { ...currentPos, maxWidth: newWidth }
      }))

      // Update the caption style
      const caption = currentCaptions.find(c => c.id === captionId)
      if (caption && caption.style) {
        const newStyle = {
          ...caption.style,
          maxWidth: newWidth,
          customX: currentPos.x,
          customY: currentPos.y
        }
        updatePhraseStyle(captionId, newStyle)
      }
      console.log(`📏 Adjusted width to ${newWidth}% for "${caption?.text.substring(0, 20)}..."`)
    }
  }

  // Initialize positions for active captions
  useEffect(() => {
    activeCaptions.forEach(caption => {
      if (!captionPositions[caption.id]) {
        setCaptionPositions(prev => ({
          ...prev,
          [caption.id]: {
            x: caption.style?.customX || 50,
            y: caption.style?.customY || 85,
            fontSize: caption.style?.fontSize || 24,
            maxWidth: caption.style?.maxWidth || 80
          }
        }))
      }
    })
  }, [activeCaptions, captionPositions])

  // Update export-ready captions whenever positions change
  useEffect(() => {
    const exportReadyCaptions = currentCaptions.map(caption => {
      const position = captionPositions[caption.id]
      if (position) {
        return {
          ...caption,
          style: {
            ...caption.style,
            customX: position.x,
            customY: position.y,
            fontSize: position.fontSize,
            maxWidth: position.maxWidth,
            // Ensure all required style properties exist
            id: caption.style?.id || 'custom',
            name: caption.style?.name || 'Custom Style',
            fontFamily: caption.style?.fontFamily || 'Arial',
            fontWeight: caption.style?.fontWeight || 'bold',
            color: caption.style?.color || '#ffffff',
            textAlign: caption.style?.textAlign || 'center',
            position: caption.style?.position || 'bottom'
          }
        }
      }
      return caption
    })
    setExportReadyCaptions(exportReadyCaptions)
    console.log('🎯 LIVE EXPORT UPDATE - Current editor state:', exportReadyCaptions.map(c => ({
      text: c.text.substring(0, 30) + '...',
      isSelected: c.isSelected,
      fontSize: c.style?.fontSize,
      customX: c.style?.customX?.toFixed(1),
      customY: c.style?.customY?.toFixed(1),
      maxWidth: c.style?.maxWidth?.toFixed(1)
    })))
  }, [captionPositions, currentCaptions, setExportReadyCaptions])

  if (!videoFile) {
    return (
      <div className="text-center py-8 text-gray-500">
        Upload a video to use the interactive caption editor
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <Move className="w-5 h-5 text-green-500" />
          Interactive Caption Editor
        </h4>
        <div className="flex items-center gap-4">
          {/* Control Toggles */}
          <div className="flex gap-2">
            <button
              onClick={() => setSyncFontSizes(!syncFontSizes)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                syncFontSizes
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {syncFontSizes ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
              Size
            </button>
            <button
              onClick={() => setSyncWidths(!syncWidths)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                syncWidths
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              Width
            </button>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="px-2 py-1 rounded border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max={duration || 30}
              step="0.05"
              value={previewTime}
              onChange={(e) => scrubTo(parseFloat(e.target.value))}
              className="w-40"
            />
            <span className="text-sm text-gray-500 w-16">
              {previewTime.toFixed(1)}s
            </span>
            <button
              onClick={() => addCustomCaption('New text', previewTime, previewTime + 2)}
              className="ml-2 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs flex items-center gap-1"
              title="Add text layer at playhead"
            >
              <Plus className="w-3 h-3" /> Add Text
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Preview */}
      <div
        ref={containerRef}
        className="relative bg-black rounded-lg overflow-hidden aspect-video cursor-crosshair interactive-caption-canvas"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          // Toggle playback when clicking empty canvas area (avoid when dragging or editing)
          if (isDragging || isEditingId) return
          // Ignore clicks on caption elements (they call stopPropagation on mousedown already)
          if (e.currentTarget === e.target) {
            togglePlay()
          }
        }}
      >
        {/* Video Background */}
        {videoFile && (
          <video
            ref={videoRef}
            src={storeVideoUrl || videoUrl}
            className="w-full h-full object-contain"
            muted
            playsInline
            preload="metadata"
            onLoadedData={() => {
              const v = videoRef.current
              if (v && !Number.isNaN(v.duration)) {
                setDuration(v.duration)
              }
            }}
            onError={(e) => {
              console.error('Interactive editor video failed to load', e)
            }}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Interactive Captions */}
        {activeCaptions.map((caption) => {
          const position = captionPositions[caption.id] || { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
          // Ensure maxWidth is always defined
          const safePosition = {
            ...position,
            maxWidth: position.maxWidth ?? 80
          }
          const style = caption.style || {
            id: 'default',
            name: 'Default',
            fontFamily: 'Arial',
            fontSize: 24,
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center' as const,
            position: 'bottom' as const
          }

          // Canva-style text wrapping - natural flow within container
          const containerWidth = containerRef.current?.offsetWidth || 500
          const containerHeight = containerRef.current?.offsetHeight || 281
          const vw = videoRef.current?.videoWidth || containerWidth
          const vh = videoRef.current?.videoHeight || containerHeight
          const scale = Math.min(containerWidth / vw, containerHeight / vh)
          const renderedW = vw * scale
          const renderedH = vh * scale
          const offsetX = (containerWidth - renderedW) / 2
          const offsetY = (containerHeight - renderedH) / 2

          // Convert stored percentage positions (relative to container center) to pixel in video box
          const maxWidthPx = (safePosition.maxWidth / 100) * renderedW
          
          // Create temporary canvas to measure text exactly like Canva
          const tempCanvas = document.createElement('canvas')
          const tempCtx = tempCanvas.getContext('2d')
          let wrappedLines: string[] = []
          
          if (tempCtx) {
            tempCtx.font = `${style.fontWeight} ${safePosition.fontSize}px ${style.fontFamily}`
            
            // Canva-style text wrapping algorithm
            const words = caption.text.split(' ')
            let currentLine = ''
            
            for (let i = 0; i < words.length; i++) {
              const word = words[i]
              const testLine = currentLine === '' ? word : `${currentLine} ${word}`
              const testWidth = tempCtx.measureText(testLine).width
              
              if (testWidth <= maxWidthPx) {
                // Word fits, add to current line
                currentLine = testLine
              } else {
                // Word doesn't fit
                if (currentLine !== '') {
                  // Save current line and start new one with this word
                  wrappedLines.push(currentLine)
                  currentLine = word
                } else {
                  // Single word is too long, force it on its own line
                  wrappedLines.push(word)
                  currentLine = ''
                }
              }
            }
            
            // Add the last line if it has content
            if (currentLine !== '') {
              wrappedLines.push(currentLine)
            }
          } else {
            // Fallback to simple wrapping
            wrappedLines = [caption.text]
          }

          const isSelected = draggedCaptionId === caption.id || resizingCaptionId === caption.id
          const textBoxWidth = `${safePosition.maxWidth}%`
          
          return (
            <div
              key={caption.id}
              className={`absolute select-none ${isSelected ? 'z-20' : 'z-10'}`}
              style={{
                left: `calc(${offsetX}px + ${(position.x / 100) * renderedW}px)`,
                top: `calc(${offsetY}px + ${(position.y / 100) * renderedH}px)`,
                transform: 'translate(-50%, -50%)',
                width: `${(safePosition.maxWidth / 100) * renderedW}px`,
                minHeight: '40px',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onMouseDown={(e) => handleMouseDown(caption.id, e)}
            >
              {/* Canva-style Text Container with visible border & inline editing */}
              <div
                className={`relative w-full h-full flex items-center justify-center transition-all duration-200 ${
                  isSelected 
                    ? 'border-2 border-blue-500' 
                    : 'border border-dashed border-gray-400 opacity-70 hover:opacity-100 hover:border-gray-500'
                }`}
                style={{
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  minHeight: '40px',
                  padding: '10px 14px',
                  boxShadow: isSelected 
                    ? '0 4px 16px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(2px)'
                }}
              >
                {/* Actual text content (inline editable) */}
                <div
                  contentEditable={isEditingId === caption.id}
                  suppressContentEditableWarning
                  onInput={(e) => {
                    const val = (e.currentTarget.textContent || '').trim()
                    setEditingText(val)
                    // Commit live edits to store immediately so export can't be stale
                    updatePhraseText(caption.id, val)
                  }}
                  onBlur={() => {
                    if (isEditingId === caption.id) {
                      updatePhraseText(caption.id, editingText || caption.text)
                      setIsEditingId(null)
                    }
                  }}
                  onClick={(e) => {
                    if (isEditingId !== caption.id) {
                      e.stopPropagation()
                      setIsEditingId(caption.id)
                      setEditingText(caption.text)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (isEditingId === caption.id) {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        updatePhraseText(caption.id, editingText || caption.text)
                        setIsEditingId(null)
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        setIsEditingId(null)
                      }
                    }
                  }}
                  style={{
                    fontSize: `${safePosition.fontSize}px`,
                    fontFamily: style.fontFamily,
                    fontWeight: style.fontWeight,
                    color: style.color,
                    backgroundColor: style.backgroundColor || 'transparent',
                    padding: style.backgroundColor ? '4px 8px' : '0px',
                    borderRadius: style.backgroundColor ? `${style.backgroundRadius ?? 4}px` : '0px',
                    textShadow: style.backgroundColor
                      ? 'none'
                      : `${style.shadowOffsetX ?? 2}px ${style.shadowOffsetY ?? 2}px ${style.shadowBlur ?? 4}px ${style.shadowColor ?? 'rgba(0,0,0,0.8)'}`,
                    textAlign: style.textAlign,
                    letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    lineHeight: `${style.lineHeight ?? 1.2}`,
                    opacity: style.opacity ?? 1,
                    width: '100%'
                  }}
                >
                  {/* Wrapped text display (fallback to live value when editing) */}
                  {isEditingId === caption.id
                    ? (editingText || caption.text)
                    : wrappedLines.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                </div>
                
                {/* Canva-style Width Resize Handles */}
                {isSelected && (
                  <>
                    {/* Left resize handle (Canva-style) */}
                    <div
                      className="absolute top-1/2 -left-2 w-4 h-8 bg-white border-2 border-blue-500 rounded cursor-ew-resize transform -translate-y-1/2 hover:bg-blue-50 transition-colors flex items-center justify-center"
                      onMouseDown={(e) => handleWidthResizeStart(caption.id, e)}
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="w-0.5 h-1 bg-blue-500 rounded-full"></div>
                        <div className="w-0.5 h-1 bg-blue-500 rounded-full"></div>
                        <div className="w-0.5 h-1 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    
                    {/* Right resize handle (Canva-style) */}
                    <div
                      className="absolute top-1/2 -right-2 w-4 h-8 bg-white border-2 border-blue-500 rounded cursor-ew-resize transform -translate-y-1/2 hover:bg-blue-50 transition-colors flex items-center justify-center"
                      onMouseDown={(e) => handleWidthResizeStart(caption.id, e)}
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="w-0.5 h-1 bg-blue-500 rounded-full"></div>
                        <div className="w-0.5 h-1 bg-blue-500 rounded-full"></div>
                        <div className="w-0.5 h-1 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    
                    {/* Corner selection indicators (like Canva) */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm"></div>
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm"></div>
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm"></div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm"></div>
                    
                    {/* Top and bottom center handles for height indication */}
                    <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm"></div>
                    <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm"></div>
                    
                    {/* Width indicator tooltip */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                      {safePosition.maxWidth.toFixed(0)}% width
                    </div>
                  </>
                )}
              </div>
              
              {/* Font Size Controls (when selected) */}
              {isSelected && (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex gap-1 bg-white dark:bg-gray-800 rounded shadow-lg px-2 py-1 border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      adjustFontSize(caption.id, -2)
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400">
                    {position.fontSize}px
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      adjustFontSize(caption.id, 2)
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      resetPosition(caption.id)
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Instructions Overlay */}
        {activeCaptions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white bg-black/50 p-4 rounded-lg">
              <p className="text-sm mb-2">No captions active at {previewTime.toFixed(1)}s</p>
              <p className="text-xs text-gray-300">
                Adjust the preview time slider or select captions with timing that includes this moment
              </p>
            </div>
          </div>
        )}

        {activeCaptions.length > 0 && !isDragging && (
          <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-xs space-y-1">
            <p>💡 Drag captions to reposition • Click to resize</p>
            <p className="text-green-300">🎯 WYSIWYG: Export matches preview exactly</p>
          </div>
        )}

        {/* Center Play/Pause Overlay */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); togglePlay() }}
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 flex items-center justify-center transition-colors"
          style={{ pointerEvents: 'auto', top: 'calc(50% - 28px)', left: 'calc(50% - 28px)' }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-1" />}
        </button>
      </div>

      {/* Caption Controls */}
      {activeCaptions.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium">Active Captions at {previewTime.toFixed(1)}s</h5>
            <div className="flex items-center gap-2 text-xs">
              {syncFontSizes ? (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Link className="w-3 h-3" />
                  Sizes synced
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500">
                  <Unlink className="w-3 h-3" />
                  Individual sizes
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            {activeCaptions.map((caption) => {
              const position = captionPositions[caption.id] || { x: 50, y: 85, fontSize: 24, maxWidth: 80 }
              // Ensure all properties are defined
              const safePosition = {
                ...position,
                maxWidth: position.maxWidth ?? 80,
                fontSize: position.fontSize ?? 24
              }
              return (
                <div
                  key={caption.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border"
                >
                  <span className="text-sm font-medium flex-1 mr-2">
                    &quot;{caption.text.substring(0, 30)}{caption.text.length > 30 ? '...' : ''}&quot;
                  </span>
                  <div className="flex items-center gap-3">
                    {/* Font Size Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustFontSize(caption.id, -2)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title={syncFontSizes ? 'Decrease size for all captions' : 'Decrease size for this caption'}
                      >
                        <Minimize2 className="w-3 h-3" />
                      </button>
                      <span className="text-xs text-gray-500 w-8 text-center">
                        {safePosition.fontSize}px
                      </span>
                      <button
                        onClick={() => adjustFontSize(caption.id, 2)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title={syncFontSizes ? 'Increase size for all captions' : 'Increase size for this caption'}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Width Controls */}
                    <div className="flex items-center gap-1 border-l pl-2">
                      <button
                        onClick={() => adjustWidth(caption.id, -5)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title={syncWidths ? 'Decrease width for all captions (more lines)' : 'Decrease width for this caption (more lines)'}
                      >
                        <span className="text-xs">←</span>
                      </button>
                      <span className="text-xs text-gray-500 w-10 text-center">
                        {safePosition.maxWidth.toFixed(0)}%
                      </span>
                      <button
                        onClick={() => adjustWidth(caption.id, 5)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title={syncWidths ? 'Increase width for all captions (fewer lines)' : 'Increase width for this caption (fewer lines)'}
                      >
                        <span className="text-xs">→</span>
                      </button>
                    </div>
                    
                    <button
                      onClick={() => resetPosition(caption.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-red-500"
                      title="Reset position, size, and width"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Global Font Size Control */}
          {syncFontSizes && selectedCaptions.length > 1 && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Global Font Size
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const avgSize = Math.round(
                        selectedCaptions.reduce((sum, c) => {
                          const pos = captionPositions[c.id] || { x: 50, y: 85, fontSize: 24 }
                          return sum + pos.fontSize
                        }, 0) / selectedCaptions.length
                      )
                      adjustFontSize(selectedCaptions[0].id, -2)
                    }}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm w-12 text-center">
                    {Math.round(
                      selectedCaptions.reduce((sum, c) => {
                        const pos = captionPositions[c.id] || { x: 50, y: 85, fontSize: 24 }
                        return sum + pos.fontSize
                      }, 0) / selectedCaptions.length
                    )}px
                  </span>
                  <button
                    onClick={() => adjustFontSize(selectedCaptions[0].id, 2)}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 Adjusting any caption size will sync all {selectedCaptions.length} captions to the same size
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Interactive Controls:</p>
            <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-300">
              <li>• <strong>Drag captions</strong> to reposition them anywhere on the video</li>
              <li>• <strong>Click caption</strong> to show resize controls</li>
              <li>• <strong>Toggle sync mode</strong> to change all captions at once or individually</li>
              <li>• <strong>Auto text wrapping</strong> prevents overflow and breaks long text into lines</li>
              <li>• <strong>Smart font sizing</strong> automatically reduces size if text doesn&apos;t fit</li>
              <li>• <strong>Safe area margins</strong> keep text within video boundaries</li>
              <li>• <strong>Reset button</strong> restores default position and size</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
