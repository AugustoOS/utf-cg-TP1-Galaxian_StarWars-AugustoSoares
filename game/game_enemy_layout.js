window.Game = window.Game ? window.Game : {};

Game.getFormationEnemies = function getFormationEnemies() {
	return Game.state.enemies.filter((enemy) => enemy.dataset.diving !== '1');
};

Game.getEnemyFormationPosition = function getEnemyFormationPosition(enemy) {
	const formationEnemies = Game.getFormationEnemies();
	if (formationEnemies.length === 0) {
		return {
			x: enemy.offsetLeft,
			y: enemy.offsetTop,
		};
	}

	const sampleEnemy = formationEnemies[0];
	const enemyWidth = sampleEnemy.offsetWidth;
	const enemyHeight = sampleEnemy.offsetHeight;
	const gapX = 15;
	const columnSpacing = enemyWidth + gapX;
	const rowSpacing = enemyHeight + 12;
	const startY = 80;
	const rowIndex = Number(enemy.dataset.row);
	const columnIndex = Number(enemy.dataset.column);
	const enemyCount = Number(enemy.dataset.count);
	const rowWidth = (enemyCount * enemyWidth) + ((enemyCount - 1) * gapX);
	const startX = ((Game.refs.gameFrame.clientWidth - rowWidth) / 2) + Game.state.enemyMovement.offsetX;

	return {
		x: startX + (columnIndex * columnSpacing),
		y: startY + (rowIndex * rowSpacing),
	};
};

Game.scheduleNextEnemyDive = function scheduleNextEnemyDive(currentTime) {
	const movement = Game.state.enemyMovement;
	movement.nextDiveAt = currentTime + movement.diveCooldownMs;
};

Game.startRandomEnemyDive = function startRandomEnemyDive(currentTime) {
	const movement = Game.state.enemyMovement;
	if (movement.divingEnemy || Game.state.enemies.length === 0) {
		return;
	}

	const candidates = Game.getFormationEnemies();
	if (candidates.length === 0) {
		Game.scheduleNextEnemyDive(currentTime);
		return;
	}

	const selectedEnemy = candidates[Math.floor(Math.random() * candidates.length)];
	selectedEnemy.dataset.diving = '1';
	selectedEnemy.style.zIndex = '0';
	movement.divingEnemy = selectedEnemy;
	movement.diveState = 'descending';
};

Game.updateEnemyDive = function updateEnemyDive(currentTime, deltaTime) {
	const movement = Game.state.enemyMovement;
	const divingEnemy = movement.divingEnemy;

	if (!divingEnemy) {
		if (currentTime >= movement.nextDiveAt) {
			Game.startRandomEnemyDive(currentTime);
		}
		return;
	}

	if (!Game.state.enemies.includes(divingEnemy)) {
		movement.divingEnemy = null;
		movement.diveState = 'idle';
		Game.scheduleNextEnemyDive(currentTime);
		return;
	}

	if (movement.diveState === 'descending') {
		const nextTop = divingEnemy.offsetTop + (movement.diveSpeed * deltaTime);
		divingEnemy.style.top = `${nextTop}px`;

		if (nextTop > Game.refs.gameFrame.clientHeight + divingEnemy.offsetHeight) {
			divingEnemy.style.top = `${-divingEnemy.offsetHeight}px`;
			movement.diveState = 'returning';
		}
		return;
	}

	if (movement.diveState === 'returning') {
		const target = Game.getEnemyFormationPosition(divingEnemy);
		const currentLeft = divingEnemy.offsetLeft;
		const currentTop = divingEnemy.offsetTop;
		const toTargetX = target.x - currentLeft;
		const toTargetY = target.y - currentTop;
		const distance = Math.hypot(toTargetX, toTargetY);

		if (distance < 2) {
			divingEnemy.style.left = `${target.x}px`;
			divingEnemy.style.top = `${target.y}px`;
			divingEnemy.dataset.diving = '0';
			divingEnemy.style.zIndex = '1';
			movement.divingEnemy = null;
			movement.diveState = 'idle';
			Game.scheduleNextEnemyDive(currentTime);
			return;
		}

		const step = movement.returnSpeed * deltaTime;
		const ratio = Math.min(step / distance, 1);
		divingEnemy.style.left = `${currentLeft + (toTargetX * ratio)}px`;
		divingEnemy.style.top = `${currentTop + (toTargetY * ratio)}px`;
	}
};

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
			enemy.dataset.diving = '0';
			Game.refs.gameFrame.appendChild(enemy);
			Game.state.enemies.push(enemy);
		}
	});

	Game.scheduleNextEnemyDive(performance.now());
	Game.layoutEnemies();
};

Game.restartEnemyFormation = function restartEnemyFormation() {
	const movement = Game.state.enemyMovement;
	movement.offsetX = 0;
	movement.direction = -1;
	movement.lastTime = 0;
	movement.divingEnemy = null;
	movement.diveState = 'idle';
	Game.createEnemyFormation();
};

Game.layoutEnemies = function layoutEnemies() {
	const formationEnemies = Game.getFormationEnemies();
	if (formationEnemies.length === 0) {
		return;
	}

	const sampleEnemy = formationEnemies[0];
	const enemyWidth = sampleEnemy.offsetWidth;
	const enemyHeight = sampleEnemy.offsetHeight;
	const gapX = 15;
	const columnSpacing = enemyWidth + gapX;
	const rowSpacing = enemyHeight + 12;
	const startY = 80;
	Game.state.enemyMovement.maxRowWidth = 0;

	formationEnemies.forEach((enemy) => {
		const rowIndex = Number(enemy.dataset.row);
		const columnIndex = Number(enemy.dataset.column);
		const enemyCount = Number(enemy.dataset.count);
		const rowWidth = (enemyCount * enemyWidth) + ((enemyCount - 1) * gapX);
		const startX = ((Game.refs.gameFrame.clientWidth - rowWidth) / 2) + Game.state.enemyMovement.offsetX;
		const enemyX = startX + (columnIndex * columnSpacing);
		const enemyY = startY + (rowIndex * rowSpacing);

		Game.state.enemyMovement.maxRowWidth = Math.max(Game.state.enemyMovement.maxRowWidth, rowWidth);

		enemy.style.zIndex = '1';
		enemy.style.left = `${enemyX}px`;
		enemy.style.top = `${enemyY}px`;
	});
};

Game.getFrontAliveRowEnemies = function getFrontAliveRowEnemies() {
	const formationEnemies = Game.getFormationEnemies();
	if (formationEnemies.length === 0) {
		return [];
	}

	let frontRowIndex = -1;
	for (let index = 0; index < formationEnemies.length; index += 1) {
		frontRowIndex = Math.max(frontRowIndex, Number(formationEnemies[index].dataset.row));
	}

	return formationEnemies.filter((enemy) => Number(enemy.dataset.row) === frontRowIndex);
};

Game.getBackAliveRowEnemies = function getBackAliveRowEnemies() {
	const formationEnemies = Game.getFormationEnemies();
	if (formationEnemies.length === 0) {
		return [];
	}

	let backRowIndex = Number.POSITIVE_INFINITY;
	for (let index = 0; index < formationEnemies.length; index += 1) {
		backRowIndex = Math.min(backRowIndex, Number(formationEnemies[index].dataset.row));
	}

	return formationEnemies.filter((enemy) => Number(enemy.dataset.row) === backRowIndex);
};
