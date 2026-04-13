window.Game = window.Game ? window.Game : {};

Game.handlePlayerDeath = function handlePlayerDeath() {
	if (Game.state.gameOver) {
		return;
	}

	Game.state.gameOver = true;
	Game.resetScore();
	Game.state.shot.active = false;
	Game.refs.shot.style.display = 'none';
	window.setTimeout(() => {
		window.location.reload();
	}, 250);
};

Game.checkEnemyPlayerCollision = function checkEnemyPlayerCollision() {
	if (Game.state.gameOver || Game.state.enemies.length === 0) {
		return false;
	}

	const playerTriangle = Game.getPlayerTriangle();
	for (let i = 0; i < Game.state.enemies.length; i += 1) {
		const enemyRect = Game.getEnemyTightRect(Game.state.enemies[i]);
		const hasCollision = Game.isRectIntersectingTriangle(enemyRect, playerTriangle);

		if (hasCollision) {
			Game.handlePlayerDeath();
			return true;
		}
	}

	return false;
};

Game.checkShotEnemyCollision = function checkShotEnemyCollision() {
	if (!Game.state.shot.active) {
		return;
	}

	const shotRect = Game.getShotTightRect();

	for (let i = 0; i < Game.state.enemies.length; i += 1) {
		const enemy = Game.state.enemies[i];
		const enemyRect = Game.getEnemyTightRect(enemy);

		const hasCollision = (
			shotRect.left < enemyRect.right
			&& shotRect.right > enemyRect.left
			&& shotRect.top < enemyRect.bottom
			&& shotRect.bottom > enemyRect.top
		);

		if (hasCollision) {
			if (Game.state.enemyMovement.divingEnemy === enemy) {
				Game.state.enemyMovement.divingEnemy = null;
				Game.state.enemyMovement.diveState = 'idle';
				Game.scheduleNextEnemyDive(performance.now());
			}
			const enemyColor = enemy.alt.split(' ').pop().toLowerCase();
			const enemyPoints = Game.getEnemyScore(enemyColor);
			enemy.remove();
			Game.state.enemies.splice(i, 1);
			Game.hidePlayerShot();
			Game.updateScore(enemyPoints);

			if (Game.state.enemies.length === 0) {
				Game.restartEnemyFormation();
			}
			break;
		}
	}
};
