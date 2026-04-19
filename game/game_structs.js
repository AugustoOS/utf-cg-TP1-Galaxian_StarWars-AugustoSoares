window.Game = window.Game ? window.Game : {};

Game.VIRTUAL_W = 800;
Game.VIRTUAL_H = 600;

// Base de escala unica para manter gameplay proporcional em resolucoes diferentes.
Game.getScale = function getScale() {
	const fw = Game.refs.gameFrame.clientWidth;
	const fh = Game.refs.gameFrame.clientHeight;
	return Math.min(fw / Game.VIRTUAL_W, fh / Game.VIRTUAL_H);
};

Game.scale = function scale(value) {
	return value * Game.getScale();
};

Game.refs = {
    gameFrame:  document.querySelector('.game-frame'),
    starfield:  document.querySelector('.starfield'),
    canvas:     document.querySelector('.canvas'),
    playerShip: document.querySelector('.player-ship'),
	playerShot: document.querySelector('.shot_player'),
	enemyShot:  document.querySelector('.shot_enemy'),
    scoreValue: document.querySelector('.score-value'),
    livesBoard: document.querySelector('.lives-board'),
};


Game.state = {
	score: 0,
	gameOver: false,
	paused: false,
	lives: 3,
	invincible: false,
	enemies: [],
	enemyShots: [],
	enemyShotsLastTime: 0,
	movement: {
		left: false,
		right: false,
		get speed() { return Game.scale(360); },
		x: Game.refs.gameFrame.clientWidth / 2,
		lastTime: 0,
	},
	playerShot: {
		active: false,
		x: 0,
		y: 0,
		get speed() { return Game.scale(600); },
		lastTime: 0,
		brakesAlreadyTriggered: false,
	},
	render: {
		ready: false,
		playerTexture: null,
		shotTexture: null,
		renderLoopActive: false,
	},
	enemyMovement: {
		offsetX: 0,
		get baseSpeed()   { return Game.scale(50);  },
		get diveSpeed()   { return Game.scale(130); },
		get returnSpeed() { return Game.scale(170); },
		diveCooldownMs: 5000,
		currentDiveCooldownMs: 5000,
		nextDiveAt: 0,
		diveGroups: [],
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

Game.enemyRows = [
	{ src: '../images/Enemy3.png', color: 'red',    count: 10, positions: [3, 6] },
	{ src: '../images/Enemy4.png', color: 'yellow', count: 6  },
	{ src: '../images/Enemy1.png', color: 'blue',   count: 8  },
	{ src: '../images/Enemy2.png', color: 'green',  count: 10 },
];

Game.imageTightBoundsCache = {};

Game.computeImageTightBounds = function computeImageTightBounds(imgElement) {
	const fallbackBounds = { fracX: 0, fracY: 0, fracW: 1, fracH: 1 };

	if (!imgElement || !imgElement.naturalWidth || !imgElement.naturalHeight) {
		return fallbackBounds;
	}

	const src = imgElement.currentSrc || imgElement.src;
	if (src && Game.imageTightBoundsCache[src]) {
		// Cache evita recortar alpha da mesma imagem todo frame.
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

	let minX = w, minY = h, maxX = 0, maxY = 0, hasOpaquePixel = false;

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

	if (src) Game.imageTightBoundsCache[src] = bounds;
	return bounds;
};

Game.getEnemyTightRect = function getEnemyTightRect(enemy) {
	const b = Game.computeImageTightBounds(enemy);
	return {
		left:   enemy.offsetLeft + (b.fracX * enemy.offsetWidth),
		right:  enemy.offsetLeft + ((b.fracX + b.fracW) * enemy.offsetWidth),
		top:    enemy.offsetTop  + (b.fracY * enemy.offsetHeight),
		bottom: enemy.offsetTop  + ((b.fracY + b.fracH) * enemy.offsetHeight),
	};
};

Game.getShotTightRect = function getShotTightRect() {
	return Game.getShotTightRectAtY(Game.state.playerShot.y);
};

Game.getShotTightRectAtY = function getShotTightRectAtY(shotY) {
	const b = Game.computeImageTightBounds(Game.refs.playerShot);
	const w = Game.refs.playerShot.offsetWidth;
	const h = Game.refs.playerShot.offsetHeight;
	return {
		left:   Game.state.playerShot.x - (w / 2) + (b.fracX * w),
		right:  Game.state.playerShot.x - (w / 2) + ((b.fracX + b.fracW) * w),
		top:    shotY + (b.fracY * h),
		bottom: shotY + ((b.fracY + b.fracH) * h),
	};
};

Game.getPlayerTightRect = function getPlayerTightRect() {
	const b  = Game.computeImageTightBounds(Game.refs.playerShip);
	const pb = Game.getPlayerRenderBox();
	return {
		left:   pb.x + (b.fracX * pb.width),
		right:  pb.x + ((b.fracX + b.fracW) * pb.width),
		top:    pb.y + (b.fracY * pb.height),
		bottom: pb.y + ((b.fracY + b.fracH) * pb.height),
	};
};

Game.getPlayerTriangle = function getPlayerTriangle() {
	const r = Game.getPlayerTightRect();
	return [
		{ x: (r.left + r.right) / 2, y: r.top    },
		{ x: r.left,                  y: r.bottom },
		{ x: r.right,                 y: r.bottom },
	];
};

Game.isPointInsideTriangle = function isPointInsideTriangle(point, triangle) {
	const [a, b, c] = triangle;
	const denom = ((b.y - c.y) * (a.x - c.x)) + ((c.x - b.x) * (a.y - c.y));
	if (denom === 0) return false;
	const alpha = (((b.y - c.y) * (point.x - c.x)) + ((c.x - b.x) * (point.y - c.y))) / denom;
	const beta  = (((c.y - a.y) * (point.x - c.x)) + ((a.x - c.x) * (point.y - c.y))) / denom;
	return alpha >= 0 && beta >= 0 && (1 - alpha - beta) >= 0;
};

Game.isPointInsideRect = function isPointInsideRect(point, rect) {
	return point.x >= rect.left && point.x <= rect.right
		&& point.y >= rect.top  && point.y <= rect.bottom;
};

Game.doSegmentsIntersect = function doSegmentsIntersect(sA, eA, sB, eB) {
	const orient = function(p, q, r) {
		const v = ((q.y - p.y) * (r.x - q.x)) - ((q.x - p.x) * (r.y - q.y));
		return v === 0 ? 0 : v > 0 ? 1 : 2;
	};
	const onSeg = function(p, q, r) {
		return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
		       q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
	};
	const o1 = orient(sA, eA, sB), o2 = orient(sA, eA, eB);
	const o3 = orient(sB, eB, sA), o4 = orient(sB, eB, eA);
	if (o1 !== o2 && o3 !== o4) return true;
	if (o1 === 0 && onSeg(sA, sB, eA)) return true;
	if (o2 === 0 && onSeg(sA, eB, eA)) return true;
	if (o3 === 0 && onSeg(sB, sA, eB)) return true;
	if (o4 === 0 && onSeg(sB, eA, eB)) return true;
	return false;
};

Game.isRectIntersectingTriangle = function isRectIntersectingTriangle(rect, triangle) {
	const rp = [
		{ x: rect.left,  y: rect.top    },
		{ x: rect.right, y: rect.top    },
		{ x: rect.right, y: rect.bottom },
		{ x: rect.left,  y: rect.bottom },
	];
	for (let i = 0; i < rp.length; i += 1)
		if (Game.isPointInsideTriangle(rp[i], triangle)) return true;
	for (let i = 0; i < triangle.length; i += 1)
		if (Game.isPointInsideRect(triangle[i], rect)) return true;

	const te = [[triangle[0], triangle[1]], [triangle[1], triangle[2]], [triangle[2], triangle[0]]];
	const re = [[rp[0], rp[1]], [rp[1], rp[2]], [rp[2], rp[3]], [rp[3], rp[0]]];
	for (let i = 0; i < te.length; i += 1)
		for (let j = 0; j < re.length; j += 1)
			if (Game.doSegmentsIntersect(te[i][0], te[i][1], re[j][0], re[j][1])) return true;
	return false;
};

