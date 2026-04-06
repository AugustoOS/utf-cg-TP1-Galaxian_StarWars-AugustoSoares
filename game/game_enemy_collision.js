window.Game = window.Game ? window.Game : {};

Game.checkShotEnemyCollision = function checkShotEnemyCollision() {
	if (!Game.state.shot.active) {
		return;
	}

	const shotWidth = Game.refs.shot.offsetWidth;
	const shotHeight = Game.refs.shot.offsetHeight;
	const shotRect = {
		left: Game.state.shot.x - (shotWidth / 2),
		right: Game.state.shot.x + (shotWidth / 2),
		top: Game.state.shot.y,
		bottom: Game.state.shot.y + shotHeight,
	};

	for (let index = 0; index < Game.state.enemies.length; index += 1) {
		const enemy = Game.state.enemies[index];
		const enemyRect = {
			left: enemy.offsetLeft,
			right: enemy.offsetLeft + enemy.offsetWidth,
			top: enemy.offsetTop,
			bottom: enemy.offsetTop + enemy.offsetHeight,
		};

		const hasCollision = (
			shotRect.left < enemyRect.right
			&& shotRect.right > enemyRect.left
			&& shotRect.top < enemyRect.bottom
			&& shotRect.bottom > enemyRect.top
		);

		if (hasCollision) {
			enemy.remove();
			Game.state.enemies.splice(index, 1);
			Game.hidePlayerShot();
			Game.updateScore(100);
			break;
		}
	}
};
