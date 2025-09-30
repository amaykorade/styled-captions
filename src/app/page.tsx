
'use client'

import { useAppStore } from '@/store/appStore'
import VideoUpload from '@/components/VideoUpload'
import VideoPreview from '@/components/VideoPreview'
import InteractiveCaptionEditor from '@/components/InteractiveCaptionEditor'
import TranscriptionPanel from '@/components/TranscriptionPanel'
import CaptionEditor from '@/components/CaptionEditor'
import ExportPanel from '@/components/ExportPanel'
import ContextToolbar from '@/components/ContextToolbar'
import BrowserCompatibilityWarning from '@/components/BrowserCompatibilityWarning'
import { Sparkles, Zap, Download, Upload, Edit3, Download as DownloadIcon, Play, Pause, RotateCcw } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function Home() {
  const { videoFile, currentStep, setVideoFile, setCurrentStep, selectedPhraseId } = useAppStore()

  const handleVideoSelect = (file: File) => {
    setVideoFile(file)
  }

  // If no video uploaded, show landing page
  if (!videoFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
        {/* Header */}
        <header className="border-b bg-white/70 dark:bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-black dark:text-white" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-black via-zinc-700 to-zinc-400 dark:from-white dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
                  Styled Captions
                </h1>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                AI-Powered Video Captions
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-black via-zinc-700 to-zinc-400 dark:from-white dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
              Create Stunning Video Captions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Upload your video and let AI create engaging, styled captions that grab attention and boost engagement on social media.
            </p>
            
            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="card flex flex-col items-center p-6">
                <Zap className="w-12 h-12 text-black dark:text-white mb-4" />
                <h3 className="font-semibold mb-2">AI Transcription</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Accurate speech-to-text powered by OpenAI Whisper
                </p>
              </div>
              <div className="card flex flex-col items-center p-6">
                <Sparkles className="w-12 h-12 text-black dark:text-white mb-4" />
                <h3 className="font-semibold mb-2">Smart Highlighting</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  AI identifies key phrases for maximum impact
                </p>
              </div>
              <div className="card flex flex-col items-center p-6">
                <Download className="w-12 h-12 text-black dark:text-white mb-4" />
                <h3 className="font-semibold mb-2">Ready to Share</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Export videos optimized for TikTok, Instagram, YouTube
                </p>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <VideoUpload onVideoSelect={handleVideoSelect} />
        </main>

        {/* Footer */}
        <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center text-gray-600 dark:text-gray-400">
              <p>&copy; 2025 Styled Captions. Built with Next.js and AI.</p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // Canva-style layout for editing
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      {/* Top Header */}
      <Navbar current={currentStep} onNavigate={(s) => setCurrentStep(s)} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[30rem] bg-transparent border-r border-gray-200 dark:border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-3">
              {currentStep === 'transcribe' && 'AI Transcription'}
              {currentStep === 'edit' && 'Caption Editor'}
              {currentStep === 'export' && 'Export Video'}
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {currentStep === 'transcribe' && <TranscriptionPanel />}
            {currentStep === 'edit' && <CaptionEditor />}
            {currentStep === 'export' && <ExportPanel />}
          </div>
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 flex flex-col bg-transparent overflow-y-auto">
          {/* Context Toolbar - appears when text is selected */}
          {selectedPhraseId && currentStep === 'edit' && (
            <ContextToolbar phraseId={selectedPhraseId} />
          )}

          {/* Video Canvas */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-5xl">
              {currentStep === 'edit' ? (
                <InteractiveCaptionEditor />
              ) : (
                <VideoPreview file={videoFile} />
              )}
            </div>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="w-[22rem] bg-transparent border-l border-gray-200 dark:border-zinc-800 hidden xl:flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-black dark:text-white">Video Preview</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">Read-only preview</p>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <VideoPreview file={videoFile} />
          </div>
        </div>
      </div>

      {/* Browser Compatibility Warning */}
      <BrowserCompatibilityWarning />
    </div>
  )
}
