import { create } from 'zustand'

export interface Transcript {
  text: string
  start: number
  end: number
  confidence?: number
}

export interface CaptionStyle {
  id: string
  name: string
  fontFamily: string
  fontSize: number
  fontWeight: string
  color: string
  backgroundColor?: string
  textAlign: 'left' | 'center' | 'right'
  position: 'top' | 'center' | 'bottom'
  animation?: 'none' | 'fadeIn' | 'slideUp' | 'typewriter'
  // Custom positioning (percentage-based)
  customX?: number
  customY?: number
  // Text box width control (percentage-based)
  maxWidth?: number
}

export interface KeyPhrase {
  id: string
  text: string
  start: number
  end: number
  isSelected: boolean
  style?: CaptionStyle
  reason?: string
  priority?: number
}

interface AppState {
  // Video state
  videoFile: File | null
  videoUrl: string | null
  videoDuration: number
  
  // Transcription state
  transcript: Transcript[]
  isTranscribing: boolean
  transcriptionError: string | null
  
  // Key phrases
  keyPhrases: KeyPhrase[]
  selectedPhrases: string[]
  
  // Caption mode
  captionMode: 'key-phrases' | 'full-transcript'
  fullTranscriptCaptions: KeyPhrase[]
  
  // Export-ready captions with real-time positioning
  exportReadyCaptions: KeyPhrase[]
  
  // Export state
  isExporting: boolean
  exportProgress: number
  exportedVideoUrl: string | null
  
  // UI state
  currentStep: 'upload' | 'transcribe' | 'edit' | 'export'
  currentTime: number
  previewCanvasWidth?: number
  previewCanvasHeight?: number
  previewRenderedVideoWidth?: number
  previewRenderedVideoHeight?: number
  previewVideoOffsetX?: number // px within canvas/container
  previewVideoOffsetY?: number // px within canvas/container
}

interface AppActions {
  // Video actions
  setVideoFile: (file: File | null) => void
  setVideoDuration: (duration: number) => void
  
  // Transcription actions
  setTranscript: (transcript: Transcript[]) => void
  setIsTranscribing: (isTranscribing: boolean) => void
  setTranscriptionError: (error: string | null) => void
  
  // Key phrases actions
  setKeyPhrases: (phrases: KeyPhrase[]) => void
  togglePhraseSelection: (phraseId: string) => void
  updatePhraseStyle: (phraseId: string, style: CaptionStyle) => void
  updatePhraseText: (phraseId: string, text: string) => void
  applyStyleToAll: (style: CaptionStyle) => void
  applyStyleToSelected: (style: CaptionStyle) => void
  syncFontSizeToAll: (fontSize: number) => void
  
  // Caption mode actions
  setCaptionMode: (mode: 'key-phrases' | 'full-transcript') => void
  setFullTranscriptCaptions: (captions: KeyPhrase[]) => void
  addCustomCaption: (text: string, start: number, end: number) => void
  getCurrentCaptions: () => KeyPhrase[]
  
  // Export with real-time state
  getExportReadyCaptions: () => KeyPhrase[]
  setExportReadyCaptions: (captions: KeyPhrase[]) => void
  
  // Export actions
  setIsExporting: (isExporting: boolean) => void
  setExportProgress: (progress: number) => void
  setExportedVideoUrl: (url: string | null) => void
  
  // UI actions
  setCurrentStep: (step: AppState['currentStep']) => void
  setCurrentTime: (time: number) => void
  setPreviewCanvasDimensions: (width: number, height: number) => void
  setPreviewRenderedVideoDimensions: (width: number, height: number) => void
  setPreviewVideoOffsets: (offsetX: number, offsetY: number) => void
  
  // Reset
  reset: () => void
}

const initialState: AppState = {
  videoFile: null,
  videoUrl: null,
  videoDuration: 0,
  transcript: [],
  isTranscribing: false,
  transcriptionError: null,
  keyPhrases: [],
  selectedPhrases: [],
  captionMode: 'key-phrases',
  fullTranscriptCaptions: [],
  exportReadyCaptions: [],
  isExporting: false,
  exportProgress: 0,
  exportedVideoUrl: null,
  currentStep: 'upload',
  currentTime: 0,
  previewCanvasWidth: undefined,
  previewCanvasHeight: undefined,
  previewRenderedVideoWidth: undefined,
  previewRenderedVideoHeight: undefined,
  previewVideoOffsetX: undefined,
  previewVideoOffsetY: undefined,
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,
  
  setVideoFile: (file) => {
    const videoUrl = file ? URL.createObjectURL(file) : null
    set({ 
      videoFile: file, 
      videoUrl,
      currentStep: file ? 'transcribe' : 'upload'
    })
  },
  
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  
  setTranscript: (transcript) => set({ transcript }),
  setIsTranscribing: (isTranscribing) => set({ isTranscribing }),
  setTranscriptionError: (error) => set({ transcriptionError: error }),
  
  setKeyPhrases: (keyPhrases) => set({ keyPhrases }),
  
  togglePhraseSelection: (phraseId) => set((state) => ({
    keyPhrases: state.keyPhrases.map(phrase =>
      phrase.id === phraseId
        ? { ...phrase, isSelected: !phrase.isSelected }
        : phrase
    ),
    fullTranscriptCaptions: state.fullTranscriptCaptions.map(phrase =>
      phrase.id === phraseId
        ? { ...phrase, isSelected: !phrase.isSelected }
        : phrase
    )
  })),
  
  updatePhraseStyle: (phraseId, style) => set((state) => ({
    keyPhrases: state.keyPhrases.map(phrase =>
      phrase.id === phraseId
        ? { ...phrase, style }
        : phrase
    ),
    fullTranscriptCaptions: state.fullTranscriptCaptions.map(phrase =>
      phrase.id === phraseId
        ? { ...phrase, style }
        : phrase
    )
  })),
  
  updatePhraseText: (phraseId, text) => set((state) => ({
    keyPhrases: state.keyPhrases.map(phrase =>
      phrase.id === phraseId
        ? { ...phrase, text }
        : phrase
    ),
    fullTranscriptCaptions: state.fullTranscriptCaptions.map(phrase =>
      phrase.id === phraseId
        ? { ...phrase, text }
        : phrase
    )
  })),
  
  applyStyleToAll: (style) => set((state) => ({
    keyPhrases: state.keyPhrases.map(phrase => ({ ...phrase, style })),
    fullTranscriptCaptions: state.fullTranscriptCaptions.map(phrase => ({ ...phrase, style }))
  })),
  
  applyStyleToSelected: (style) => set((state) => ({
    keyPhrases: state.keyPhrases.map(phrase =>
      phrase.isSelected ? { ...phrase, style } : phrase
    ),
    fullTranscriptCaptions: state.fullTranscriptCaptions.map(phrase =>
      phrase.isSelected ? { ...phrase, style } : phrase
    )
  })),
  
  syncFontSizeToAll: (fontSize) => set((state) => ({
    keyPhrases: state.keyPhrases.map(phrase =>
      phrase.isSelected && phrase.style 
        ? { ...phrase, style: { ...phrase.style, fontSize } }
        : phrase
    ),
    fullTranscriptCaptions: state.fullTranscriptCaptions.map(phrase =>
      phrase.isSelected && phrase.style
        ? { ...phrase, style: { ...phrase.style, fontSize } }
        : phrase
    )
  })),

  setIsExporting: (isExporting) => set({ isExporting }),
  setExportProgress: (progress) => set({ exportProgress: progress }),
  setExportedVideoUrl: (url) => set({ exportedVideoUrl: url }),
  
  setCurrentStep: (step) => set({ currentStep: step }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setPreviewCanvasDimensions: (width, height) => set({ previewCanvasWidth: width, previewCanvasHeight: height }),
  setPreviewRenderedVideoDimensions: (width, height) => set({ previewRenderedVideoWidth: width, previewRenderedVideoHeight: height }),
  setPreviewVideoOffsets: (offsetX, offsetY) => set({ previewVideoOffsetX: offsetX, previewVideoOffsetY: offsetY }),
  
  setCaptionMode: (mode) => set({ captionMode: mode }),
  setFullTranscriptCaptions: (captions) => set({ fullTranscriptCaptions: captions }),
  
  addCustomCaption: (text, start, end) => set((state) => ({
    // Add to both modes; selection status default true
    keyPhrases: [
      ...state.keyPhrases,
      {
        id: `custom-${Date.now()}`,
        text,
        start,
        end,
        isSelected: true,
        style: state.keyPhrases[0]?.style || {
          id: 'custom',
          name: 'Custom Style',
          fontFamily: 'Inter, sans-serif',
          fontSize: 24,
          fontWeight: 'bold',
          color: '#ffffff',
          backgroundColor: '#000000cc',
          textAlign: 'center',
          position: 'bottom'
        }
      }
    ],
    fullTranscriptCaptions: [
      ...state.fullTranscriptCaptions,
      {
        id: `custom-${Date.now() + 1}`,
        text,
        start,
        end,
        isSelected: true,
        style: state.fullTranscriptCaptions[0]?.style || state.keyPhrases[0]?.style
      }
    ]
  })),
  
  // Helper to get current captions based on mode
  getCurrentCaptions: () => {
    const state = get()
    return state.captionMode === 'key-phrases' ? state.keyPhrases : state.fullTranscriptCaptions
  },
  
  // Export with real-time state
  getExportReadyCaptions: () => {
    const state = get()
    return state.exportReadyCaptions.length > 0 ? state.exportReadyCaptions : state.getCurrentCaptions()
  },
  setExportReadyCaptions: (captions) => set({ exportReadyCaptions: captions }),
  
  reset: () => {
    const state = get()
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl)
    }
    if (state.exportedVideoUrl) {
      URL.revokeObjectURL(state.exportedVideoUrl)
    }
    set(initialState)
  },
}))

// Predefined caption styles
export const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: 'modern',
    name: 'Modern',
    fontFamily: 'Inter, sans-serif',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#000000cc',
    textAlign: 'center',
    position: 'bottom',
    animation: 'fadeIn'
  },
  {
    id: 'playful',
    name: 'Playful',
    fontFamily: 'Comic Sans MS, cursive',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff6b6b',
    textAlign: 'center',
    position: 'top',
    animation: 'slideUp'
  },
  {
    id: 'elegant',
    name: 'Elegant',
    fontFamily: 'Georgia, serif',
    fontSize: 22,
    fontWeight: 'normal',
    color: '#2c3e50',
    backgroundColor: '#f8f9faee',
    textAlign: 'center',
    position: 'bottom',
    animation: 'none'
  },
  {
    id: 'bold',
    name: 'Bold Impact',
    fontFamily: 'Impact, sans-serif',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffff00',
    textAlign: 'center',
    position: 'center',
    animation: 'typewriter'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    fontFamily: 'Helvetica, sans-serif',
    fontSize: 20,
    fontWeight: 'normal',
    color: '#333333',
    textAlign: 'left',
    position: 'bottom',
    animation: 'fadeIn'
  }
]
