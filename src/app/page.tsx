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
  const { videoFile, currentStep, setVideoFile } = useAppStore()

  const handleVideoSelect = (file: File) => {
    setVideoFile(file)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
        {/* Browser Compatibility Warning */}
        <BrowserCompatibilityWarning />
        
        {currentStep === 'upload' && (
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Create Stunning Video Captions
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                Upload your video and let AI create engaging, styled captions that grab attention and boost engagement on social media.
              </p>
              
              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <Zap className="w-12 h-12 text-blue-500 mb-4" />
                  <h3 className="font-semibold mb-2">AI Transcription</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Accurate speech-to-text powered by OpenAI Whisper
                  </p>
                </div>
                <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <Sparkles className="w-12 h-12 text-purple-500 mb-4" />
                  <h3 className="font-semibold mb-2">Smart Highlighting</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    AI identifies key phrases for maximum impact
                  </p>
                </div>
                <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <Download className="w-12 h-12 text-green-500 mb-4" />
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
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 min-h-[400px]">
                  {currentStep === 'transcribe' && <TranscriptionPanel />}
                  {currentStep === 'edit' && <CaptionEditor />}
                  {currentStep === 'export' && <ExportPanel />}
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
