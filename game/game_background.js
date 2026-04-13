window.Game = window.Game ? window.Game : {};

Game.resetBackgroundTiming = function resetBackgroundTiming() {
	Game.state.background.lastTime = 0;
};

Game.initializeBackgroundStarfield = function initializeBackgroundStarfield() {
	const container = Game.refs.starfield;
	if (!container) {
		return;
	}

	container.innerHTML = '';
	Game.state.background.stars = [];

	const width = container.clientWidth;
	const height = container.clientHeight;
	if (width === 0 || height === 0) {
		return;
	}

	const layerConfigs = [
		{ count: 24, minSize: 1, maxSize: 2, minSpeed: 210, maxSpeed: 210, minTwinkle: 2.8, maxTwinkle: 4.2, streakChance: 0.05 },
		{ count: 14, minSize: 1, maxSize: 2, minSpeed: 210, maxSpeed: 210, minTwinkle: 3.2, maxTwinkle: 5.0, streakChance: 0.2 },
		{ count: 8, minSize: 2, maxSize: 3, minSpeed: 210, maxSpeed: 210, minTwinkle: 4.0, maxTwinkle: 6.4, streakChance: 0.55 },
	];

	layerConfigs.forEach((config) => {
		for (let i = 0; i < config.count; i += 1) {
			const star = document.createElement('span');
			star.className = 'star';

			const size = Math.round(config.minSize + (Math.random() * (config.maxSize - config.minSize)));
			const x = Math.random() * width;
			const y = Math.random() * height;
			const speed = config.minSpeed + (Math.random() * (config.maxSpeed - config.minSpeed));
			const twinkleSpeed = config.minTwinkle + (Math.random() * (config.maxTwinkle - config.minTwinkle));
			const twinklePhase = Math.random() * Math.PI * 2;
			const isStreak = Math.random() < config.streakChance;
			const starHeight = isStreak ? size + (Math.random() < 0.5 ? 1 : 2) : size;
			const baseOpacity = 0.55 + (Math.random() * 0.4);
			const color = Math.random() < 0.2 ? '#a8c0ff' : '#ffffff';

			star.style.setProperty('--star-w', `${size}px`);
			star.style.setProperty('--star-h', `${starHeight}px`);
			star.style.setProperty('--star-color', color);
			star.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
			star.style.opacity = String(baseOpacity);
			container.appendChild(star);

			Game.state.background.stars.push({
				element: star,
				x,
				y,
				speed,
				twinkleSpeed,
				twinklePhase,
				baseOpacity,
			});
		}
	});

	Game.state.background.initialized = true;
	Game.state.background.lastTime = 0;
};

Game.updateBackgroundStarfield = function updateBackgroundStarfield(currentTime) {
	if (Game.state.gameOver) {
		return;
	}

	if (!Game.state.background.initialized) {
		Game.initializeBackgroundStarfield();
	}

	const container = Game.refs.starfield;
	const stars = Game.state.background.stars;
	if (!container || stars.length === 0) {
		window.requestAnimationFrame(Game.updateBackgroundStarfield);
		return;
	}

	const state = Game.state.background;
	if (state.lastTime === 0) {
		state.lastTime = currentTime;
	}

	const rawDeltaTime = (currentTime - state.lastTime) / 1000;
	const deltaTime = Math.min(rawDeltaTime, 0.05);
	state.lastTime = currentTime;
	const width = container.clientWidth;
	const height = container.clientHeight;
	const elapsed = currentTime / 1000;

	for (let i = 0; i < stars.length; i += 1) {
		const star = stars[i];
		star.y += star.speed * deltaTime;

		if (star.y > height + 5) {
			star.y = -5;
			star.x = Math.random() * width;
		}

		const wave = Math.sin((elapsed * star.twinkleSpeed) + star.twinklePhase);
		const twinkle = wave > 0.65 ? 1 : (wave < -0.3 ? 0.45 : 0.75);
		const opacity = Math.max(0.1, Math.min(1, star.baseOpacity * twinkle));
		star.element.style.transform = `translate(${Math.round(star.x)}px, ${Math.round(star.y)}px)`;
		star.element.style.opacity = String(opacity);
	}

	window.requestAnimationFrame(Game.updateBackgroundStarfield);
};
