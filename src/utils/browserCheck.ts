// Browser compatibility checks for FFmpeg.wasm

export function checkFFmpegSupport(): {
  supported: boolean;
  reason?: string;
  suggestions?: string[];
} {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return {
      supported: false,
      reason: 'Server-side rendering environment',
    };
  }

  // Check for SharedArrayBuffer support
  if (typeof SharedArrayBuffer === 'undefined') {
    return {
      supported: false,
      reason: 'SharedArrayBuffer is not supported',
      suggestions: [
        'Use Chrome or Firefox browser',
        'Ensure you\'re using HTTPS (not HTTP)',
        'Check if browser flags are blocking SharedArrayBuffer',
      ],
    };
  }

  // Check for secure context
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'Not in a secure context (HTTPS required)',
      suggestions: [
        'Use HTTPS instead of HTTP',
        'Use localhost for development',
      ],
    };
  }

  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    return {
      supported: false,
      reason: 'WebAssembly is not supported',
      suggestions: [
        'Update your browser to a newer version',
        'Use Chrome, Firefox, Safari, or Edge',
      ],
    };
  }

  // Check user agent for known incompatible browsers
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    // Safari has limited SharedArrayBuffer support
    return {
      supported: false,
      reason: 'Safari has limited SharedArrayBuffer support',
      suggestions: [
        'Use Chrome or Firefox for better compatibility',
        'Convert your video to MP4 manually before uploading',
      ],
    };
  }

  return { supported: true };
}

export function getBrowserInfo(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  
  return 'Unknown';
}
