class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isInitialized = false;
  private isEnabled = true;
  private volume = 0.5;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Create AudioContext only when user interacts
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load all audio files
      await this.loadAudio('zap', '/zap.mp3');
      await this.loadAudio('alienShoot', '/alien-shoot.mp3');
      await this.loadAudio('megaBlast', '/mega-blast.mp3');
      await this.loadAudio('gameOver', '/game-over.mp3');
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      this.isEnabled = false;
    }
  }

  private async loadAudio(name: string, url: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(name, audioBuffer);
    } catch (error) {
      console.warn(`Failed to load audio ${name}:`, error);
    }
  }

  async playSound(soundName: string, volume: number = this.volume): Promise<void> {
    if (!this.isEnabled || !this.audioContext || !this.isInitialized) {
      return;
    }

    const audioBuffer = this.audioBuffers.get(soundName);
    if (!audioBuffer) {
      console.warn(`Audio ${soundName} not found`);
      return;
    }

    try {
      // Resume context if suspended (required for mobile)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isAudioEnabled(): boolean {
    return this.isEnabled && this.isInitialized;
  }
}

export default AudioManager;