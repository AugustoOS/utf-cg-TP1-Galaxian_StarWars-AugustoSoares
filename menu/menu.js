window.addEventListener('load', () => {
    const TRANSITION_DURATION_MS = 1000;
    let isArcadeTransitioning = false;

    // Overlay unico para fade entre telas.
    const screenTransition = document.createElement('div');
    screenTransition.className = 'screen-transition';
    document.body.appendChild(screenTransition);

    if (sessionStorage.getItem('menuTransitionIn') === '1') {
        sessionStorage.removeItem('menuTransitionIn');
        screenTransition.classList.add('reveal');
        setTimeout(() => {
            screenTransition.remove();
        }, TRANSITION_DURATION_MS);
    }

    const audio = document.querySelector('audio');
    audio.volume = 0.1;
    audio.muted = false;
    const startGameAudio = new Audio('../sounds/start_game_xwing_turn-on.mp3');
    startGameAudio.preload = 'auto';
    startGameAudio.volume = 0.35;
    startGameAudio.muted = audio.muted;
    let launchFadeTimeoutId = null;

    const fadeOutAudio = (targetAudio, durationMs) => {
        const initialVolume = targetAudio.volume;
        const startTime = performance.now();

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            targetAudio.volume = initialVolume * (1 - progress);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                targetAudio.pause();
                targetAudio.currentTime = 0;
            }
        };

        requestAnimationFrame(step);
    };

    audio.play().catch(e => {
        console.log('ReproduÃ§Ã£o automÃ¡tica bloqueada pelo navegador. Clique em qualquer lugar para iniciar o Ã¡udio.');
        document.addEventListener('click', () => {
            audio.volume = 0.1;
            audio.play();
        }, { once: true });
    });

    const muteBtn = document.getElementById('mute-btn');
    const muteIcon = document.getElementById('mute-icon');

    const updateMuteIcon = () => {
        startGameAudio.muted = audio.muted;
        if (audio.muted) {
            muteIcon.src = '../images/mute.png';
            muteIcon.style.filter = 'invert(1)';
        } else {
            muteIcon.src = '../images/unmute.png';
            muteIcon.style.filter = 'invert(1)';
        }
    };

    updateMuteIcon();

    muteBtn.addEventListener('click', () => {
        audio.muted = !audio.muted;
        updateMuteIcon();
    });

    const playBtn = document.getElementById('play-btn');
    const menuMain = document.getElementById('menu-main');
    const menuMode = document.getElementById('menu-mode');
    const backBtn = document.getElementById('back-btn');
    const arcadeBtn = document.getElementById('arcade-btn');
    const campainBtn = document.getElementById('campain-btn');
    const launchSequence = document.querySelector('.launch-sequence');

    playBtn.addEventListener('click', () => {
        menuMain.classList.add('hidden');
        menuMain.hidden = true;
        menuMode.classList.remove('hidden');
        menuMode.hidden = false;
    });

    backBtn.addEventListener('click', () => {
        menuMode.classList.add('hidden');
        menuMode.hidden = true;
        menuMain.classList.remove('hidden');
        menuMain.hidden = false;
    });

    arcadeBtn.addEventListener('click', () => {
        if (isArcadeTransitioning) return;

        isArcadeTransitioning = true;
        const launchDurationMs = 5200;
        const destroyerEntryMs = 1200;
        const playerDelayMs = destroyerEntryMs + 300;
        const playerRunMs = launchDurationMs - destroyerEntryMs -playerDelayMs;
        document.body.style.setProperty('--launch-duration', `${launchDurationMs}ms`);
        document.body.style.setProperty('--launch-player-delay', `${playerDelayMs}ms`);
        document.body.style.setProperty('--launch-player-duration', `${playerRunMs}ms`);
        if (launchSequence) {
            launchSequence.hidden = false;
        }
        document.body.classList.add('arcade-launching');
        screenTransition.classList.remove('active');
        const goToGame = () => {
            window.location.href = '../game/game.html';
        };
        const onStartGameAudioEnded = () => {
            startGameAudio.removeEventListener('ended', onStartGameAudioEnded);
            if (launchFadeTimeoutId) {
                clearTimeout(launchFadeTimeoutId);
                launchFadeTimeoutId = null;
            }
            screenTransition.classList.add('active');
            goToGame();
        };

        startGameAudio.currentTime = 0;
        startGameAudio.addEventListener('ended', onStartGameAudioEnded);
        // Se o audio atrasar/falhar, pelo menos o fade visual acontece no tempo certo.
        const launchFadeDelay = Math.max(playerDelayMs + playerRunMs, 0);
        launchFadeTimeoutId = setTimeout(() => {
            screenTransition.classList.add('active');
            launchFadeTimeoutId = null;
        }, launchFadeDelay);
        startGameAudio.play().catch(() => {
            startGameAudio.removeEventListener('ended', onStartGameAudioEnded);
            isArcadeTransitioning = false;
            if (launchFadeTimeoutId) {
                clearTimeout(launchFadeTimeoutId);
                launchFadeTimeoutId = null;
            }
            document.body.classList.remove('arcade-launching');
            if (launchSequence) {
                launchSequence.hidden = true;
            }
            screenTransition.classList.remove('active');
        });
        fadeOutAudio(audio, TRANSITION_DURATION_MS);
    });

    campainBtn.addEventListener('click', () => {
        console.log('Campanha: em construÃ§Ã£o');
    });

    const instructionsBtn = document.getElementById('instructions-btn');
    const instructionsOverlay = document.getElementById('instructions-overlay');
    const closeBtn = document.getElementById('close-instructions');

    const openInstructions = () => {
        instructionsOverlay.hidden = false;
        instructionsOverlay.classList.add('active');
    };

    const closeInstructions = () => {
        instructionsOverlay.classList.remove('active');
        instructionsOverlay.hidden = true;
    };

    instructionsBtn.addEventListener('click', openInstructions);
    closeBtn.addEventListener('click', closeInstructions);

    instructionsOverlay.addEventListener('click', (e) => {
        if (e.target === instructionsOverlay) {
            closeInstructions();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && instructionsOverlay.classList.contains('active')) {
            closeInstructions();
        }
    });
});
