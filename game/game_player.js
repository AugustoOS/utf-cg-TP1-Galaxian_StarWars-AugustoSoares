window.Game = window.Game ? window.Game : {};

Game.playerRenderConfig = {
	get bottomOffset() { return Game.scale(8); },
	playerScale: 1.2,
	shotScale: 1.25,
	webgl: {
		shaderPaths: {
			vertex: '../shaders/vertex.glsl',
			fragment: '../shaders/fragment.glsl',
		},
	},
};

Game.playerAudio = Game.playerAudio || {};

Game.initializePlayerShotAudio = function initializePlayerShotAudio() {
	if (Game.playerAudio.shot) {
		return;
	}

	const shotAudio = new Audio('../sounds/shot_player.mp3');
	shotAudio.preload = 'auto';
	shotAudio.volume = 0.3;
	Game.playerAudio.shot = shotAudio;
};

Game.playPlayerShotAudio = function playPlayerShotAudio() {
	if (!Game.playerAudio.shot) {
		return;
	}

	Game.playerAudio.shot.currentTime = 0;
	Game.playerAudio.shot.play().catch(() => {});
};

Game.measureSprite = function measureSprite(element, fallbackWidth, fallbackHeight) {
	return {
		width: element.offsetWidth || fallbackWidth,
		height: element.offsetHeight || fallbackHeight,
	};
};

Game.getPlayerRenderBox = function getPlayerRenderBox() {
	const frameHeight = Game.refs.gameFrame.clientHeight;
	const shipMetrics = Game.measureSprite(Game.refs.playerShip, 48, 48);
	const scaledWidth = shipMetrics.width * Game.playerRenderConfig.playerScale;
	const scaledHeight = shipMetrics.height * Game.playerRenderConfig.playerScale;

	return {
		x: Game.state.movement.x - (scaledWidth / 2),
		y: frameHeight - Game.playerRenderConfig.bottomOffset - scaledHeight,
		width: scaledWidth,
		height: scaledHeight,
	};
};

Game.renderPlayerLayer = function renderPlayerLayer() {
	if (!Game.state.render.ready) {
		return;
	}

	GLPanel.beginFrame();

	const playerBox = Game.getPlayerRenderBox();
	GLPanel.drawSprite(
		Game.state.render.playerTexture,
		playerBox.x,
		playerBox.y,
		playerBox.width,
		playerBox.height,
	);

	if (Game.state.playerShot.active) {
		const shotMetrics = Game.measureSprite(Game.refs.playerShot, 10, 20);
		const shotWidth = shotMetrics.width * Game.playerRenderConfig.shotScale;
		const shotHeight = shotMetrics.height * Game.playerRenderConfig.shotScale;
		GLPanel.drawSprite(
			Game.state.render.shotTexture,
			Game.state.playerShot.x - (shotWidth / 2),
			Game.state.playerShot.y,
			shotWidth,
			shotHeight,
		);
	}
};

Game.startPlayerRenderLoop = function startPlayerRenderLoop() {
	if (Game.state.render.renderLoopActive) {
		return;
	}

	Game.state.render.renderLoopActive = true;

	const renderStep = function renderStep() {
		// Render separado da fisica para manter o desenho estavel.
		Game.renderPlayerLayer();
		window.requestAnimationFrame(renderStep);
	};

	window.requestAnimationFrame(renderStep);
};

Game.initializePlayerWebGL = async function initializePlayerWebGL() {
	if (!window.GLPanel) {
		return;
	}

	const gl = await GLPanel.init(Game.refs.canvas, Game.playerRenderConfig.webgl);
	if (!gl) {
		return;
	}

	try {
		const textures = await Promise.all([
			GLPanel.loadTextureFromUrl(Game.refs.playerShip.src),
			GLPanel.loadTextureFromUrl(Game.refs.playerShot.src),
		]);

		Game.state.render.playerTexture = textures[0];
		Game.state.render.shotTexture = textures[1];
		Game.state.render.ready = true;

		Game.refs.playerShip.style.visibility = 'hidden';
		Game.refs.playerShot.style.visibility = 'hidden';

		Game.startPlayerRenderLoop();
	} catch (error) {
		console.error(error);
	}
};

Game.updatePlayerShotPosition = function updatePlayerShotPosition() {
	if (!Game.state.render.ready) {
		// Fallback quando WebGL nao inicializa.
		Game.refs.playerShot.style.left = `${Game.state.playerShot.x}px`;
		Game.refs.playerShot.style.top = `${Game.state.playerShot.y}px`;
	}
};

Game.hidePlayerShot = function hidePlayerShot() {
	Game.state.playerShot.active = false;
	Game.setFleetBrakeActive(false);
	Game.refs.playerShot.style.display = 'none';
};

Game.spawnPlayerShot = function spawnPlayerShot() {
	if (Game.state.playerShot.active) {
		return;
	}

	const playerBox = Game.getPlayerRenderBox();
	const shotMetrics = Game.measureSprite(Game.refs.playerShot, 10, 20);
	const shotHeight = shotMetrics.height * Game.playerRenderConfig.shotScale;

	Game.state.playerShot.active = true;
	Game.state.playerShot.lastTime = 0;
	Game.state.playerShot.brakesAlreadyTriggered = false;
	Game.state.playerShot.x = playerBox.x + (playerBox.width / 2);
	Game.state.playerShot.y = playerBox.y - shotHeight;

	Game.refs.playerShot.style.display = 'block';
	Game.updatePlayerShotPosition();
	Game.playPlayerShotAudio();
};

Game.updatePlayerPosition = function updatePlayerPosition(currentTime) {
	if (Game.state.gameOver) {
		return;
	}

	if (Game.state.paused) {
		Game.state.movement.lastTime = 0;
		window.requestAnimationFrame(Game.updatePlayerPosition);
		return;
	}

	const movement = Game.state.movement;
	if (movement.lastTime === 0) {
		movement.lastTime = currentTime;
	}

	const deltaTime = (currentTime - movement.lastTime) / 1000;
	movement.lastTime = currentTime;

	if (movement.left) {
		movement.x -= movement.speed * deltaTime;
	}

	if (movement.right) {
		movement.x += movement.speed * deltaTime;
	}

	Game.clampPlayerPosition();
	window.requestAnimationFrame(Game.updatePlayerPosition);
};

Game.initializePlayerWebGL();
Game.initializePlayerShotAudio();
