# Setup Guide for Styled Captions

## Quick Setup (5 minutes)

### 1. Get OpenAI API Key
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### 2. Configure Environment
1. Copy the environment template:
   ```bash
   cp env.template .env.local
   ```

2. Edit `.env.local` and replace the placeholder:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 3. Install and Run
```bash
npm install
npm run dev
```

### 4. Test the Application
1. Open [http://localhost:3000](http://localhost:3000)
2. Upload a short video file (MP4, MOV, etc.)
3. Wait for AI transcription
4. Select key phrases and customize styles
5. Export your video with captions!

## Troubleshooting

### "Missing credentials" error
- Make sure your `.env.local` file exists
- Verify your OpenAI API key is correct
- Restart the development server after adding the key

### Video upload issues
- Ensure video is under 100MB
- Supported formats: MP4, MOV, AVI, MKV
- Try a shorter video (under 60 seconds)

### Export not working
- This is a known limitation in the current MVP
- FFmpeg.wasm can be finicky in development
- The UI is fully functional for testing the workflow

## Next Steps

Once you have the basic app running:

1. **Test with different videos** to see how AI transcription performs
2. **Customize caption styles** in `src/store/appStore.ts`
3. **Add your own branding** to the UI components
4. **Deploy to Vercel** for production use

## MVP Limitations

The current version includes:
- ✅ Video upload and preview
- ✅ AI transcription with Whisper
- ✅ Key phrase detection with GPT
- ✅ Caption editor with multiple styles
- ⚠️ Basic video export (may need refinement)

Future enhancements will include:
- User authentication
- Better video export quality
- More caption animations
- Social media direct publishing
