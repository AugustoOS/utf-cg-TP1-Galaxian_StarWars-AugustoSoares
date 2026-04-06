window.Game = window.Game ? window.Game : {};

Game.updatePlayerShotPosition = function updatePlayerShotPosition() {
	Game.refs.shot.style.left = `${Game.state.shot.x}px`;
	Game.refs.shot.style.top = `${Game.state.shot.y}px`;
};

Game.hidePlayerShot = function hidePlayerShot() {
	Game.state.shot.active = false;
	Game.setFleetBrakeActive(false);
	Game.refs.shot.style.display = 'none';
};

Game.spawnPlayerShot = function spawnPlayerShot() {
	if (Game.state.shot.active) {
		return;
	}

	const frameRect = Game.getGameBounds();
	const playerRect = Game.refs.playerShip.getBoundingClientRect();

	Game.state.shot.active = true;
	Game.state.shot.lastTime = 0;
	Game.state.shot.defenseBrakeTriggered = false;
	Game.state.shot.x = (playerRect.left - frameRect.left) + (playerRect.width / 2);
	Game.state.shot.y = (playerRect.top - frameRect.top) - Game.refs.shot.offsetHeight;

	Game.refs.shot.style.display = 'block';
	Game.updatePlayerShotPosition();
};

Game.updatePlayerPosition = function updatePlayerPosition(currentTime) {
	const movement = Game.state.movement;
	if (movement.lastTime === 0) {
		movement.lastTime = currentTime;
	}

	const deltaTime = (currentTime - movement.lastTime) / 1000;
	movement.lastTime = currentTime;

	if (movement.left) {
		movement.x -= movement.speed * deltaTime;
	}

	if (movement.right) {
		movement.x += movement.speed * deltaTime;
	}

	Game.clampPlayerPosition();
	window.requestAnimationFrame(Game.updatePlayerPosition);
};
