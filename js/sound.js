const soundManager = {
  elements: {
    fondo: document.getElementById('audioFondo'),
    gameOver: document.getElementById('audioGameOver'),
    eat: document.getElementById('audioEat'),
    hurt: document.getElementById('audioHurt')
  },
  volume: 0.5,
  isPlayingFondo: false,

  playFondo() {
    if (gameState.isSoundMuted) return;
    this.elements.fondo.volume = this.volume;
    this.elements.fondo.play().then(() => {
      this.isPlayingFondo = true;
    }).catch(err => {
      console.log("Audio playback waiting for interaction overlay.", err);
    });
  },

  stopFondo() {
    this.elements.fondo.pause();
    this.elements.fondo.currentTime = 0;
    this.isPlayingFondo = false;
  },

  toggle() {
    if (this.isPlayingFondo) {
      this.elements.fondo.pause();
      this.isPlayingFondo = false;
      gameState.isSoundMuted = true;
    } else {
      gameState.isSoundMuted = false;
      this.playFondo();
    }
    updateMuteDeckState();
  },

  play(effect) {
    if (gameState.isSoundMuted) return;
    const sound = this.elements[effect];
    if (sound) {
      sound.volume = this.volume;
      sound.currentTime = 0;
      sound.play().catch(err => console.log("SFX play failed", err));
    }
  },

  setVolume(newVol) {
    this.volume = Math.max(0, Math.min(1, newVol));
    this.elements.fondo.volume = this.volume;

    const slider = document.getElementById('deckVolumeSlider');
    const text = document.getElementById('deckVolumeText');
    if (slider) slider.value = Math.round(this.volume * 100);
    if (text) text.textContent = `${Math.round(this.volume * 100)}%`;

    updateSpeakerIconState();
  },

  volUp() {
    this.setVolume(this.volume + 0.1);
  },

  volDown() {
    this.setVolume(this.volume - 0.1);
  }
};

function updateMuteDeckState() {
  const icon = document.getElementById('deckMuteIcon');
  const text = document.getElementById('deckVolumeText');
  const slider = document.getElementById('deckVolumeSlider');
  const btn = document.getElementById('deckMuteBtn');

  if (gameState.isSoundMuted) {
    if (icon) {
      icon.className = 'fa-solid fa-volume-xmark deck-icon';
      icon.style.color = '#e74c3c';
    }
    if (text) text.textContent = 'MUT';
    if (slider) slider.value = 0;
    if (btn) btn.style.color = '#e74c3c';
  } else {
    if (btn) btn.style.color = 'var(--gold)';
    if (slider) slider.value = Math.round(soundManager.volume * 100);
    if (text) text.textContent = `${Math.round(soundManager.volume * 100)}%`;
    updateSpeakerIconState();
  }
}

function updateSpeakerIconState() {
  const icon = document.getElementById('deckMuteIcon');
  if (!icon) return;

  icon.style.color = 'var(--gold)';

  if (soundManager.volume > 0.5) {
    icon.className = 'fa-solid fa-volume-high deck-icon';
  } else if (soundManager.volume > 0) {
    icon.className = 'fa-solid fa-volume-low deck-icon';
  } else {
    icon.className = 'fa-solid fa-volume-off deck-icon';
  }
}
