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

	const frontRowRects = frontRowEnemies.map((enemy) => Game.getEnemyTightRect(enemy));
	const rowTop = Math.min(...frontRowRects.map((enemyRect) => enemyRect.top));
	const rowBottom = Math.max(...frontRowRects.map((enemyRect) => enemyRect.bottom));
	const rowMidY = rowTop + ((rowBottom - rowTop) / 2);
	const shotBounds = Game.computeImageTightBounds(Game.refs.shot);
	const shotHeight = Game.refs.shot.offsetHeight;
	const previousShotTop = previousShotY + (shotBounds.fracY * shotHeight);
	const currentShotTop = Game.getShotTightRect().top;
	const crossedFrontRowMid = previousShotTop > rowMidY && currentShotTop <= rowMidY;
	if (!crossedFrontRowMid) {
		return;
	}

	const shotRect = Game.getShotTightRect();
	const collidesWithFrontRow = frontRowRects.some((enemyRect) => (
		shotRect.left < enemyRect.right
		&& shotRect.right > enemyRect.left
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

	const backRowTop = Math.min(...backRowEnemies.map((enemy) => Game.getEnemyTightRect(enemy).top));
	const shotBottom = Game.getShotTightRect().bottom;
	if (shotBottom < backRowTop) {
		Game.setFleetBrakeActive(false);
	}
};
