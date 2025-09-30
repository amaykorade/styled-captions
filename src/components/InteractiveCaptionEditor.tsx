'use client'

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
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
    setSelectedPhraseId,
    selectedPhraseId,
    togglePhraseSelection,
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
  const selectionRangesRef = useRef<Record<string, { start: number; end: number }>>({})
  const textareaRefsRef = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const [pickerColorById, setPickerColorById] = useState<Record<string, string>>({})
  const videoUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : ''), [videoFile])

  // Helpers for rich-text tags
  const stripColorTags = (text: string): string =>
    text
      // Remove any opening [color=...] tag (case-insensitive, tolerant of spaces/malformed hex)
      .replace(/\[\s*color[^\]]*\]/gi, '')
      // Remove any closing [/color] tag (case-insensitive)
      .replace(/\[\s*\/\s*color\s*\]/gi, '')

  // Map a plain-text index (tags stripped) to the equivalent index in the rich-text string
  const mapPlainToRichIndex = (rich: string, targetPlainIndex: number): number => {
    let plainIndex = 0
    for (let i = 0; i < rich.length; i++) {
      // Detect [color=#xxxxxx] ... ] tag start
      if (rich[i] === '[') {
        const open = rich.slice(i).match(/^\[color=\s*(#[0-9a-fA-F]{6})\s*\]/)
        const close = !open && rich.slice(i).match(/^\[\/color\]/)
        if (open) {
          i += open[0].length - 1
          continue
        }
        if (close) {
          i += close[0].length - 1
          continue
        }
      }
      if (plainIndex === targetPlainIndex) {
        return i
      }
      plainIndex++
    }
    return rich.length
  }

  const wrapSelectionWithColor = (rich: string, startPlain: number, endPlain: number, color: string): string => {
    const startRich = mapPlainToRichIndex(rich, startPlain)
    const endRich = mapPlainToRichIndex(rich, endPlain)
    const selectedRich = rich.slice(startRich, endRich)
    const cleanSelected = stripColorTags(selectedRich)
    return rich.slice(0, startRich) + `[color=${color}]` + cleanSelected + `[/color]` + rich.slice(endRich)
  }

  type Segment = { text: string; color?: string }
  const parseRichToSegments = (rich: string): Segment[] => {
    const segments: Segment[] = []
    let i = 0
    let currentColor: string | undefined = undefined
    while (i < rich.length) {
      if (rich[i] === '[') {
        const open = rich.slice(i).match(/^\[color=\s*(#[0-9a-fA-F]{6})\s*\]/)
        const close = !open && rich.slice(i).match(/^\[\/color\]/)
        if (open) { currentColor = open[1]; i += open[0].length; continue }
        if (close) { currentColor = undefined; i += close[0].length; continue }
      }
      // accumulate plain run until next tag
      let j = i
      while (j < rich.length && rich[j] !== '[') j++
      const chunk = rich.slice(i, j)
      if (chunk) segments.push({ text: chunk, color: currentColor })
      i = j
    }
    return segments
  }

  const rebuildRichFromSegments = (segments: Segment[]): string => {
    return segments.map(seg => seg.color ? `[color=${seg.color}]${seg.text}[/color]` : seg.text).join('')
  }

  const applyColorToPlainRange = (rich: string, startPlain: number, endPlain: number, color: string): string => {
    const segments = parseRichToSegments(rich)
    const result: Segment[] = []
    let plainPos = 0
    for (const seg of segments) {
      const segStart = plainPos
      const segEnd = plainPos + seg.text.length
      if (endPlain <= segStart || startPlain >= segEnd) {
        // no overlap
        result.push(seg)
      } else {
        // overlap; split into up to three
        const leftLen = Math.max(0, startPlain - segStart)
        const midLen = Math.min(segEnd, endPlain) - Math.max(segStart, startPlain)
        const rightLen = Math.max(0, segEnd - endPlain)
        if (leftLen > 0) result.push({ text: seg.text.slice(0, leftLen), color: seg.color })
        if (midLen > 0) result.push({ text: seg.text.slice(leftLen, leftLen + midLen), color })
        if (rightLen > 0) result.push({ text: seg.text.slice(leftLen + midLen), color: seg.color })
      }
      plainPos = segEnd
    }
    return rebuildRichFromSegments(result)
  }

  // Render caption text honoring valid [color=#xxxxxx]...[/color] pairs only; any stray tags are stripped
  const renderRichTextWithColors = (text: string, fallbackColor: string): ReactNode => {
    const out: ReactNode[] = []
    let i = 0
    let key = 0
    const pushPlain = (s: string) => {
      const cleaned = stripColorTags(s)
      if (cleaned) out.push(<span key={`p${key++}`} style={{ color: fallbackColor }}>{cleaned}</span>)
    }
    while (i < text.length) {
      // Newline
      if (text[i] === '\n') { out.push(<br key={`br${key++}`} />); i++; continue }
      // Try open tag
      if (text[i] === '[') {
        const openMatch = text.slice(i).match(/^\[color=\s*(#[0-9a-fA-F]{6})\s*\]/)
        const closeMatch = !openMatch && text.slice(i).match(/^\[\/color\]/)
        if (openMatch) {
          const color = openMatch[1]
          const openLen = openMatch[0].length
          const contentStart = i + openLen
          // Find closing tag
          const closeIdx = text.slice(contentStart).indexOf('[/color]')
          if (closeIdx >= 0) {
            // Push nothing before because open starts exactly at i; consume up to open start already handled
            const coloredContent = stripColorTags(text.slice(contentStart, contentStart + closeIdx))
            if (coloredContent) out.push(<span key={`c${key++}`} style={{ color }}>{coloredContent}</span>)
            i = contentStart + closeIdx + '[/color]'.length
            continue
          } else {
            // No valid closing tag; strip the open tag and continue rendering plain
            i = contentStart
            continue
          }
        }
        if (closeMatch) {
          // Stray close tag; strip it
          i += closeMatch[0].length
          continue
        }
      }
      // Accumulate plain until next '[' or '\n'
      let j = i
      while (j < text.length && text[j] !== '[' && text[j] !== '\n') j++
      pushPlain(text.slice(i, j))
      i = j
    }
    return <>{out}</>
  }

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
  
  // Captions whose timing window includes the current preview time (regardless of show/hide)
  const timeCaptions = currentCaptions.filter(c => 
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
        // Reset to clean default style, removing per-word colors and any overrides
        id: 'default',
        name: 'Default',
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center' as const,
        position: 'bottom' as const,
        customX: undefined,
        customY: undefined,
        maxWidth: undefined,
        letterSpacing: undefined,
        lineHeight: undefined,
        opacity: undefined,
        shadowColor: undefined,
        shadowBlur: undefined,
        shadowOffsetX: undefined,
        shadowOffsetY: undefined,
        outlineColor: undefined,
        outlineWidth: undefined,
        backgroundColor: undefined,
        backgroundPadding: undefined,
        backgroundRadius: undefined
      }
      updatePhraseStyle(captionId, newStyle)
      // Also strip any inline color tags from the caption text
      const plain = stripColorTags(caption.text)
      updatePhraseText(captionId, plain)
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

  // Initialize positions for captions visible at current time (even if hidden on canvas)
  useEffect(() => {
    timeCaptions.forEach(caption => {
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
  }, [timeCaptions, captionPositions])

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
      <div className="">
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 shadow-sm">

          {/* Group: Sync Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSyncFontSizes(!syncFontSizes)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                syncFontSizes
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
              title={syncFontSizes ? 'Sizes synced across captions' : 'Edit sizes individually'}
            >
              {syncFontSizes ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
              Size
            </button>
            <button
              onClick={() => setSyncWidths(!syncWidths)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                syncWidths
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
              title={syncWidths ? 'Widths synced across captions' : 'Edit widths individually'}
            >
              <ArrowLeftRight className="w-3 h-3" />
              Width
            </button>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-gray-200 dark:bg-gray-700" />

          {/* Group: Quick controls for selected caption */}
          <div className="hidden md:flex items-center gap-3">
            {selectedPhraseId && (
              <>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustFontSize(selectedPhraseId, -2)}
                    className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                    title="Decrease font size"
                  >
                    A-
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[36px] text-center">
                    {(() => {
                      const pos = captionPositions[selectedPhraseId] || { fontSize: 24 }
                      return `${pos.fontSize ?? 24}px`
                    })()}
                  </span>
                  <button
                    onClick={() => adjustFontSize(selectedPhraseId, 2)}
                    className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                    title="Increase font size"
                  >
                    A+
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustWidth(selectedPhraseId, -5)}
                    className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                    title="Decrease text box width"
                  >
                    ←
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[40px] text-center">
                    {(() => {
                      const pos = captionPositions[selectedPhraseId] || { maxWidth: 80 }
                      return `${(pos.maxWidth ?? 80).toFixed(0)}%`
                    })()}
                  </span>
                  <button
                    onClick={() => adjustWidth(selectedPhraseId, 5)}
                    className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                    title="Increase text box width"
                  >
                    →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-gray-200 dark:bg-gray-700" />

          {/* Group: Playback & Time */}
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={togglePlay}
              className="px-2 py-1 rounded border bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
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
              className="w-full max-w-sm"
            />
            <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300 w-16 text-right">
              {previewTime.toFixed(1)}s
            </span>
          </div>

          {/* Group: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => addCustomCaption('New text', previewTime, previewTime + 2)}
              className="px-2 py-1 rounded bg-black text-white dark:bg-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200 text-xs flex items-center gap-1"
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

        {/* Interactive Captions (only those marked to show) */}
        {timeCaptions.filter(c => c.isSelected).map((caption) => {
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
            // Remove [color=...] and [/color] tags from measurement text before wrapping
            const plainText = caption.text.replace(/\[\/?color[^\]]*\]/g, '')
            // Respect explicit newlines: split text into paragraphs and wrap each
            const paragraphs = plainText.split('\n')
            for (let p = 0; p < paragraphs.length; p++) {
              const words = paragraphs[p].split(' ')
              let currentLine = ''
              for (let i = 0; i < words.length; i++) {
                const word = words[i]
                const testLine = currentLine === '' ? word : `${currentLine} ${word}`
                const testWidth = tempCtx.measureText(testLine).width
                if (testWidth <= maxWidthPx) {
                  currentLine = testLine
                } else {
                  if (currentLine !== '') {
                    wrappedLines.push(currentLine)
                    currentLine = word
                  } else {
                    wrappedLines.push(word)
                    currentLine = ''
                  }
                }
              }
              if (currentLine !== '') {
                wrappedLines.push(currentLine)
              }
              // If not the last paragraph, add an empty line to represent the newline
              if (p < paragraphs.length - 1) {
                wrappedLines.push('')
              }
            }
          } else {
            // Fallback to simple wrapping
            wrappedLines = [caption.text]
          }

          const isSelected = selectedPhraseId === caption.id || draggedCaptionId === caption.id || resizingCaptionId === caption.id
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
              onClick={(e) => {
                e.stopPropagation()
                setSelectedPhraseId(caption.id)
              }}
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
                  contentEditable={false}
                  suppressContentEditableWarning
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
                  {/* Wrapped text display with inline color support */}
                  {renderRichTextWithColors(caption.text, style.color)}
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

        {/* Removed instructional overlays for a cleaner canvas */}

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

      {/* Caption Controls (always show controls for time-matching captions) */}
      {timeCaptions.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium">Captions at {previewTime.toFixed(1)}s</h5>
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
            {timeCaptions.map((caption) => {
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
                  <textarea
                    value={stripColorTags(caption.text)}
                    onChange={(e) => updatePhraseText(caption.id, e.target.value)}
                    className="flex-1 mr-2 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[36px]"
                    placeholder="Edit caption text… (Enter for new line)"
                    rows={2}
                    ref={(el) => {
                      if (!el) return
                      textareaRefsRef.current[caption.id] = el
                      const handler = () => {
                        selectionRangesRef.current[caption.id] = {
                          start: el.selectionStart || 0,
                          end: el.selectionEnd || 0,
                        }
                      }
                      el.addEventListener('select', handler)
                      el.addEventListener('mouseup', handler)
                      el.addEventListener('keyup', handler)
                    }}
                  />
                  <div className="flex items-center gap-3">
                    {/* Show/Hide toggle */}
                    <label className="inline-flex items-center gap-1 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={caption.isSelected}
                        onChange={() => togglePhraseSelection(caption.id)}
                        className="accent-blue-600"
                      />
                      <span className="text-gray-700 dark:text-gray-200">Show</span>
                    </label>
                    {/* Color picker for selected range */}
                    <input
                      type="color"
                      value={pickerColorById[caption.id] || '#ffffff'}
                      onChange={(e) => {
                        const color = e.target.value
                        setPickerColorById(prev => ({ ...prev, [caption.id]: color }))
                        // Apply color wrap only once per change (avoid partial hex while dragging)
                        const hexOk = /^#[0-9a-fA-F]{6}$/.test(color)
                        if (!hexOk) return
                        // Always try to read the freshest selection from the textarea element
                        const ta = textareaRefsRef.current[caption.id]
                        let range = selectionRangesRef.current[caption.id]
                        if (ta && typeof ta.selectionStart === 'number' && typeof ta.selectionEnd === 'number') {
                          range = { start: ta.selectionStart, end: ta.selectionEnd }
                          selectionRangesRef.current[caption.id] = range
                        }
                        if (!range || range.start === range.end) return
                        // Wrap selected range on the rich string using mapped indices, preserving previous colors
                        // Robust segment-based application to preserve and override colors precisely
                        const updated = applyColorToPlainRange(caption.text, range.start, range.end, color)
                        updatePhraseText(caption.id, updated)
                      }}
                      className="w-7 h-7 rounded overflow-hidden border border-gray-300 dark:border-gray-600"
                      title="Apply color to selected text"
                    />
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

      
    </div>
  )
}
