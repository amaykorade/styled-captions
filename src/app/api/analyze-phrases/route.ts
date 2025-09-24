import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  try {
    const { transcript, fullText } = await request.json()

    if (!fullText || !transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      )
    }

    console.log('Analyzing key phrases for:', fullText.substring(0, 100) + '...')

    // Use GPT to identify key phrases
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert at identifying engaging, attention-grabbing phrases from video transcripts for social media captions. 

CRITICAL: You must extract phrases EXACTLY as they appear in the transcript, word-for-word. Do not paraphrase or modify the text.

Your task is to:
1. Identify 3-7 key phrases that would make great captions for short-form videos
2. Focus on phrases that are:
   - Emotionally engaging
   - Action-oriented
   - Questions or statements that hook viewers
   - Surprising or interesting facts
   - Strong opinions or claims
   - Complete sentences or meaningful fragments
3. Extract phrases EXACTLY as written in the transcript (same capitalization, punctuation, etc.)
4. Each phrase should be 3-12 words long for better readability
5. Avoid generic filler words and transitions

Return your response as a JSON array of objects with this structure:
[
  {
    "text": "EXACT phrase from transcript - do not modify",
    "reason": "brief explanation why this phrase is engaging",
    "priority": number from 1-10 (10 being most important)
  }
]

Example:
If transcript contains: "I started working on the API Vault project last month"
Good: "started working on the API Vault project"
Bad: "Started working on API Vault project" (modified capitalization)`
        },
        {
          role: 'user',
          content: `Analyze this transcript and identify the most engaging phrases for social media captions:\n\n"${fullText}"`
        }
      ],
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    let keyPhrases
    try {
      // Clean the response text first
      let cleanedResponse = responseText.trim()
      
      // Remove any markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '')
      }
      
      // Try to find JSON array in the response
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0]
      }
      
      keyPhrases = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse GPT response as JSON:', parseError)
      console.log('Raw GPT response:', responseText)
      
      // Fallback: create basic phrases from the transcript
      const fallbackPhrases = transcript.slice(0, 5).map((segment: { text: string }, index: number) => ({
        text: segment.text,
        reason: 'Auto-generated from transcript',
        priority: 10 - index * 2
      }))
      
      console.log('Using fallback phrases:', fallbackPhrases)
      keyPhrases = fallbackPhrases
    }

    // Match the key phrases with transcript segments to get timestamps
    const transcriptText = transcript.map((t: { text: string }) => t.text).join(' ')
    
    const matchedPhrases = keyPhrases.map((phrase: { text: string; reason: string; priority: number }, index: number) => {
      console.log(`\nMatching phrase: "${phrase.text}"`)
      
      // Try multiple matching strategies
      let bestMatch = null
      let bestScore = 0
      
      // Strategy 1: Exact substring match
      const phraseText = phrase.text.toLowerCase().trim()
      const transcriptTextLower = transcriptText.toLowerCase()
      
      if (transcriptTextLower.includes(phraseText)) {
        console.log('Found exact substring match')
        const startIndex = transcriptTextLower.indexOf(phraseText)
        const endIndex = startIndex + phraseText.length
        
        // Find the word indices that correspond to this character range
        let charCount = 0
        let startWordIndex = -1
        let endWordIndex = -1
        
        for (let i = 0; i < transcript.length; i++) {
          const wordText = transcript[i].text
          const wordStart = charCount
          const wordEnd = charCount + wordText.length
          
          if (startWordIndex === -1 && wordEnd > startIndex) {
            startWordIndex = i
          }
          if (endWordIndex === -1 && wordStart >= endIndex) {
            endWordIndex = i - 1
            break
          }
          
          charCount += wordText.length + 1 // +1 for space
        }
        
        if (startWordIndex !== -1) {
          endWordIndex = endWordIndex === -1 ? transcript.length - 1 : endWordIndex
          
          bestMatch = {
            start: transcript[startWordIndex].start,
            end: transcript[Math.min(endWordIndex, transcript.length - 1)].end,
            matchedText: transcript.slice(startWordIndex, endWordIndex + 1).map((t: { text: string }) => t.text).join(' ')
          }
          bestScore = 1.0
        }
      }
      
      // Strategy 2: Fuzzy word matching if exact match failed
      if (!bestMatch) {
        console.log('Trying fuzzy word matching')
        const phraseWords = phraseText.split(' ').filter(w => w.length > 2) // Ignore short words
        
        for (let i = 0; i <= transcript.length - phraseWords.length; i++) {
          const windowSize = Math.min(phraseWords.length + 2, transcript.length - i) // Allow some flexibility
          const segment = transcript.slice(i, i + windowSize)
          const segmentText = segment.map((s: { text: string }) => s.text.toLowerCase().replace(/[^\w\s]/g, '')).join(' ')
          
          // Count matching words
          let matchingWords = 0
          phraseWords.forEach(word => {
            if (segmentText.includes(word)) {
              matchingWords++
            }
          })
          
          const similarity = matchingWords / phraseWords.length
          
          if (similarity > bestScore && similarity > 0.6) {
            bestScore = similarity
            bestMatch = {
              start: segment[0].start,
              end: segment[Math.min(phraseWords.length - 1, segment.length - 1)].end,
              matchedText: segment.slice(0, phraseWords.length).map((s: { text: string }) => s.text).join(' ')
            }
          }
        }
      }
      
      // Strategy 3: Find individual key words if fuzzy matching failed
      if (!bestMatch && phraseText.length > 5) {
        console.log('Trying individual word matching')
        const keyWords = phraseText.split(' ').filter(w => w.length > 3)
        
        for (const keyWord of keyWords) {
          for (let i = 0; i < transcript.length; i++) {
            const wordText = transcript[i].text.toLowerCase().replace(/[^\w]/g, '')
            if (wordText.includes(keyWord) || keyWord.includes(wordText)) {
              // Found a key word, create a small segment around it
              const startIdx = Math.max(0, i - 1)
              const endIdx = Math.min(transcript.length - 1, i + 2)
              
              bestMatch = {
                start: transcript[startIdx].start,
                end: transcript[endIdx].end,
                matchedText: transcript.slice(startIdx, endIdx + 1).map((t: { text: string }) => t.text).join(' ')
              }
              bestScore = 0.5
              break
            }
          }
          if (bestMatch) break
        }
      }

      const result = {
        id: `phrase-${index}`,
        text: bestMatch?.matchedText || phrase.text,
        start: bestMatch?.start || (index * 2), // Spread them out if no match
        end: bestMatch?.end || (index * 2 + 2),
        isSelected: phrase.priority >= 7,
        reason: phrase.reason,
        priority: phrase.priority
      }
      
      console.log(`Result: "${result.text}" (${result.start}s - ${result.end}s) Score: ${bestScore}`)
      return result
    })

    return NextResponse.json({
      success: true,
      keyPhrases: matchedPhrases,
    })

  } catch (error) {
    console.error('Phrase analysis error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze phrases',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Simple text similarity function
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.split(' ')
  const words2 = text2.split(' ')
  
  if (words1.length !== words2.length) {
    return 0
  }
  
  let matches = 0
  for (let i = 0; i < words1.length; i++) {
    if (words1[i] === words2[i]) {
      matches++
    }
  }
  
  return matches / words1.length
}
