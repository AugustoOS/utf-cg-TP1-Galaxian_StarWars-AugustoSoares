window.Game = window.Game ? window.Game : {};

Game.updateScore = function updateScore(points) {
	Game.state.score += points;
	Game.refs.scoreValue.textContent = String(Game.state.score);
};
