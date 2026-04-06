window.Game = window.Game ? window.Game : {};

Game.refs = {
	gameFrame: document.querySelector('.game-frame'),
	playerShip: document.querySelector('.player-ship'),
	shot: document.querySelector('.shot_player'),
	scoreValue: document.querySelector('.score-value'),
};

Game.enemyRows = [
	{ src: '../images/Enemy3.png', color: 'red', count: 2 },
	{ src: '../images/Enemy4.png', color: 'yellow', count: 6 },
	{ src: '../images/Enemy1.png', color: 'blue', count: 8 },
	{ src: '../images/Enemy2.png', color: 'green', count: 10 },
];

Game.state = {
	score: 0,
	enemies: [],
	movement: {
		left: false,
		right: false,
		speed: 360,
		x: Game.refs.gameFrame.clientWidth / 2,
		lastTime: 0,
	},
	shot: {
		active: false,
		x: 0,
		y: 0,
		speed: 800,
		lastTime: 0,
		defenseBrakeTriggered: false,
	},
	enemyMovement: {
		offsetX: 0,
		baseSpeed: 50,
		direction: -1,
		lastTime: 0,
		maxRowWidth: 0,
		defensiveBrakeActive: false,
	},
};
