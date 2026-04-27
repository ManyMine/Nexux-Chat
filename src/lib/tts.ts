export const speakText = (text: string, voiceName?: string) => {
  if ('speechSynthesis' in window && window.speechSynthesis) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR'; // Assuming Portuguese based on the app's language
    
    // Optional: Try to find a better voice
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => v.name === voiceName);
    if (!voice) {
        voice = voices.find(v => v.lang.includes('pt'));
    }
    
    if (voice) {
      utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
};
