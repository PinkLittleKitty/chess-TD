class Piece {
  constructor(x, y, valor, color, image) {
    this.x = x;
    this.y = y;
    this.valor = valor;
    this.color = color;
    this.image = image;
    this.muerto = false;
    this.vidas = 1;
    this.dom = null;

    this.spawnDOM();
  }

  spawnDOM() {
    const board = document.getElementById('board');
    const img = document.createElement('img');
    img.className = `game-entity ${this.color === 'blanco' ? 'aliado' : 'enemigo'}`;
    img.src = `assets/${this.image}`;

    img.style.left = `${this.x * CELL_SIZE}px`;
    img.style.bottom = `${this.y * CELL_SIZE}px`;

    board.appendChild(img);
    this.dom = img;
  }

  mover(targetX, targetY) {
    if (this.muerto) return;
    if (targetX >= 0 && targetX < BOARD_WIDTH && targetY >= 0 && targetY < BOARD_HEIGHT) {
      this.x = targetX;
      this.y = targetY;

      if (this.dom) {
        this.dom.style.left = `${this.x * CELL_SIZE}px`;
        this.dom.style.bottom = `${this.y * CELL_SIZE}px`;
      }
    }
  }

  perderVida() {
    this.vidas--;
    if (this.vidas <= 0) {
      this.desaparecer(500);
    }
  }

  desaparecer(timeMs) {
    if (this.muerto) return;
    this.muerto = true;

    if (gameState.cheats.sangre) {
      spawnExplosionParticles(this.x, this.y, '#e74c3c');
      if (this.dom) this.dom.src = 'assets/Blood.gif';
    } else {
      if (this.dom) this.dom.src = 'assets/PBlancoMuerto.gif';
    }

    setTimeout(() => {
      if (this.dom && this.dom.parentNode) {
        this.dom.parentNode.removeChild(this.dom);
      }
    }, timeMs);
  }

  posicionValida(targetX, targetY) {
    if (targetX < 0 || targetX >= BOARD_WIDTH || targetY < 0 || targetY >= BOARD_HEIGHT) {
      return false;
    }

    if (this.color === 'blanco') {
      return !gameState.allies.some(a => a.x === targetX && a.y === targetY && !a.muerto);
    } else {
      return !gameState.enemies.some(e => e.x === targetX && e.y === targetY && !e.muerto);
    }
  }
}

class AlliedPiece extends Piece {
  constructor(x, y, valor, image) {
    super(x, y, valor, 'blanco', image);
    this.combo = 1;
    this.comboTimerId = null;
  }

  getPosicionesCapturables() {
    return [];
  }

  intentarCapturar() {
    if (this.muerto) return;

    const targets = this.getPosicionesCapturables();
    for (let target of targets) {
      const enemy = gameState.enemies.find(e => e.x === target.x && e.y === target.y && !e.muerto);
      if (enemy) {
        this.capturar(enemy);
        return;
      }
    }

    const frontPos = { x: this.x, y: this.y + 1 };
    const enemyInFront = gameState.enemies.find(e => e.x === frontPos.x && e.y === frontPos.y && !e.muerto);
    if (enemyInFront) {
      enemyInFront.desaparecer(250);
      this.desaparecer(500);

      const bonus = enemyInFront.valor / 2;
      addCredits(bonus);
      addScore(bonus);
      showFloatingText(this.x, this.y, `+$${bonus}`, "recurso-gain");
    }
  }

  capturar(enemy) {
    if (this.muerto || enemy.muerto) return;

    const targetX = enemy.x;
    const targetY = enemy.y;

    this.mover(targetX, targetY);
    enemy.desaparecer(250);
    soundManager.play("eat");

    const baseReward = enemy.valor;
    const finalReward = baseReward * this.combo;

    addCredits(finalReward);
    addScore(finalReward);
    showFloatingText(targetX, targetY, `+$${finalReward}`, "recurso-gain");

    if (this.combo > 1) {
      showSpeechBubble(this, `x${this.combo}`);
    }

    this.combo++;

    if (this.comboTimerId) clearTimeout(this.comboTimerId);
    this.comboTimerId = setTimeout(() => {
      this.combo = 1;
    }, 2000);

    this.intentarCoronar();
  }

  intentarCoronar() {
    if (this.y === BOARD_HEIGHT - 1) {
      this.coronar();
    }
  }

  coronar() {
    if (this.muerto) return;
    this.muerto = true;

    const reward = this.valor * 5;
    addCredits(reward);
    addScore(reward);

    showFloatingText(this.x, this.y, `CORONADO! +$${reward}`, "recurso-gain");
    soundManager.play("eat");

    const overlay = document.createElement('img');
    overlay.className = 'board-overlay-effect';
    overlay.src = 'assets/Coronar.gif';
    overlay.style.left = `${this.x * CELL_SIZE}px`;
    overlay.style.bottom = `${this.y * CELL_SIZE}px`;
    document.getElementById('board').appendChild(overlay);

    if (this.dom) this.dom.style.opacity = '0.5';

    setTimeout(() => {
      if (this.dom && this.dom.parentNode) this.dom.parentNode.removeChild(this.dom);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

      gameState.allies = gameState.allies.filter(a => a !== this);
    }, 1400);
  }
}

class PeonBlanco extends AlliedPiece {
  constructor(x, y) {
    super(x, y, 20, 'PBlanco.png');
  }

  getPosicionesCapturables() {
    return [
      { x: this.x - 1, y: this.y + 1 },
      { x: this.x + 1, y: this.y + 1 }
    ];
  }
}

class CaballoBlanco extends AlliedPiece {
  constructor(x, y) {
    super(x, y, 50, 'CBlanco.png');
  }

  getPosicionesCapturables() {
    return [
      { x: this.x - 1, y: this.y + 2 },
      { x: this.x + 1, y: this.y + 2 },
      { x: this.x - 2, y: this.y + 1 },
      { x: this.x + 2, y: this.y + 1 }
    ];
  }
}

class Proyectil extends AlliedPiece {
  constructor(x, y, valor, image, speedMs, diagonal = false) {
    super(x, y, valor, image);
    this.speedMs = speedMs;
    this.diagonal = diagonal;
    this.projectileTimerId = null;

    this.iniciarProyectil();
  }

  iniciarProyectil() {
    this.projectileTimerId = setInterval(() => {
      this.avanzarYComer();
    }, this.speedMs);
  }

  avanzarYComer() {
    if (this.muerto) {
      clearInterval(this.projectileTimerId);
      return;
    }

    let nextX = this.x;
    let nextY = this.y + 1;

    if (this.diagonal) {
      const choices = [-1, 1];
      const randDir = choices[Math.floor(Math.random() * choices.length)];
      nextX += randDir;
    }

    if (nextY >= BOARD_HEIGHT || nextX < 0 || nextX >= BOARD_WIDTH) {
      this.mover(nextX, nextY);
      this.intentarCoronar();
      if (nextY >= BOARD_HEIGHT && !this.muerto) {
        this.desaparecer(0);
      }
      return;
    }

    this.mover(nextX, nextY);
    this.intentarCapturar();
    this.intentarCoronar();
  }

  coronar() {
    if (this.muerto) return;
    this.muerto = true;
    clearInterval(this.projectileTimerId);

    const reward = Math.floor(this.valor / 4);
    addCredits(reward);
    addScore(reward);

    showFloatingText(this.x, this.y, `CORONADO! +$${reward}`, "recurso-gain");
    soundManager.play("eat");

    const overlay = document.createElement('img');
    overlay.className = 'board-overlay-effect';
    overlay.src = 'assets/Coronar.gif';
    overlay.style.left = `${this.x * CELL_SIZE}px`;
    overlay.style.bottom = `${this.y * CELL_SIZE}px`;
    document.getElementById('board').appendChild(overlay);

    if (this.dom) this.dom.style.opacity = '0.5';

    setTimeout(() => {
      if (this.dom && this.dom.parentNode) this.dom.parentNode.removeChild(this.dom);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

      gameState.allies = gameState.allies.filter(a => a !== this);
    }, 1400);
  }

  desaparecer(timeMs) {
    clearInterval(this.projectileTimerId);
    super.desaparecer(timeMs);
    gameState.allies = gameState.allies.filter(a => a !== this);
  }
}

class TorreBlanca extends Proyectil {
  constructor(x, y) {
    super(x, y, 100, 'TBlanco.png', 125, false);
  }

  getPosicionesCapturables() {
    return [
      { x: this.x, y: this.y + 1 },
      { x: this.x, y: this.y + 2 }
    ];
  }
}

class AlfilBlanco extends Proyectil {
  constructor(x, y) {
    super(x, y, 70, 'ABlanco.png', 250, true);
  }

  getPosicionesCapturables() {
    return [
      { x: this.x - 1, y: this.y + 1 },
      { x: this.x + 1, y: this.y + 1 }
    ];
  }
}

class EnemyPiece extends Piece {
  constructor(valor, image) {
    const spawnX = Math.floor(Math.random() * BOARD_WIDTH);
    super(spawnX, 7, valor, 'negro', image);

    this.jaqueCounter = JAQUE_TICKS_LIMIT;
    this.jaqueVisual = null;
    this.direccionesRandomizadas = [];
  }

  getPosicionesAvanzables() {
    return [];
  }

  getPosicionesCapturables() {
    return this.getPosicionesAvanzables();
  }

  actualizarDirecciones() {
    const dirs = this.getPosicionesAvanzables();
    this.direccionesRandomizadas = dirs.sort(() => Math.random() - 0.5);
  }

  siguientePosicion() {
    if (this.direccionesRandomizadas.length === 0) {
      this.actualizarDirecciones();
    }

    const candidatos = this.direccionesRandomizadas.filter(pos => this.posicionValida(pos.x, pos.y));
    return candidatos.length === 0 ? { x: this.x, y: this.y } : candidatos[Math.floor(Math.random() * candidatos.length)];
  }

  avanzar() {
    if (this.muerto) return;

    if (this.y === 1 && this.jaqueCounter >= 1) {
      this.jaqueCounter--;
      showSpeechBubble(this, `contador ${this.jaqueCounter}`);
      this.intentarAñadirJaque();
    } else {
      const pos = this.siguientePosicion();
      this.mover(pos.x, pos.y);
      this.actualizarDirecciones();
      this.quitarJaqueVisual();
    }

    this.intentarCapturar();
    this.capturarRey();
  }

  intentarAñadirJaque() {
    if (this.muerto) return;

    document.getElementById('jaque-warning').classList.remove('hidden');

    if (!this.jaqueVisual) {
      const overlay = document.createElement('img');
      overlay.className = 'board-overlay-effect';
      overlay.src = 'assets/CheckMate.gif';
      overlay.style.left = `${this.x * CELL_SIZE}px`;
      overlay.style.bottom = `${this.y * CELL_SIZE}px`;
      document.getElementById('board').appendChild(overlay);
      this.jaqueVisual = overlay;
    }
  }

  quitarJaqueVisual() {
    if (this.jaqueVisual) {
      if (this.jaqueVisual.parentNode) this.jaqueVisual.parentNode.removeChild(this.jaqueVisual);
      this.jaqueVisual = null;
    }
    const activeChecks = gameState.enemies.some(e => e.y === 1 && e.jaqueVisual && !e.muerto);
    if (!activeChecks) {
      document.getElementById('jaque-warning').classList.add('hidden');
    }
  }

  mover(targetX, targetY) {
    super.mover(targetX, targetY);
    if (this.jaqueVisual) {
      this.jaqueVisual.style.left = `${targetX * CELL_SIZE}px`;
      this.jaqueVisual.style.bottom = `${targetY * CELL_SIZE}px`;
    }
  }

  intentarCapturar() {
    if (this.muerto) return;

    const targets = this.getPosicionesCapturables();
    for (let target of targets) {
      const ally = gameState.allies.find(a => a.x === target.x && a.y === target.y && !a.muerto);
      if (ally) {
        ally.desaparecer(250);
        soundManager.play("eat");

        const bonus = this.valor + Math.floor(ally.valor / 2);
        addCredits(bonus);
        addScore(bonus);
        showFloatingText(ally.x, ally.y, `+$${bonus}`, "recurso-gain");
        return;
      }
    }
  }

  capturarRey() {
    if (this.y === 0 && !this.muerto) {
      if (gameState.king.x === this.x) {
        perderVidaRey();
        this.desaparecer(500);
      } else {
        perderVidaRey();
        this.desaparecer(500);
      }
    }
  }

  desaparecer(timeMs) {
    this.quitarJaqueVisual();
    super.desaparecer(timeMs);
    gameState.enemies = gameState.enemies.filter(e => e !== this);
  }
}

class PeonEnemigo extends EnemyPiece {
  constructor() {
    super(10, 'PNegro.png');
  }

  getPosicionesAvanzables() {
    return [{ x: this.x, y: this.y - 1 }];
  }
}

class AlfilNegro extends EnemyPiece {
  constructor(valor = 30, image = 'ANegro.png') {
    super(valor, image);
  }

  getPosicionesAvanzables() {
    return [
      { x: this.x - 1, y: this.y - 1 },
      { x: this.x + 1, y: this.y - 1 }
    ];
  }
}

class CaballoNegro extends EnemyPiece {
  constructor() {
    super(50, 'CNegro.png');
  }

  getPosicionesAvanzables() {
    return [
      { x: this.x - 1, y: this.y - 2 },
      { x: this.x + 1, y: this.y - 2 },
      { x: this.x - 2, y: this.y - 1 },
      { x: this.x + 2, y: this.y - 1 }
    ];
  }
}

class TorreNegro extends EnemyPiece {
  constructor() {
    super(50, 'TNegro.png');
  }

  getPosicionesAvanzables() {
    return [{ x: this.x, y: this.y - 1 }];
  }

  getPosicionesCapturables() {
    const sideCaptures = [];
    for (let c = 0; c < BOARD_WIDTH; c++) {
      sideCaptures.push({ x: c, y: this.y });
    }
    sideCaptures.push({ x: this.x, y: this.y - 1 });
    return sideCaptures;
  }
}

class DamaNegro extends AlfilNegro {
  constructor() {
    super(200, 'Dnegro.png');
  }
}
