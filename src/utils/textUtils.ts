// Text utility functions for caption rendering

export interface TextMetrics {
  lines: string[]
  totalWidth: number
  totalHeight: number
  lineHeight: number
}

// Wrap text to fit within specified width
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): TextMetrics {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  const lineHeight = fontSize * 1.2 // 20% line spacing
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    
    if (metrics.width > maxWidth && currentLine) {
      // Current line is too long, start a new line
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  
  // Add the last line
  if (currentLine) {
    lines.push(currentLine)
  }
  
  // Calculate total dimensions
  const totalWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
  const totalHeight = lines.length * lineHeight
  
  return {
    lines,
    totalWidth,
    totalHeight,
    lineHeight
  }
}

// Smart text sizing - automatically reduce font size if text is too wide
export function getOptimalFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  initialFontSize: number,
  fontFamily: string,
  fontWeight: string
): { fontSize: number; lines: string[] } {
  let fontSize = initialFontSize
  let wrapped: TextMetrics
  
  // Try reducing font size until text fits
  do {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    wrapped = wrapText(ctx, text, maxWidth, fontSize)
    
    if (wrapped.totalHeight > maxHeight && fontSize > 12) {
      fontSize -= 2 // Reduce font size
    } else {
      break
    }
  } while (fontSize > 12)
  
  return {
    fontSize,
    lines: wrapped.lines
  }
}

// Draw multi-line text with proper spacing
export function drawMultiLineText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  textAlign: 'left' | 'center' | 'right' = 'center'
) {
  const startY = y - ((lines.length - 1) * lineHeight / 2) // Center vertically
  
  lines.forEach((line, index) => {
    const lineY = startY + (index * lineHeight)
    
    // Set text alignment for each line
    ctx.textAlign = textAlign as CanvasTextAlign
    
    // Draw outline if no background
    if (ctx.strokeStyle !== 'transparent' && ctx.lineWidth > 0) {
      ctx.strokeText(line, x, lineY)
    }
    
    // Draw main text
    ctx.fillText(line, x, lineY)
  })
}

// Calculate safe area for text (with margins)
export function getSafeTextArea(canvasWidth: number, canvasHeight: number) {
  const margin = Math.min(canvasWidth, canvasHeight) * 0.05 // 5% margin
  
  return {
    x: margin,
    y: margin,
    width: canvasWidth - (margin * 2),
    height: canvasHeight - (margin * 2),
    margin
  }
}
