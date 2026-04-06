window.addEventListener('load', () => {
    const audio = document.querySelector('audio');
    audio.volume = 0.1;
    audio.muted = false; // Começa mutado por padrão

    audio.play().catch(e => {
        console.log('Reprodução automática bloqueada pelo navegador. Clique em qualquer lugar para iniciar o áudio.');
        document.addEventListener('click', () => {
            audio.volume = 0.1;
            audio.play();
        }, { once: true });
    });

    // Botão de mute
    const muteBtn = document.getElementById('mute-btn');
    const muteIcon = document.getElementById('mute-icon');

    const updateMuteIcon = () => {
        if (audio.muted) {
            muteIcon.src = '../images/mute.png';
            muteIcon.style.filter = 'invert(1)';
        } else {
            muteIcon.src = '../images/unmute.png';
            muteIcon.style.filter = 'invert(1)';
        }
    };

    updateMuteIcon();

    // Botão START
    const startBtn = document.querySelector('.but-start');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            window.location.href = '../game/game.html';
        });
    }

    muteBtn.addEventListener('click', () => {
        audio.muted = !audio.muted;
        updateMuteIcon();
    });
});