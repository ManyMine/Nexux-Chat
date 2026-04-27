const MORSE_CODE_DICT: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
  '9': '----.', '0': '-----', ', ': '--..--', '.': '.-.-.-', '?': '..--..',
  '/': '-..-.', '-': '-....-', '(': '-.--.', ')': '-.--.-', ' ': ' '
};

export const textToMorse = (text: string): string => {
  return text
    .toUpperCase()
    .split('')
    .map(char => MORSE_CODE_DICT[char] || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const playMorseCode = (text: string) => {
  const morse = textToMorse(text);
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  const dotDuration = 100; // ms
  
  let time = ctx.currentTime;
  
  for (let i = 0; i < morse.length; i++) {
    const char = morse[i];
    
    if (char === '.' || char === '-') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = 600; // Hz
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const duration = char === '.' ? dotDuration : dotDuration * 3;
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(1, time + 0.01);
      gain.gain.setValueAtTime(1, time + duration / 1000 - 0.01);
      gain.gain.linearRampToValueAtTime(0, time + duration / 1000);
      
      osc.start(time);
      osc.stop(time + duration / 1000);
      
      time += (duration + dotDuration) / 1000; // Add pause between symbols
    } else if (char === ' ') {
      time += (dotDuration * 3) / 1000; // Pause between words
    }
  }
};
