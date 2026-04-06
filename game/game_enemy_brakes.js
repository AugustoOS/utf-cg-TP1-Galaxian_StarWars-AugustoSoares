window.Game = window.Game ? window.Game : {};

Game.setFleetBrakeActive = function setFleetBrakeActive(isActive) {
	Game.state.enemyMovement.defensiveBrakeActive = isActive;
};


Game.maybeTriggerDefensiveBrake = function maybeTriggerDefensiveBrake(previousShotY) {
	const shotState = Game.state.shot;
	if (!shotState.active || shotState.defenseBrakeTriggered) {
		return;
	}

	const frontRowEnemies = Game.getFrontAliveRowEnemies();
	if (frontRowEnemies.length === 0) {
		return;
	}

	const rowTop = Math.min(...frontRowEnemies.map((enemy) => enemy.offsetTop));
	const rowBottom = Math.max(...frontRowEnemies.map((enemy) => enemy.offsetTop + enemy.offsetHeight));
	const rowMidY = rowTop + ((rowBottom - rowTop) / 2);
	const crossedFrontRowMid = previousShotY > rowMidY && shotState.y <= rowMidY;
	if (!crossedFrontRowMid) {
		return;
	}

	const halfShotWidth = Game.refs.shot.offsetWidth / 2;
	const shotLeft = shotState.x - halfShotWidth;
	const shotRight = shotState.x + halfShotWidth;
	const collidesWithFrontRow = frontRowEnemies.some((enemy) => (
		shotLeft < enemy.offsetLeft + enemy.offsetWidth
		&& shotRight > enemy.offsetLeft
	));

	if (!collidesWithFrontRow) {
		Game.setFleetBrakeActive(true);
		shotState.defenseBrakeTriggered = true;
	}
};

Game.maybeReleaseDefensiveBrake = function maybeReleaseDefensiveBrake() {
	const shotState = Game.state.shot;
	if (!shotState.active || !shotState.defenseBrakeTriggered) {
		return;
	}

	const backRowEnemies = Game.getBackAliveRowEnemies();
	if (backRowEnemies.length === 0) {
		Game.setFleetBrakeActive(false);
		return;
	}

	const backRowTop = Math.min(...backRowEnemies.map((enemy) => enemy.offsetTop));
	const shotBottom = shotState.y + Game.refs.shot.offsetHeight;
	if (shotBottom < backRowTop) {
		Game.setFleetBrakeActive(false);
	}
};
