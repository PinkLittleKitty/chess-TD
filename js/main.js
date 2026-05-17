function initGame() {
  bindKeyboardEvents();
  bindUIButtons();

  updateMuteDeckState();

  displayLeaderboardData();

  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
  }, 1000);
}

function bindKeyboardEvents() {
  document.addEventListener('keydown', (e) => {
    const isFocusOnInput = document.activeElement && document.activeElement.id === 'playerNameInput';
    if (isFocusOnInput) {
      if (e.key === 'Enter') {
        submitNameScoreFlow();
      }
      return;
    }

    const keyDOM = document.getElementById(`key-${e.key}`);
    if (keyDOM) {
      keyDOM.classList.add('pressed');
    }

    switch (e.key) {
      case 'ArrowLeft':
        moverRey(gameState.king.x - 1, gameState.king.y);
        break;
      case 'ArrowRight':
        moverRey(gameState.king.x + 1, gameState.king.y);
        break;
      case 'ArrowUp':
        moverRey(gameState.king.x, gameState.king.y + 1);
        break;
      case 'ArrowDown':
        moverRey(gameState.king.x, gameState.king.y - 1);
        break;

      case '1':
        intentarColocarDefensa(PeonBlanco);
        break;
      case '2':
        intentarColocarDefensa(CaballoBlanco);
        break;
      case '3':
        dispararProyectil(AlfilBlanco);
        break;
      case '4':
        dispararProyectil(TorreBlanca);
        break;

      case 'Alt':
        resetGameEngine();
        break;

      case 'm':
      case 'M':
        soundManager.toggle();
        break;

      case '+':
      case '=':
        soundManager.volUp();
        break;
      case '-':
      case '_':
        soundManager.volDown();
        break;

      case 'l':
      case 'L':
        toggleLeaderboardOverlay();
        break;

      case 'Enter':
        if (!gameState.isPlaying && !gameState.isGameOver) {
          startGameFlow();
        }
        break;
    }
  });

  document.addEventListener('keyup', (e) => {
    const keyDOM = document.getElementById(`key-${e.key}`);
    if (keyDOM) {
      keyDOM.classList.remove('pressed');
    }
  });
}

function bindUIButtons() {
  document.getElementById('main-menu-overlay').addEventListener('click', startGameFlow);

  document.getElementById('btnSubmitScore').addEventListener('click', submitNameScoreFlow);

  document.getElementById('btnCloseLeaderboard').addEventListener('click', toggleLeaderboardOverlay);

  const deckLeaderboard = document.getElementById('deckLeaderboardBtn');
  if (deckLeaderboard) {
    deckLeaderboard.addEventListener('click', toggleLeaderboardOverlay);
  }

  document.getElementById('btnResetLeaderboard').addEventListener('click', () => {
    if (confirm("¿Estás seguro de borrar todo el historial de puntuaciones?")) {
      localStorage.removeItem('chess_td_leaderboard');
      displayLeaderboardData();
    }
  });

  document.getElementById('panelToggle').addEventListener('click', () => {
    document.getElementById('controlsPanel').classList.toggle('collapsed');
  });

  const deckMute = document.getElementById('deckMuteBtn');
  if (deckMute) {
    deckMute.addEventListener('click', () => soundManager.toggle());
  }

  const slider = document.getElementById('deckVolumeSlider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      if (gameState.isSoundMuted) {
        soundManager.toggle();
      }
      soundManager.setVolume(val);
    });
  }
}

function submitNameScoreFlow() {
  const input = document.getElementById('playerNameInput');
  const name = input.value.trim() || "Anónimo";

  const codeTriggered = triggerCheat(name);

  addHighScore(name, gameState.score);

  input.value = '';

  resetGameEngine();
}

function autoScaleGameScreen() {
  const screenPanel = document.getElementById('game-screen');
  const container = document.getElementById('game-viewport-container');
  if (!screenPanel || !container) return;

  const paddingHeight = 150;
  const paddingWidth = window.innerWidth <= 1100 ? 40 : 360;

  const availHeight = window.innerHeight - paddingHeight;
  const availWidth = window.innerWidth - paddingWidth;

  const baseWidth = 584;
  const baseHeight = 664;

  let scaleH = availHeight / baseHeight;
  let scaleW = availWidth / baseWidth;

  let scale = Math.min(scaleH, scaleW);
  scale = Math.max(0.6, Math.min(1.5, scale));

  screenPanel.style.transform = `scale(${scale})`;
  screenPanel.style.transformOrigin = 'top center';

  container.style.height = `${baseHeight * scale + 10}px`;
}

window.addEventListener('load', () => {
  initGame();
  autoScaleGameScreen();
  setTimeout(autoScaleGameScreen, 100);
  setTimeout(autoScaleGameScreen, 400);
});

window.addEventListener('resize', autoScaleGameScreen);

window.addEventListener('click', () => {
  if (!soundManager.isPlayingFondo && !gameState.isSoundMuted && gameState.isPlaying) {
    soundManager.playFondo();
  }
}, { once: true });
