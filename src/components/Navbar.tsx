'use client'

import { Sparkles } from 'lucide-react'

interface NavbarProps {
  current: 'upload' | 'transcribe' | 'edit' | 'export'
  onNavigate: (step: 'upload' | 'transcribe' | 'edit' | 'export') => void
}

export default function Navbar({ current, onNavigate }: NavbarProps) {
  const linkBase = 'px-3 py-1.5 rounded text-sm font-medium transition-colors'
  const inactive = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
  const activeLight = 'bg-black text-white'
  const activeDark = 'dark:bg-white dark:text-black'

  return (
    <header className="h-14 border-b bg-white/70 dark:bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-black dark:text-white" />
          <span className="text-lg font-semibold text-black dark:text-white">Styled Captions</span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onNavigate('upload')}
            className={`${linkBase} ${current === 'upload' ? `${activeLight} ${activeDark}` : inactive}`}
          >
            Upload
          </button>
          <button
            onClick={() => onNavigate('edit')}
            className={`${linkBase} ${current === 'edit' ? `${activeLight} ${activeDark}` : inactive}`}
          >
            Edit
          </button>
          <button
            onClick={() => onNavigate('export')}
            className={`${linkBase} ${current === 'export' ? `${activeLight} ${activeDark}` : inactive}`}
          >
            Export
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:underline"
          >
            Home
          </a>
          <a
            href="https://github.com/amaykorade/styled-captions"
            target="_blank"
            rel="noreferrer"
            className="text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://styledcaptions.example.com/docs"
            target="_blank"
            rel="noreferrer"
            className="text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:underline"
          >
            Docs
          </a>
        </div>
      </div>
    </header>
  )
}


