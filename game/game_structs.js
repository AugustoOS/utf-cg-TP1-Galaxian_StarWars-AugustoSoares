window.Game = window.Game ? window.Game : {};

Game.refs = {
	gameFrame: document.querySelector('.game-frame'),
	starfield: document.querySelector('.starfield'),
	canvas: document.querySelector('.canvas'),
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

Game.imageTightBoundsCache = {};

Game.computeImageTightBounds = function computeImageTightBounds(imgElement) {
	const fallbackBounds = {
		fracX: 0,
		fracY: 0,
		fracW: 1,
		fracH: 1,
	};

	if (!imgElement || !imgElement.naturalWidth || !imgElement.naturalHeight) {
		return fallbackBounds;
	}

	const src = imgElement.currentSrc || imgElement.src;
	if (src && Game.imageTightBoundsCache[src]) {
		return Game.imageTightBoundsCache[src];
	}

	const w = imgElement.naturalWidth;
	const h = imgElement.naturalHeight;
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	ctx.drawImage(imgElement, 0, 0);
	const data = ctx.getImageData(0, 0, w, h).data;

	let minX = w;
	let minY = h;
	let maxX = 0;
	let maxY = 0;
	let hasOpaquePixel = false;

	for (let y = 0; y < h; y += 1) {
		for (let x = 0; x < w; x += 1) {
			const alpha = data[(y * w + x) * 4 + 3];
			if (alpha >= 10) {
				hasOpaquePixel = true;
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
	}

	const bounds = hasOpaquePixel ? {
		fracX: minX / w,
		fracY: minY / h,
		fracW: (maxX - minX + 1) / w,
		fracH: (maxY - minY + 1) / h,
	} : fallbackBounds;

	if (src) {
		Game.imageTightBoundsCache[src] = bounds;
	}

	return bounds;
};

Game.getEnemyTightRect = function getEnemyTightRect(enemy) {
	const bounds = Game.computeImageTightBounds(enemy);
	return {
		left: enemy.offsetLeft + (bounds.fracX * enemy.offsetWidth),
		right: enemy.offsetLeft + ((bounds.fracX + bounds.fracW) * enemy.offsetWidth),
		top: enemy.offsetTop + (bounds.fracY * enemy.offsetHeight),
		bottom: enemy.offsetTop + ((bounds.fracY + bounds.fracH) * enemy.offsetHeight),
	};
};

Game.getShotTightRect = function getShotTightRect() {
	const shotBounds = Game.computeImageTightBounds(Game.refs.shot);
	const shotWidth = Game.refs.shot.offsetWidth;
	const shotHeight = Game.refs.shot.offsetHeight;
	return {
		left: Game.state.shot.x - (shotWidth / 2) + (shotBounds.fracX * shotWidth),
		right: Game.state.shot.x - (shotWidth / 2) + ((shotBounds.fracX + shotBounds.fracW) * shotWidth),
		top: Game.state.shot.y + (shotBounds.fracY * shotHeight),
		bottom: Game.state.shot.y + ((shotBounds.fracY + shotBounds.fracH) * shotHeight),
	};
};

Game.getPlayerTightRect = function getPlayerTightRect() {
	const playerBounds = Game.computeImageTightBounds(Game.refs.playerShip);
	const playerBox = Game.getPlayerRenderBox();
	return {
		left: playerBox.x + (playerBounds.fracX * playerBox.width),
		right: playerBox.x + ((playerBounds.fracX + playerBounds.fracW) * playerBox.width),
		top: playerBox.y + (playerBounds.fracY * playerBox.height),
		bottom: playerBox.y + ((playerBounds.fracY + playerBounds.fracH) * playerBox.height),
	};
};

Game.getPlayerTriangle = function getPlayerTriangle() {
	const playerRect = Game.getPlayerTightRect();
	return [
		{ x: (playerRect.left + playerRect.right) / 2, y: playerRect.top },
		{ x: playerRect.left, y: playerRect.bottom },
		{ x: playerRect.right, y: playerRect.bottom },
	];
};

Game.isPointInsideTriangle = function isPointInsideTriangle(point, triangle) {
	const a = triangle[0];
	const b = triangle[1];
	const c = triangle[2];

	const denominator = ((b.y - c.y) * (a.x - c.x)) + ((c.x - b.x) * (a.y - c.y));
	if (denominator === 0) {
		return false;
	}

	const alpha = (((b.y - c.y) * (point.x - c.x)) + ((c.x - b.x) * (point.y - c.y))) / denominator;
	const beta = (((c.y - a.y) * (point.x - c.x)) + ((a.x - c.x) * (point.y - c.y))) / denominator;
	const gamma = 1 - alpha - beta;

	return alpha >= 0 && beta >= 0 && gamma >= 0;
};

Game.isPointInsideRect = function isPointInsideRect(point, rect) {
	return (
		point.x >= rect.left
		&& point.x <= rect.right
		&& point.y >= rect.top
		&& point.y <= rect.bottom
	);
};

Game.doSegmentsIntersect = function doSegmentsIntersect(startA, endA, startB, endB) {
	const getOrientation = function getOrientation(p, q, r) {
		const value = ((q.y - p.y) * (r.x - q.x)) - ((q.x - p.x) * (r.y - q.y));
		if (value === 0) {
			return 0;
		}
		return value > 0 ? 1 : 2;
	};

	const isOnSegment = function isOnSegment(p, q, r) {
		return (
			q.x <= Math.max(p.x, r.x)
			&& q.x >= Math.min(p.x, r.x)
			&& q.y <= Math.max(p.y, r.y)
			&& q.y >= Math.min(p.y, r.y)
		);
	};

	const orientation1 = getOrientation(startA, endA, startB);
	const orientation2 = getOrientation(startA, endA, endB);
	const orientation3 = getOrientation(startB, endB, startA);
	const orientation4 = getOrientation(startB, endB, endA);

	if (orientation1 !== orientation2 && orientation3 !== orientation4) {
		return true;
	}

	if (orientation1 === 0 && isOnSegment(startA, startB, endA)) return true;
	if (orientation2 === 0 && isOnSegment(startA, endB, endA)) return true;
	if (orientation3 === 0 && isOnSegment(startB, startA, endB)) return true;
	if (orientation4 === 0 && isOnSegment(startB, endA, endB)) return true;

	return false;
};

Game.isRectIntersectingTriangle = function isRectIntersectingTriangle(rect, triangle) {
	const rectPoints = [
		{ x: rect.left, y: rect.top },
		{ x: rect.right, y: rect.top },
		{ x: rect.right, y: rect.bottom },
		{ x: rect.left, y: rect.bottom },
	];

	for (let i = 0; i < rectPoints.length; i += 1) {
		if (Game.isPointInsideTriangle(rectPoints[i], triangle)) {
			return true;
		}
	}

	for (let i = 0; i < triangle.length; i += 1) {
		if (Game.isPointInsideRect(triangle[i], rect)) {
			return true;
		}
	}

	const triangleEdges = [
		[triangle[0], triangle[1]],
		[triangle[1], triangle[2]],
		[triangle[2], triangle[0]],
	];
	const rectEdges = [
		[rectPoints[0], rectPoints[1]],
		[rectPoints[1], rectPoints[2]],
		[rectPoints[2], rectPoints[3]],
		[rectPoints[3], rectPoints[0]],
	];

	for (let i = 0; i < triangleEdges.length; i += 1) {
		for (let j = 0; j < rectEdges.length; j += 1) {
			if (Game.doSegmentsIntersect(triangleEdges[i][0], triangleEdges[i][1], rectEdges[j][0], rectEdges[j][1])) {
				return true;
			}
		}
	}

	return false;
};

Game.state = {
	score: 0,
	gameOver: false,
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
	render: {
		ready: false,
		playerTexture: null,
		shotTexture: null,
		renderLoopActive: false,
	},
	enemyMovement: {
		offsetX: 0,
		baseSpeed: 50,
		diveSpeed: 130,
		returnSpeed: 170,
		diveCooldownMs: 5000,
		nextDiveAt: 0,
		divingEnemy: null,
		diveState: 'idle',
		direction: -1,
		lastTime: 0,
		maxRowWidth: 0,
		defensiveBrakeActive: false,
	},
	background: {
		stars: [],
		initialized: false,
		lastTime: 0,
	},
};
