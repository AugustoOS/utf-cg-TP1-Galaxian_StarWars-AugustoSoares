window.Game = window.Game ? window.Game : {};

Game.createEnemyFormation = function createEnemyFormation() {
	Game.enemyRows.forEach((enemyRow, rowIndex) => {
		for (let columnIndex = 0; columnIndex < enemyRow.count; columnIndex += 1) {
			const enemy = document.createElement('img');
			enemy.className = 'enemy-ship';
			enemy.src = enemyRow.src;
			enemy.alt = `Inimigo ${enemyRow.color}`;
			enemy.dataset.row = rowIndex;
			enemy.dataset.column = columnIndex;
			enemy.dataset.count = enemyRow.count;
			Game.refs.gameFrame.appendChild(enemy);
			Game.state.enemies.push(enemy);
		}
	});

	Game.layoutEnemies();
};

Game.layoutEnemies = function layoutEnemies() {
	if (Game.state.enemies.length === 0) {
		return;
	}

	const sampleEnemy = Game.state.enemies[0];
	const enemyWidth = sampleEnemy.offsetWidth;
	const enemyHeight = sampleEnemy.offsetHeight;
	const gapX = 15;
	const columnSpacing = enemyWidth + gapX;
	const rowSpacing = enemyHeight + 12;
	const startY = 80;
	Game.state.enemyMovement.maxRowWidth = 0;

	Game.state.enemies.forEach((enemy) => {
		const rowIndex = Number(enemy.dataset.row);
		const columnIndex = Number(enemy.dataset.column);
		const enemyCount = Number(enemy.dataset.count);
		const rowWidth = (enemyCount * enemyWidth) + ((enemyCount - 1) * gapX);
		const startX = ((Game.refs.gameFrame.clientWidth - rowWidth) / 2) + Game.state.enemyMovement.offsetX;
		const enemyX = startX + (columnIndex * columnSpacing);
		const enemyY = startY + (rowIndex * rowSpacing);

		Game.state.enemyMovement.maxRowWidth = Math.max(Game.state.enemyMovement.maxRowWidth, rowWidth);

		enemy.style.left = `${enemyX}px`;
		enemy.style.top = `${enemyY}px`;
	});
};

Game.getFrontAliveRowEnemies = function getFrontAliveRowEnemies() {
	if (Game.state.enemies.length === 0) {
		return [];
	}

	let frontRowIndex = -1;
	for (let index = 0; index < Game.state.enemies.length; index += 1) {
		frontRowIndex = Math.max(frontRowIndex, Number(Game.state.enemies[index].dataset.row));
	}

	return Game.state.enemies.filter((enemy) => Number(enemy.dataset.row) === frontRowIndex);
};

Game.getBackAliveRowEnemies = function getBackAliveRowEnemies() {
	if (Game.state.enemies.length === 0) {
		return [];
	}

	let backRowIndex = Number.POSITIVE_INFINITY;
	for (let index = 0; index < Game.state.enemies.length; index += 1) {
		backRowIndex = Math.min(backRowIndex, Number(Game.state.enemies[index].dataset.row));
	}

	return Game.state.enemies.filter((enemy) => Number(enemy.dataset.row) === backRowIndex);
};
