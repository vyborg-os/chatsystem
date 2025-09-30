// Notification sound utility

// Create audio context and audio element for notification sounds
let audioContext: AudioContext | null = null;
let notificationSound: HTMLAudioElement | null = null;

// Initialize audio context and notification sound on user interaction
export const initAudioContext = () => {
  // Create audio context if it doesn't exist
  if (!audioContext && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  
  // Create notification sound element if it doesn't exist
  if (!notificationSound && typeof window !== 'undefined') {
    notificationSound = new Audio();
    notificationSound.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    notificationSound.load();
  }
};

// Play notification sound
export const playNotificationSound = () => {
  // Initialize if needed
  if (!audioContext || !notificationSound) {
    initAudioContext();
  }
  
  // Try to play using Audio element first (more reliable)
  if (notificationSound) {
    try {
      // Reset to beginning and play
      notificationSound.currentTime = 0;
      
      // Use the play() promise to catch any autoplay restrictions
      const playPromise = notificationSound.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing notification sound:', error);
          // Fall back to oscillator if audio element fails
          playOscillatorSound();
        });
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
      // Fall back to oscillator if audio element fails
      playOscillatorSound();
    }
  } else {
    // Fall back to oscillator if audio element not available
    playOscillatorSound();
  }
};

// Fallback oscillator sound
const playOscillatorSound = () => {
  if (audioContext && audioContext.state === 'running') {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing oscillator sound:', error);
    }
  } else if (audioContext) {
    // Try to resume the audio context if it's suspended
    audioContext.resume().catch(err => {
      console.error('Failed to resume audio context:', err);
    });
  }
};
