'use client'

import { useAppStore } from '@/store/appStore'
import VideoUpload from '@/components/VideoUpload'
import VideoPreview from '@/components/VideoPreview'
import TranscriptionPanel from '@/components/TranscriptionPanel'
import CaptionEditor from '@/components/CaptionEditor'
import ExportPanel from '@/components/ExportPanel'
import BrowserCompatibilityWarning from '@/components/BrowserCompatibilityWarning'
import { Sparkles, Zap, Download } from 'lucide-react'

export default function Home() {
  const { videoFile, currentStep, setVideoFile, setCurrentStep } = useAppStore()

  const handleVideoSelect = (file: File) => {
    setVideoFile(file)
  }

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
        {/* Stepper */}
        <div className="max-w-7xl mx-auto mb-6">
          <ol className="grid grid-cols-3 gap-3">
            {[{ key: 'upload', label: 'Upload' }, { key: 'edit', label: 'Edit' }, { key: 'export', label: 'Export' }].map((step, idx) => {
              const isActive = (currentStep === step.key) || (currentStep === 'transcribe' && step.key === 'edit')
              const isDone = (step.key === 'edit' && (currentStep === 'export'))
              return (
                <li key={step.key} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${isActive ? 'border-black bg-zinc-50 dark:bg-white/5' : 'border-gray-200 dark:border-zinc-800'} cursor-default`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isActive ? 'bg-black text-white' : isDone ? 'bg-zinc-700 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300'}`}>{idx+1}</div>
                  <span className={`text-sm ${isActive ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{step.label}</span>
                </li>
              )
            })}
          </ol>
        </div>
        {/* Browser Compatibility Warning */}
        <BrowserCompatibilityWarning />
        
        {currentStep === 'upload' && (
          <div className="max-w-4xl mx-auto">
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
          </div>
        )}

        {currentStep !== 'upload' && videoFile && (
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Video Preview - Smaller column */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Video Preview</h3>
                <VideoPreview file={videoFile} />
              </div>
              
              {/* Transcription/Editor Panel - Larger column */}
              <div className="lg:col-span-3">
                <h3 className="text-lg font-semibold mb-4">
                  {currentStep === 'transcribe' && 'AI Transcription'}
                  {currentStep === 'edit' && 'Caption Editor'}
                  {currentStep === 'export' && 'Export Video'}
                </h3>
                <div className="panel p-6 min-h-[400px]">
                  {currentStep === 'transcribe' && <TranscriptionPanel />}
                  {currentStep === 'edit' && <CaptionEditor />}
                  {currentStep === 'export' && <ExportPanel />}
                </div>
              </div>
            </div>
            {/* Sticky flow controls */}
            <div className="sticky bottom-4 mt-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 justify-between bg-white/90 dark:bg-black/80 backdrop-blur border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-4 py-3 shadow-sm">
                  <div className="text-sm text-gray-600 dark:text-gray-400">{currentStep === 'transcribe' ? 'Step 2 of 3' : currentStep === 'edit' ? 'Step 2 of 3' : 'Step 3 of 3'}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentStep(currentStep === 'export' ? 'edit' : 'upload')}
                      className="btn btn-outline text-sm"
                    >
                      Back
                    </button>
                    {currentStep !== 'export' && (
                      <button
                        onClick={() => setCurrentStep(currentStep === 'transcribe' ? 'edit' : 'export')}
                        className="btn btn-primary text-sm"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
