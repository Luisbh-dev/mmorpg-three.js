class AudioManager {
  constructor() {
    this.bgm = null;
    this.sfxVolume = 0.5;
    this.bgmVolume = 0.3;
    this.sounds = {};
    
    // Preload map (placeholders)
    this.soundMap = {
      'attack': '/assets/audio/attack.mp3',
      'step': '/assets/audio/step.mp3',
      'levelUp': '/assets/audio/levelup.mp3',
      'ui_click': '/assets/audio/click.mp3',
      'ui_hover': '/assets/audio/hover.mp3',
      'bgm_main': '/assets/audio/music_main.mp3'
    };
  }

  playSFX(id) {
    const src = this.soundMap[id];
    if (!src) return;

    // Create new audio instance for overlapping sounds
    const audio = new Audio(src);
    audio.volume = this.sfxVolume;
    audio.play().catch(e => console.warn('Audio play failed (interaction needed?):', e));
  }

  playBGM(id) {
    const src = this.soundMap[id];
    if (!src) return;

    if (this.bgm && this.bgm.src.includes(id)) {
        if (this.bgm.paused) this.bgm.play();
        return; // Already playing
    }

    this.stopBGM();

    this.bgm = new Audio(src);
    this.bgm.loop = true;
    this.bgm.volume = this.bgmVolume;
    this.bgm.play().catch(e => console.warn('BGM play failed:', e));
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm = null;
    }
  }

  setVolume(type, val) {
    if (type === 'sfx') this.sfxVolume = val;
    if (type === 'bgm') {
        this.bgmVolume = val;
        if (this.bgm) this.bgm.volume = val;
    }
  }
}

const audioManager = new AudioManager();
export default audioManager;
