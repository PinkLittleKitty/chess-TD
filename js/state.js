const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 8;
const CELL_SIZE = 80;
const JAQUE_TICKS_LIMIT = 3;

let gameState = {
  score: 0,
  credits: 100,
  lives: 3,
  currentWave: 1,
  enemiesRemaining: 0,

  isPlaying: false,
  isTutorialActive: false,
  isGameOver: false,
  isTransitionActive: false,
  isLeaderboardVisible: false,
  isSoundMuted: localStorage.getItem('chess_td_muted') === 'true',

  fossboard: {
    apiBase: 'https://fossboard.justneki.deno.net',
    publicKey: 'pub-79e3ac58d31ea43b95d5',
    privateKey: 'priv-64c77987d52bd4d8f007'
  },

  king: {
    x: 2,
    y: 0,
    dom: null,
    vidas: 3
  },
  allies: [],
  enemies: [],

  enemiesQueued: [],
  spawnInterval: 2000,
  moveInterval: 1500,

  spawnerTimerId: null,
  moverTimerId: null,
  collisionTimerId: null,

  cheats: {
    godMode: false,
    infinityAmmo: false,
    sangre: false,
    lento: false,
    idclip: false,
    hardmode: false
  }
};

const CHEATS_LIST = {
  iddqd: () => {
    gameState.cheats.godMode = true;
    updateKingSprite();
    showFloatingText(gameState.king.x, gameState.king.y, "GOD MODE ON", "recurso-gain");
  },
  idfa: () => {
    gameState.cheats.infinityAmmo = true;
    showFloatingText(gameState.king.x, gameState.king.y, "INF AMMO ON", "recurso-gain");
  },
  fatality: () => {
    gameState.cheats.sangre = true;
    showFloatingText(gameState.king.x, gameState.king.y, "BLOOD ON", "recurso-gain");
  },
  slowpoke: () => {
    gameState.cheats.lento = true;
    gameState.spawnInterval = 5000;
    gameState.moveInterval = 2500;
    if (gameState.isPlaying && !gameState.isTransitionActive) {
      stopWaveTimers();
      startWaveTimers();
    }
    showFloatingText(gameState.king.x, gameState.king.y, "SLOW SPEED ON", "recurso-gain");
  },
  idclip: () => {
    gameState.cheats.idclip = true;
    showFloatingText(gameState.king.x, gameState.king.y, "NOCLIP ON", "recurso-gain");
  },
  noclip: () => {
    gameState.cheats.idclip = true;
    showFloatingText(gameState.king.x, gameState.king.y, "NOCLIP ON", "recurso-gain");
  },
  motherlode: () => {
    addCredits(50000);
    showFloatingText(gameState.king.x, gameState.king.y, "+$50000", "recurso-gain");
  },
  inferno: () => {
    gameState.cheats.hardmode = true;
    gameState.lives = 0;
    gameState.king.vidas = 0;
    updateHUD();
    showFloatingText(gameState.king.x, gameState.king.y, "HARDMODE ON", "life-loss");
  },
  vainilla: () => {
    resetCheats();
    showFloatingText(gameState.king.x, gameState.king.y, "CHEATS RESET", "life-loss");
  },
  reset: () => {
    resetCheats();
    showFloatingText(gameState.king.x, gameState.king.y, "CHEATS RESET", "life-loss");
  }
};

function resetCheats() {
  gameState.cheats.godMode = false;
  gameState.cheats.infinityAmmo = false;
  gameState.cheats.sangre = false;
  gameState.cheats.lento = false;
  gameState.cheats.idclip = false;
  gameState.cheats.hardmode = false;
  gameState.spawnInterval = 2000;
  gameState.moveInterval = 1500;
  updateKingSprite();
  if (gameState.isPlaying && !gameState.isTransitionActive) {
    stopWaveTimers();
    startWaveTimers();
  }
}

function triggerCheat(code) {
  const sanitized = code.trim().toLowerCase();
  if (CHEATS_LIST[sanitized]) {
    CHEATS_LIST[sanitized]();
    soundManager.play("eat");
    return true;
  }
  return false;
}

function addCredits(amt) {
  gameState.credits += amt;
  updateHUD();
}

function deductCredits(amt) {
  if (gameState.cheats.infinityAmmo) return;
  gameState.credits = Math.max(0, gameState.credits - amt);
  updateHUD();
}

function addScore(amt) {
  gameState.score += amt;
  updateHUD();
}
