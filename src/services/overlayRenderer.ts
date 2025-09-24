import type { KeyPhrase } from '@/store/appStore'

export interface RenderSize {
  width: number
  height: number
}

export interface RenderScales {
  scaleX: number
  scaleY: number
}

// Renders all active captions at the given currentTime using the same
// logic as the export, ensuring WYSIWYG parity.
export function renderOverlay(
  phrases: KeyPhrase[],
  currentTime: number,
  ctx: CanvasRenderingContext2D,
  size: RenderSize,
  scales: RenderScales = { scaleX: 1, scaleY: 1 }
) {
  const { width, height } = size
  const { scaleX, scaleY } = scales

  // Draw nothing if empty
  if (!phrases || phrases.length === 0) return

  const activePhrases = phrases.filter(p => currentTime >= p.start && currentTime <= p.end)
  if (activePhrases.length === 0) return

  activePhrases.forEach((phrase, index) => {
    const style = phrase.style || {
      fontSize: 24,
      color: '#ffffff',
      fontFamily: 'Arial',
      fontWeight: 'bold',
      position: 'bottom' as const,
      textAlign: 'center' as const,
      backgroundColor: undefined as string | undefined
    }

    // Font
    const baseFontSize = style.fontSize || 24
    const fontSize = baseFontSize * scaleX
    ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`
    ctx.textAlign = style.textAlign as CanvasTextAlign
    ctx.textBaseline = 'middle'

    // Position
    let x: number, y: number
    if ('customX' in style && 'customY' in style && style.customX !== undefined && style.customY !== undefined) {
      x = (style.customX / 100) * width
      y = (style.customY / 100) * height
    } else {
      x = width / 2
      const baseSpacing = 60 * scaleY
      const lineSpacing = (baseFontSize + 20) * scaleY
      switch (style.position) {
        case 'top':
          y = baseSpacing + (index * lineSpacing)
          break
        case 'center':
          y = (height / 2) + (index * lineSpacing) - (activePhrases.length * lineSpacing / 2)
          break
        case 'bottom':
        default:
          y = height - baseSpacing - (index * lineSpacing)
          break
      }
    }

    // Container width (% of canvas width)
    const maxWidthPercent = ('maxWidth' in style && style.maxWidth) ? style.maxWidth : 80
    const maxWidthPx = (maxWidthPercent / 100) * width

    // Wrap text
    const words = phrase.text.split(' ')
    const wrappedLines: string[] = []
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine === '' ? word : `${currentLine} ${word}`
      const testWidth = ctx.measureText(testLine).width
      if (testWidth <= maxWidthPx) {
        currentLine = testLine
      } else {
        if (currentLine !== '') wrappedLines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine !== '') wrappedLines.push(currentLine)

    // Background (optional)
    const lineHeight = fontSize * 1.2
    const totalHeight = wrappedLines.length * lineHeight
    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor
      ctx.fillRect(
        x - maxWidthPx / 2 - 12,
        y - totalHeight / 2 - 12,
        maxWidthPx + 24,
        totalHeight + 24
      )
    }

    // Shadow
    if (!style.backgroundColor) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowOffsetX = 2 * scaleX
      ctx.shadowOffsetY = 2 * scaleY
      ctx.shadowBlur = 4 * scaleX
    } else {
      ctx.shadowColor = 'transparent'
    }

    // Text color
    ctx.fillStyle = style.color || '#ffffff'

    // Draw each line centered around y
    wrappedLines.forEach((line, i) => {
      const lineY = y - totalHeight / 2 + (i + 0.5) * lineHeight
      ctx.fillText(line, x, lineY)
    })

    // Reset shadow
    ctx.shadowColor = 'transparent'
  })
}

