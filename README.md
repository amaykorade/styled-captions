# Styled Captions - AI-Powered Video Captions

Create engaging, styled captions for your short-form videos with AI-powered transcription and customizable designs. Perfect for TikTok, Instagram Reels, YouTube Shorts, and other social media platforms.

## 🎯 Features

- **AI Transcription**: Accurate speech-to-text using OpenAI Whisper
- **Smart Phrase Detection**: AI identifies key phrases for maximum engagement
- **Customizable Styles**: Multiple caption styles with fonts, colors, and animations
- **Video Export**: Export videos with embedded captions ready for social media
- **Drag & Drop Upload**: Easy video file handling
- **Real-time Preview**: See your captions as you edit

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd styled_captions
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your OpenAI API key to `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎨 How It Works

1. **Upload Video**: Drag and drop your video file (MP4, MOV, AVI, MKV)
2. **AI Transcription**: The app transcribes your video using OpenAI Whisper
3. **Key Phrase Detection**: AI identifies the most engaging phrases
4. **Style Selection**: Choose from preset styles or customize your own
5. **Export**: Generate your final video with styled captions

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── transcribe/          # Whisper API integration
│   │   └── analyze-phrases/     # GPT phrase analysis
│   ├── page.tsx                 # Main application page
│   └── layout.tsx              # App layout
├── components/
│   ├── VideoUpload.tsx         # File upload interface
│   ├── VideoPreview.tsx        # Video player component
│   ├── TranscriptionPanel.tsx  # Transcription UI
│   ├── CaptionEditor.tsx       # Caption editing interface
│   └── ExportPanel.tsx         # Video export interface
├── services/
│   ├── transcriptionService.ts # API communication
│   └── videoExportService.ts   # Video processing with FFmpeg
└── store/
    └── appStore.ts             # Zustand state management
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Video Processing**: FFmpeg.wasm
- **AI Services**: OpenAI (Whisper + GPT)
- **File Handling**: react-dropzone
- **Icons**: Lucide React

## 🎬 Supported Formats

- **Input**: MP4, MOV, AVI, MKV, WebM, MPEG, MP3, WAV, M4A, OGG, FLAC (max 100MB)
- **Auto-Conversion**: MOV, AVI, MKV files are automatically converted to MP4 for AI processing
- **Output**: MP4 with embedded captions
- **Duration**: Up to 60 seconds (recommended for social media)

## 🎨 Caption Styles

The app includes 5 preset styles:

1. **Modern**: Clean white text with black background
2. **Playful**: Colorful Comic Sans style
3. **Elegant**: Serif font with subtle styling
4. **Bold Impact**: High-impact yellow text
5. **Minimal**: Simple, clean design

## 🔧 Configuration

### Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Caption Style Customization

Edit `src/store/appStore.ts` to modify or add new caption styles:

```typescript
export const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: 'custom',
    name: 'Custom Style',
    fontFamily: 'Arial, sans-serif',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#000000cc',
    textAlign: 'center',
    position: 'bottom',
    animation: 'fadeIn'
  }
]
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `OPENAI_API_KEY` to environment variables
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with Docker

## 🔍 API Endpoints

### POST `/api/transcribe`
Transcribes video audio using OpenAI Whisper

**Request**: FormData with video file
**Response**: Transcript segments with timestamps

### POST `/api/analyze-phrases`
Analyzes transcript for engaging key phrases

**Request**: JSON with transcript and full text
**Response**: Key phrases with priority scores

## 🎯 MVP Features vs Future Enhancements

### ✅ Current MVP Features
- Video upload and processing
- AI transcription with Whisper
- Key phrase detection with GPT
- Caption styling and positioning
- Video export with FFmpeg

### 🔮 Future Enhancements
- User accounts and authentication
- Custom branding and watermarks
- Batch video processing
- Advanced animation effects
- Social media direct publishing
- Analytics and engagement tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](../../issues) page
2. Make sure your OpenAI API key is valid
3. Ensure your video file meets the requirements
4. Check browser console for error messages

### Common Issues & Solutions

**"Failed to convert MOV file" Error:**
- Try using Chrome or Firefox browser (better FFmpeg.wasm support)
- Convert your MOV file to MP4 manually before uploading
- Reduce file size to under 50MB
- Enable SharedArrayBuffer in your browser if disabled

**Video Upload Issues:**
- Maximum file size: 100MB
- Recommended duration: under 60 seconds
- Supported formats: MP4 (best), MOV, WebM, MP3, WAV

**Transcription Fails:**
- Check your OpenAI API key is valid and has credits
- Try with a shorter video clip first
- Ensure audio quality is clear

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT APIs
- FFmpeg team for video processing capabilities
- Next.js team for the excellent framework
- Tailwind CSS for styling utilities
