window.Game = window.Game ? window.Game : {};

Game.getGameBounds = function getGameBounds() {
	return Game.refs.gameFrame.getBoundingClientRect();
};

Game.getHorizontalMovementLimit = function getHorizontalMovementLimit() {
	return Math.max((Game.refs.gameFrame.clientWidth - Game.state.enemyMovement.maxRowWidth) / 2, 0);
};

Game.clampPlayerPosition = function clampPlayerPosition() {
	const halfShipWidth = Game.refs.playerShip.offsetWidth / 2;
	const minX = halfShipWidth;
	const maxX = Game.refs.gameFrame.clientWidth - halfShipWidth;

	Game.state.movement.x = Math.min(Math.max(Game.state.movement.x, minX), maxX);
	Game.refs.playerShip.style.left = `${Game.state.movement.x}px`;
};
