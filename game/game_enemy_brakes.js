window.Game = window.Game ? window.Game : {};

// Ativa/desativa o freio da formacao inimiga.
Game.setFleetBrakeActive = function setFleetBrakeActive(isActive) {
	Game.state.enemyMovement.defensiveBrakeActive = isActive;
};

// checa e trigga quando o tiro passar em um gap entre os inimigos da primeira fileira
Game.checkTriggerDefensiveBrake = function checkTriggerDefensiveBrake(previousShotY) {
	const shotState = Game.state.playerShot;
	// desativa se nao houver tiro ativo ou se o freio ja tiver sido disparado para este tiro.
	if (!shotState.active || shotState.brakesAlreadyTriggered) {
		return;
	}

	const frontRowEnemies = Game.getFrontAliveRowEnemies();
	// só por precaução: se não tem inimigos, não tem o que fazer.
	if (frontRowEnemies.length === 0) {
		return;
	}

	// Como fiz ajuste dos sprites para não dar falsos positivos, trazendo para cá para a lógica sincronizar.
	const frontRowRects = frontRowEnemies.map((enemy) => Game.getEnemyTightRect(enemy));

	// nessas 3 linhas de baixo, pego o primeiro e o ultimo ponto que os inimigos da primeira linha estão, depois somo e divido por dois pra achar o Y médio dessa linha.
	const frontRowTop = Math.min(...frontRowRects.map((enemyRect) => enemyRect.top));
	const frontRowBottom = Math.max(...frontRowRects.map((enemyRect) => enemyRect.bottom));
	const frontRowMidY = frontRowTop + ((frontRowBottom - frontRowTop) / 2);

	// pega a posição anterior e atual do tiro para saber o contato do tiro com a linha media da fileira da frente, acionando o freio se o tiro passar dali
	const previousShotTop = Game.getShotTightRectAtY(previousShotY).top;
	const currentShotTop = Game.getShotTightRect().top;
	const crossedFrontRowMid = previousShotTop > frontRowMidY && currentShotTop <= frontRowMidY;

	// Se ainda nao cruzou a linha media, nao aciona freio.
	if (!crossedFrontRowMid) {
		return;
	}

	// Verifica se o tiro esta alinhado horizontalmente com algum inimigo da frente.
	const shotRect = Game.getShotTightRect();
	const collidesWithFrontRow = frontRowRects.some((enemyRect) => (
		shotRect.left < enemyRect.right
		&& shotRect.right > enemyRect.left
	));

	// Só freia quando o tiro passou "entre" os inimigos da frente (sem intersecao horizontal).
	if (!collidesWithFrontRow) {
		Game.setFleetBrakeActive(true);
		// só para garantir que o tiro nao dispare o freio novamente.
		shotState.brakesAlreadyTriggered = true;
	}
};

// Se o tiro tiver acabado (matar um inimigo, etc) ou o tiro ja ter passado da fileira do fundo, libera o freio.
Game.checkReleaseDefensiveBrake = function checkReleaseDefensiveBrake() {
	const shotState = Game.state.playerShot;

	// Desativa se nao houver tiro ativo ou se o freio ja nao estiver ligado
	if (!shotState.active || !shotState.brakesAlreadyTriggered) {
		return;
	}

	const backRowEnemies = Game.getBackAliveRowEnemies();
	// Sem fileira de tras viva, libera pq acabou a frota.
	if (backRowEnemies.length === 0) {
		Game.setFleetBrakeActive(false);
		return;
	}

	// Compara base do tiro com o topo da fileira de tras para saber se ele ja passou dela.
	const lastRowTop = Math.min(...backRowEnemies.map((enemy) => Game.getEnemyTightRect(enemy).top));
	const shotBottom = Game.getShotTightRect().bottom;
	if (shotBottom < lastRowTop) {
		Game.setFleetBrakeActive(false);
	}
};
