window.Game = window.Game ? window.Game : {};

Game.enemyScoreBase = 100;
Game.enemyScoreMultipliers = {
	red: 4,
	yellow: 2,
	blue: 1.5,
	green: 1,
};

Game.getEnemyScore = function getEnemyScore(enemyColor) {
	const multiplier = Game.enemyScoreMultipliers[enemyColor] || 1;
	return Math.round(Game.enemyScoreBase * multiplier);
};

Game.updateScore = function updateScore(points) {
	Game.state.score += points;
	Game.refs.scoreValue.textContent = String(Game.state.score);
};

Game.resetScore = function resetScore() {
	Game.state.score = 0;
	Game.refs.scoreValue.textContent = '0';
};
