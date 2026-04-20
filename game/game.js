window.Game = window.Game ? window.Game : {};

// Reseta clocks dos loops para nao ter salto de frame ao voltar.
Game.resetGameplayTimings = function resetGameplayTimings() {
	Game.state.movement.lastTime = 0;
	Game.state.playerShot.lastTime = 0;
	Game.state.enemyMovement.lastTime = 0;
	Game.state.enemyShotsLastTime = 0;
	Game.state.background.lastTime = 0;
};

Game.goToMenuWithTransition = function goToMenuWithTransition() {
	var TRANSITION_DURATION_MS = 1000;

	// evita disparar a transicao duas vezes se o botao for clicado rapido
	if (Game.state.transitioningToMenu) {
		return;
	}

	Game.state.transitioningToMenu = true;

	var transition = document.querySelector('.screen-transition-game');
	if (!transition) {
		transition = document.createElement('div');
		transition.className = 'screen-transition-game';
		document.body.appendChild(transition);
	}

	window.requestAnimationFrame(function () {
		transition.classList.add('screen-transition-game--active');
	});

	// guarda flag no sessionStorage pra pagina do menu saber que deve entrar com animacao
	window.setTimeout(function () {
		sessionStorage.setItem('menuTransitionIn', '1');
		window.location.href = '../index.html';
	}, TRANSITION_DURATION_MS);
};

Game.hidePauseScreen = function hidePauseScreen() {
	var paused = document.querySelector('.pause-overlay');
	if (paused) {
		paused.remove();
	}
};

Game.showPauseScreen = function showPauseScreen() {
	Game.hidePauseScreen();

	var overlay = document.createElement('div');
	overlay.className = 'pause-overlay';
	overlay.innerHTML =
		'<div class="pause-box">' +
			'<h1 class="pause-title">PAUSE</h1>' +
			'<div class="pause-buttons">' +
				'<button class="pause-btn pause-btn--primary" id="btn-resume">RETORNAR</button>' +
				'<button class="pause-btn pause-btn--secondary" id="btn-pause-menu">MENU</button>' +
			'</div>' +
		'</div>';

	Game.refs.gameFrame.appendChild(overlay);

	window.requestAnimationFrame(function () {
		overlay.classList.add('pause-overlay--visible');
	});

	var resumeBtn = document.getElementById('btn-resume');
	var menuBtn = document.getElementById('btn-pause-menu');

	if (resumeBtn) {
		resumeBtn.addEventListener('click', function () {
			Game.resumeGame();
		});
	}

	if (menuBtn) {
		menuBtn.addEventListener('click', function () {
			Game.goToMenuWithTransition();
		});
	}
};

Game.pauseGame = function pauseGame() {
	if (Game.state.gameOver || Game.state.paused) {
		return;
	}

	Game.state.paused = true;
	// zera as teclas pressionadas pra nave nao continuar andando ao despausar
	Game.state.movement.left = false;
	Game.state.movement.right = false;
	Game.setFleetBrakeActive(false);
	Game.resetGameplayTimings();
	Game.showPauseScreen();
};

Game.resumeGame = function resumeGame() {
	if (!Game.state.paused || Game.state.gameOver) {
		return;
	}

	Game.state.paused = false;
	Game.resetGameplayTimings();
	Game.hidePauseScreen();
};

Game.updateEnemyFormation = function updateEnemyFormation(currentTime) {
	if (Game.state.gameOver) return;
	if (Game.state.paused) {
		// Mantem o loop vivo mesmo pausado para retomar sem recriar tudo.
		Game.state.enemyMovement.lastTime = 0;
		window.requestAnimationFrame(Game.updateEnemyFormation);
		return;
	}

	const em = Game.state.enemyMovement;
	if (em.lastTime === 0) em.lastTime = currentTime;

	const dt = (currentTime - em.lastTime) / 1000;
	em.lastTime = currentTime;

	const speedMul = em.defensiveBrakeActive ? 0 : 1; // freada defensiva: congela o movimento lateral
	em.offsetX += em.direction * em.baseSpeed * speedMul * dt;

	// inverte direcao ao tocar o limite de cada lado
	const lim = Game.getHorizontalMovementLimits();
	if (em.offsetX <= -lim.left)  { em.offsetX = -lim.left;  em.direction =  1; }
	if (em.offsetX >=  lim.right) { em.offsetX =  lim.right; em.direction = -1; }

	Game.layoutEnemies();
	Game.updateEnemyDive(currentTime, dt);
	Game.checkEnemyPlayerCollision();
	window.requestAnimationFrame(Game.updateEnemyFormation);
};

Game.updatePlayerShot = function updatePlayerShot(currentTime) {
	if (Game.state.gameOver) return;
	if (Game.state.paused) {
		Game.state.playerShot.lastTime = 0;
		window.requestAnimationFrame(Game.updatePlayerShot);
		return;
	}

	const shotState = Game.state.playerShot;
	// sem tiro ativo: garante que o freio defensivo nao fica preso
	if (!shotState.active) {
		shotState.lastTime = 0;
		Game.setFleetBrakeActive(false);
		window.requestAnimationFrame(Game.updatePlayerShot);
		return;
	}

	if (shotState.lastTime === 0) shotState.lastTime = currentTime;

	const dt = (currentTime - shotState.lastTime) / 1000;
	shotState.lastTime = currentTime;
	const previousShotY = shotState.y;
	shotState.y -= shotState.speed * dt;
	Game.checkShotEnemyCollision();
	Game.checkTriggerDefensiveBrake(previousShotY);
	Game.checkReleaseDefensiveBrake();

	// tiro saiu pela parte de cima da tela
	if (shotState.y + Game.refs.playerShot.offsetHeight < 0) {
		Game.hidePlayerShot();
		window.requestAnimationFrame(Game.updatePlayerShot);
		return;
	}

	Game.updatePlayerShotPosition();
	window.requestAnimationFrame(Game.updatePlayerShot);
};

window.addEventListener('keydown', (event) => {
	if (event.code === 'Escape') {
		event.preventDefault();
		if (Game.state.paused) {
			Game.resumeGame();
		} else {
			Game.pauseGame();
		}
		return;
	}

	if (event.key === 'r' || event.key === 'R') {
		event.preventDefault();
		Game.goToMenuWithTransition();
		return;
	}

	if (Game.state.paused || Game.state.gameOver) {
		return;
	}

	if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft')  Game.state.movement.left  = true;
	if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') Game.state.movement.right = true;
});
window.addEventListener('keyup', (event) => {
	if (Game.state.paused || Game.state.gameOver) {
		return;
	}

	if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft')  Game.state.movement.left  = false;
	if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') Game.state.movement.right = false;
});
window.addEventListener('keydown', (event) => {
	if (Game.state.paused || Game.state.gameOver) {
		return;
	}

	if (event.code === 'Space') Game.spawnPlayerShot();
});

window.addEventListener('resize', () => {
	Game.clampPlayerPosition();
	// recalcula os limites e reposiciona o grid pra nao ficar fora da tela apos resize
	const lim = Game.getHorizontalMovementLimits();
	Game.state.enemyMovement.offsetX = Math.min(Math.max(Game.state.enemyMovement.offsetX, -lim.left), lim.right);
	Game.layoutEnemies();
	Game.initializeBackgroundStarfield();
});

window.addEventListener('visibilitychange', () => {
	// pausa automaticamente se o jogador trocar de aba
	if (document.hidden && !Game.state.gameOver) {
		Game.pauseGame();
	}
	if (!document.hidden) Game.resetBackgroundTiming();
});

// inicializacao — ordem importa: lives e formacao antes de comecar os loops
Game.updateLives();
Game.createEnemyFormation();
Game.initializeBackgroundStarfield();
Game.clampPlayerPosition();
// dispara todos os loops de animacao independentes
window.requestAnimationFrame(Game.updatePlayerPosition);
window.requestAnimationFrame(Game.updatePlayerShot);
window.requestAnimationFrame(Game.updateEnemyFormation);
window.requestAnimationFrame(Game.updateBackgroundStarfield);
window.requestAnimationFrame(Game.updateEnemyShots);
