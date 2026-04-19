window.Game = window.Game ? window.Game : {};

Game.enemyScoreBase = 100;
Game.enemyScoreMultipliers = {
	red: 4,
	yellow: 2,
	blue: 1.5,
	green: 1,
};

// Pontuacao por cor (base * multiplicador).
Game.getEnemyScore = function getEnemyScore(enemyColor) {
	const multiplier = Game.enemyScoreMultipliers[enemyColor] || 1;
	return Math.round(Game.enemyScoreBase * multiplier);
};

// Atualiza estado e HUD no mesmo ponto.
Game.updateScore = function updateScore(points) {
	Game.state.score += points;
	Game.refs.scoreValue.textContent = String(Game.state.score);
};

// Reset simples para reinicio de partida.
Game.resetScore = function resetScore() {
	Game.state.score = 0;
	Game.refs.scoreValue.textContent = '0';
};

// Mantem HUD compacto: ate 3 vidas usa icones, acima disso usa contador.
Game.updateLives = function updateLives() {
    var lives = Number(Game.state.lives);
    var board = Game.refs.livesBoard;
    if (!board) return;

    board.innerHTML = '';

    if (lives > 3) {
        var img = document.createElement('img');
        img.src = '../images/life point.png';
        img.className = 'life-icon';
        img.alt = 'Vida';
        board.appendChild(img);

        var label = document.createElement('span');
        label.className = 'life-count';
        label.textContent = 'x ' + lives;
        board.appendChild(label);
    } else {
        for (var i = 0; i < lives; i += 1) {
            var icon = document.createElement('img');
            icon.src = '../images/life point.png';
            icon.className = 'life-icon';
            icon.alt = 'Vida';
            board.appendChild(icon);
        }
    }
};