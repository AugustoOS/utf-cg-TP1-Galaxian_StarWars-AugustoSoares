window.Game = window.Game ? window.Game : {};

Game.updateEnemyFormation = function updateEnemyFormation(currentTime) {
	const enemyMovement = Game.state.enemyMovement;
	if (enemyMovement.lastTime === 0) {
		enemyMovement.lastTime = currentTime;
	}

	const deltaTime = (currentTime - enemyMovement.lastTime) / 1000;
	enemyMovement.lastTime = currentTime;
	const speedMultiplier = enemyMovement.defensiveBrakeActive ? 0 : 1;
	enemyMovement.offsetX += enemyMovement.direction * enemyMovement.baseSpeed * speedMultiplier * deltaTime;

	const movementLimit = Game.getHorizontalMovementLimit();
	if (enemyMovement.offsetX <= -movementLimit) {
		enemyMovement.offsetX = -movementLimit;
		enemyMovement.direction = 1;
	}

	if (enemyMovement.offsetX >= movementLimit) {
		enemyMovement.offsetX = movementLimit;
		enemyMovement.direction = -1;
	}

	Game.layoutEnemies();
	window.requestAnimationFrame(Game.updateEnemyFormation);
};

Game.updatePlayerShot = function updatePlayerShot(currentTime) {
	const shotState = Game.state.shot;
	if (!shotState.active) {
		shotState.lastTime = 0;
		Game.setFleetBrakeActive(false);
		window.requestAnimationFrame(Game.updatePlayerShot);
		return;
	}

	if (shotState.lastTime === 0) {
		shotState.lastTime = currentTime;
	}

	const deltaTime = (currentTime - shotState.lastTime) / 1000;
	shotState.lastTime = currentTime;
	const previousShotY = shotState.y;
	shotState.y -= shotState.speed * deltaTime;
	Game.checkShotEnemyCollision();
	Game.maybeTriggerDefensiveBrake(previousShotY);
	Game.maybeReleaseDefensiveBrake();

	if (shotState.y + Game.refs.shot.offsetHeight < 0) {
		Game.hidePlayerShot();
		window.requestAnimationFrame(Game.updatePlayerShot);
		return;
	}

	Game.updatePlayerShotPosition();
	window.requestAnimationFrame(Game.updatePlayerShot);
};

window.addEventListener('keydown', (event) => {
	if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
		Game.state.movement.left = true;
	}

	if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
		Game.state.movement.right = true;
	}
});

window.addEventListener('keyup', (event) => {
	if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
		Game.state.movement.left = false;
	}

	if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
		Game.state.movement.right = false;
	}
});

window.addEventListener('keydown', (event) => {
	if (event.code === 'Space') {
		Game.spawnPlayerShot();
	}
});

window.addEventListener('resize', () => {
	Game.clampPlayerPosition();
	const movementLimit = Game.getHorizontalMovementLimit();
	Game.state.enemyMovement.offsetX = Math.min(Math.max(Game.state.enemyMovement.offsetX, -movementLimit), movementLimit);
	Game.layoutEnemies();
});

Game.createEnemyFormation();
Game.clampPlayerPosition();
window.requestAnimationFrame(Game.updatePlayerPosition);
window.requestAnimationFrame(Game.updatePlayerShot);
window.requestAnimationFrame(Game.updateEnemyFormation);
