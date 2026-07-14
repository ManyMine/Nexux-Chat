export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Modern pleasant double blip notification
    osc.type = 'sine';
    
    // First blip
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0, ctx.currentTime + 0.1);
    
    // Second blip
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0, ctx.currentTime + 0.25);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {
    console.error("Audio playback failed", e);
  }
};

export const showNativeNotification = (title: string, body: string, channelId: string, senderPhoto?: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const defaultIcon = 'https://www.image2url.com/r2/default/images/1783957698206-a4bc0933-1da2-42af-9e0b-dcb9118a5b5d.png';
  const icon = senderPhoto || defaultIcon;
  const targetUrl = `${window.location.origin}?channelId=${channelId}`;

  const options = {
    body,
    icon,
    badge: defaultIcon,
    tag: channelId,
    renotify: true,
    data: targetUrl
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, options);
    }).catch(() => {
      new Notification(title, options);
    });
  } else {
    new Notification(title, options);
  }
};

