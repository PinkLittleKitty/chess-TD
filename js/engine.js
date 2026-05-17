function startGameFlow() {
  if (gameState.isPlaying) return;
  document.getElementById('main-menu-overlay').classList.remove('active');

  soundManager.playFondo();

  gameState.isTutorialActive = false;

  buildWaveQueue(5);

  gameState.isPlaying = true;
  startWaveTimers();

  spawnKingVisual();
  updateHUD();
}

function spawnKingVisual() {
  const oldKing = document.getElementById('king-entity');
  if (oldKing) oldKing.parentNode.removeChild(oldKing);

  const board = document.getElementById('board');
  const img = document.createElement('img');
  img.id = 'king-entity';
  img.className = 'game-entity king';
  img.src = `assets/RBlanco.png`;
  img.style.left = `${gameState.king.x * CELL_SIZE}px`;
  img.style.bottom = `${gameState.king.y * CELL_SIZE}px`;

  board.appendChild(img);
  gameState.king.dom = img;

  updateKingSprite();
}

function updateKingSprite() {
  if (!gameState.king.dom) return;

  let sprite = 'RBlanco.png';
  if (gameState.cheats.godMode) {
    sprite = 'RBlancoGOD.png';
    gameState.king.dom.classList.add('king-god');
  } else {
    gameState.king.dom.classList.remove('king-god');
    const hp = gameState.lives;
    if (hp <= 0) sprite = 'RBlanco3Hit.png';
    else if (hp === 1) sprite = 'RBlanco2Hit.png';
    else if (hp === 2) sprite = 'RBlanco1Hit.png';
  }

  gameState.king.dom.src = `assets/${sprite}`;
}

function moverRey(newX, newY) {
  if (!gameState.isPlaying || gameState.isTutorialActive || gameState.isGameOver) return;

  const maxAllowedY = gameState.cheats.idclip ? BOARD_HEIGHT - 1 : 0;

  if (newX >= 0 && newX < BOARD_WIDTH && newY >= 0 && newY <= maxAllowedY) {
    gameState.king.x = newX;
    gameState.king.y = newY;

    if (gameState.king.dom) {
      gameState.king.dom.style.left = `${gameState.king.x * CELL_SIZE}px`;
      gameState.king.dom.style.bottom = `${gameState.king.y * CELL_SIZE}px`;
    }
  }
}

function intentarColocarDefensa(ClasePieza) {
  if (!gameState.isPlaying || gameState.isTutorialActive || gameState.isGameOver) return;

  const placePos = { x: gameState.king.x, y: gameState.king.y + 1 };
  const cost = ClasePieza.cost;

  if (gameState.credits < cost && !gameState.cheats.infinityAmmo) {
    showFloatingText(gameState.king.x, gameState.king.y, "FONDOS INSUFICIENTES", "life-loss");
    return;
  }

  const blockedByAlly = gameState.allies.some(a => a.x === placePos.x && a.y === placePos.y && !a.muerto);
  if (blockedByAlly) return;

  const enemy = gameState.enemies.find(e => e.x === placePos.x && e.y === placePos.y && !e.muerto);
  if (enemy) {
    deductCredits(cost);

    enemy.desaparecer(500);
    soundManager.play("eat");

    const gain = enemy.valor / 2;
    addCredits(gain);
    addScore(gain);
    showFloatingText(placePos.x, placePos.y, `+$${gain}`, "recurso-gain");
    return;
  }

  deductCredits(cost);
  const newAlly = new ClasePieza(placePos.x, placePos.y);
  gameState.allies.push(newAlly);
  soundManager.play("eat");
}

function dispararProyectil(ClaseProyectil) {
  if (!gameState.isPlaying || gameState.isTutorialActive || gameState.isGameOver) return;

  const cost = ClaseProyectil.cost;

  if (gameState.credits < cost && !gameState.cheats.infinityAmmo) {
    showFloatingText(gameState.king.x, gameState.king.y, "FONDOS INSUFICIENTES", "life-loss");
    return;
  }

  deductCredits(cost);
  const proj = new ClaseProyectil(gameState.king.x, gameState.king.y);
  gameState.allies.push(proj);
}

function buildWaveQueue(count) {
  gameState.enemiesQueued = [];
  for (let i = 0; i < count; i++) {
    gameState.enemiesQueued.push(getRandomEnemyType());
  }
  gameState.enemiesRemaining = count;
  updateHUD();
}

function getRandomEnemyType() {
  const w = gameState.currentWave;
  const pool = [];

  if (w >= 1) pool.push(PeonEnemigo);
  if (w >= 3) pool.push(TorreNegro);
  if (w >= 5) pool.push(AlfilNegro);
  if (w >= 7) pool.push(CaballoNegro);
  if (w >= 20) pool.push(DamaNegro);

  const Choice = pool.length === 0 ? PeonEnemigo : pool[Math.floor(Math.random() * pool.length)];
  return Choice;
}

function spawnearSiguienteEnemigo() {
  if (gameState.enemiesQueued.length > 0) {
    const EnemyClass = gameState.enemiesQueued.shift();
    const enemy = new EnemyClass();
    gameState.enemies.push(enemy);
  } else {
    clearInterval(gameState.spawnerTimerId);
    gameState.spawnerTimerId = null;
  }
  updateHUD();
}

function moverTodosLosEnemigos() {
  if (gameState.isTransitionActive || gameState.isGameOver) return;

  const toMove = [...gameState.enemies];
  toMove.forEach(e => e.avanzar());

  cleanInactiveEntities();
}

function cleanInactiveEntities() {
  gameState.allies = gameState.allies.filter(a => {
    if (a.y === 0 || a.muerto) {
      if (a.dom && a.dom.parentNode) a.dom.parentNode.removeChild(a.dom);
      return false;
    }
    return true;
  });

  gameState.enemies = gameState.enemies.filter(e => {
    if (e.muerto) {
      if (e.dom && e.dom.parentNode) e.dom.parentNode.removeChild(e.dom);
      return false;
    }
    return true;
  });
}

function startWaveTimers() {
  if (!gameState.spawnerTimerId && gameState.enemiesQueued.length > 0) {
    gameState.spawnerTimerId = setInterval(() => {
      spawnearSiguienteEnemigo();
    }, gameState.spawnInterval);
  }

  if (!gameState.moverTimerId) {
    gameState.moverTimerId = setInterval(() => {
      moverTodosLosEnemigos();
    }, gameState.moveInterval);
  }

  if (!gameState.collisionTimerId) {
    gameState.collisionTimerId = setInterval(() => {
      verificarColisiones();
    }, 500);
  }
}

function stopWaveTimers() {
  if (gameState.spawnerTimerId) {
    clearInterval(gameState.spawnerTimerId);
    gameState.spawnerTimerId = null;
  }
  if (gameState.moverTimerId) {
    clearInterval(gameState.moverTimerId);
    gameState.moverTimerId = null;
  }
  if (gameState.collisionTimerId) {
    clearInterval(gameState.collisionTimerId);
    gameState.collisionTimerId = null;
  }
}

function verificarColisiones() {
  gameState.allies.forEach(a => a.intentarCapturar());

  if (gameState.enemiesQueued.length === 0 && gameState.enemies.length === 0 && !gameState.isTransitionActive) {
    siguienteNivel();
  }
}

function siguienteNivel() {
  gameState.isTransitionActive = true;
  stopWaveTimers();

  gameState.currentWave++;
  showFloatingText(gameState.king.x, gameState.king.y, "OLEADA COMPLETADA!", "recurso-gain");
  soundManager.play("eat");

  const transitionImg = document.createElement('img');
  transitionImg.className = 'board-overlay-effect';
  transitionImg.src = 'assets/OleadaGanada.gif';
  transitionImg.style.left = `${2 * CELL_SIZE}px`;
  transitionImg.style.bottom = `${4 * CELL_SIZE}px`;
  document.getElementById('board').appendChild(transitionImg);

  setTimeout(() => {
    if (transitionImg.parentNode) transitionImg.parentNode.removeChild(transitionImg);

    buildWaveQueue(gameState.currentWave + 5);

    gameState.isTransitionActive = false;
    startWaveTimers();
  }, 2000);
}

function perderVidaRey() {
  if (gameState.cheats.godMode) return;

  gameState.lives--;
  soundManager.play("hurt");
  showFloatingText(gameState.king.x, gameState.king.y, "-1 VIDA", "life-loss");
  updateKingSprite();

  if (gameState.lives <= 0) {
    gameOver();
  }
  updateHUD();
}

function gameOver() {
  gameState.isPlaying = false;
  gameState.isGameOver = true;
  stopWaveTimers();
  soundManager.stopFondo();
  soundManager.play("gameOver");

  document.getElementById('final-score').textContent = gameState.score;
  document.getElementById('final-wave').textContent = gameState.currentWave;

  document.getElementById('name-prompt-overlay').classList.add('active');
  document.getElementById('playerNameInput').focus();
}

function resetGameEngine() {
  document.getElementById('name-prompt-overlay').classList.remove('active');
  document.getElementById('jaque-warning').classList.add('hidden');

  stopWaveTimers();

  const entities = document.querySelectorAll('.game-entity, .board-overlay-effect, .floating-speech, .floating-text-indicator');
  entities.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el);
  });

  gameState.allies = [];
  gameState.enemies = [];
  gameState.enemiesQueued = [];

  gameState.score = 0;
  gameState.credits = 100;

  gameState.lives = gameState.cheats.hardmode ? 0 : 3;

  gameState.currentWave = 1;
  gameState.isGameOver = false;

  gameState.king.x = 2;
  gameState.king.y = 0;

  soundManager.stopFondo();
  document.getElementById('main-menu-overlay').classList.add('active');
  updateHUD();
}

function updateHUD() {
  document.getElementById('ui-score').textContent = gameState.score;
  document.getElementById('ui-recurso').textContent = gameState.credits;
  document.getElementById('ui-piezasRestantes').textContent = gameState.enemiesQueued.length + gameState.enemies.length;
  document.getElementById('ui-oleadaActual').textContent = gameState.currentWave;
  document.getElementById('ui-vida').textContent = gameState.lives;
}

function showFloatingText(gridX, gridY, text, className) {
  const board = document.getElementById('board');
  const span = document.createElement('span');
  span.className = `floating-text-indicator ${className}`;
  span.textContent = text;
  span.style.left = `${gridX * CELL_SIZE + (CELL_SIZE / 2)}px`;
  span.style.bottom = `${gridY * CELL_SIZE + (CELL_SIZE / 2)}px`;

  board.appendChild(span);

  setTimeout(() => {
    if (span.parentNode) span.parentNode.removeChild(span);
  }, 1400);
}

function showSpeechBubble(pieceInstance, text) {
  if (!pieceInstance.dom) return;
  const board = document.getElementById('board');
  const div = document.createElement('div');
  div.className = 'floating-speech';
  div.textContent = text;
  div.style.left = `${pieceInstance.x * CELL_SIZE + (CELL_SIZE / 2)}px`;
  div.style.bottom = `${pieceInstance.y * CELL_SIZE + CELL_SIZE}px`;

  board.appendChild(div);

  setTimeout(() => {
    if (div.parentNode) div.parentNode.removeChild(div);
  }, 2000);
}

function spawnExplosionParticles(gridX, gridY, color) {
  const board = document.getElementById('board');
  const centerX = gridX * CELL_SIZE + (CELL_SIZE / 2);
  const centerY = gridY * CELL_SIZE + (CELL_SIZE / 2);

  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.backgroundColor = color;
    p.style.left = `${centerX}px`;
    p.style.bottom = `${centerY}px`;

    board.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const velocity = 2 + Math.random() * 5;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;

    let posX = centerX;
    let posY = centerY;

    const interval = setInterval(() => {
      posX += vx;
      posY += vy;
      p.style.left = `${posX}px`;
      p.style.bottom = `${posY}px`;
    }, 30);

    setTimeout(() => {
      clearInterval(interval);
      if (p.parentNode) p.parentNode.removeChild(p);
    }, 600);
  }
}

function addHighScore(name, scoreValue) {
  let scores = [];
  const raw = localStorage.getItem('chess_td_leaderboard');
  if (raw) {
    try {
      scores = JSON.parse(raw);
    } catch (e) {
      scores = [];
    }
  }

  scores.push({ name, score: scoreValue, date: new Date().toLocaleDateString() });

  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 5);

  localStorage.setItem('chess_td_leaderboard', JSON.stringify(scores));
  displayLeaderboardData();
}

function displayLeaderboardData() {
  const tbody = document.getElementById('leaderboard-rows');
  tbody.innerHTML = '';

  let scores = [];
  const raw = localStorage.getItem('chess_td_leaderboard');
  if (raw) {
    try {
      scores = JSON.parse(raw);
    } catch (e) {
      scores = [];
    }
  }

  scores.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    if (idx === 0) tr.className = 'highlight';
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${entry.name}</td>
      <td>${entry.score}</td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleLeaderboardOverlay() {
  const lb = document.getElementById('leaderboard-overlay');
  if (gameState.isLeaderboardVisible) {
    lb.classList.remove('active');
    gameState.isLeaderboardVisible = false;
  } else {
    lb.classList.add('active');
    gameState.isLeaderboardVisible = true;
    displayLeaderboardData();
  }
}
