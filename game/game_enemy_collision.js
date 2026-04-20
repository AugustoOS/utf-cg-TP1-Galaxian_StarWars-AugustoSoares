window.Game = window.Game ? window.Game : {};

Game.clearEnemyShots = function clearEnemyShots() {
    Game.state.enemyShots.forEach(function (shot) {
        if (shot.element && shot.element.remove) {
            shot.element.remove();
        }
    });
    Game.state.enemyShots = [];
    Game.state.enemyShotsLastTime = 0;
};

Game.activateEnemyShotFromEnemy = function activateEnemyShotFromEnemy(enemy) {
    if (!enemy || !enemy.isConnected || !Game.state.enemies.includes(enemy)) {
        return false;
    }

    var playerBox = Game.getPlayerRenderBox ? Game.getPlayerRenderBox() : null; // mira no centro da nave; fallback pro meio da tela se o WebGL ainda nao inicializou
    var targetX = playerBox
        ? playerBox.x + playerBox.width / 2
        : Game.refs.gameFrame.clientWidth / 2;
    var targetY = playerBox
        ? playerBox.y + playerBox.height / 2
        : Game.refs.gameFrame.clientHeight - Game.scale(30);

    var startX = enemy.offsetLeft + enemy.offsetWidth / 2;
    var startY = enemy.offsetTop + enemy.offsetHeight / 2;

    // transforma a direcao em vetor unitario e multiplica pela velocidade
    var dx = targetX - startX;
    var dy = targetY - startY;
    var dist = Math.hypot(dx, dy) || 1; // || 1 evita divisao por zero se o inimigo ta em cima do jogador
    var speed = Game.scale(230);

    var shotEl = Game.refs.enemyShot.cloneNode(false); // clona o elemento do tiro template em vez de criar do zero
    shotEl.style.display = 'block';
    shotEl.alt = 'Tiro inimigo';
    Game.refs.gameFrame.appendChild(shotEl);

    var hw = shotEl.offsetWidth / 2 || 16; // centraliza o elemento no ponto de origem
    var hh = shotEl.offsetHeight / 2 || 16;
    shotEl.style.left = (startX - hw) + 'px';
    shotEl.style.top = (startY - hh) + 'px';

    Game.state.enemyShots.push({
        element: shotEl,
        x: startX,
        y: startY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
    });

    return true;
};

Game.showGameOverScreen = function showGameOverScreen() {
    var finalScore = Game.state.score;

    var overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    overlay.innerHTML =
        '<div class="game-over-box">' +
            '<h1 class="game-over-title">GAME OVER</h1>' +
            '<p class="game-over-score">PONTOS: <span class="game-over-score-value">' + finalScore + '</span></p>' +
            '<div class="game-over-buttons">' +
                '<button class="game-over-btn game-over-btn--primary" id="btn-play-again">JOGAR DE NOVO</button>' +
                '<button class="game-over-btn game-over-btn--secondary" id="btn-menu">MENU</button>' +
            '</div>' +
        '</div>';

    Game.refs.gameFrame.appendChild(overlay);

    window.requestAnimationFrame(function () {
        overlay.classList.add('game-over-overlay--visible');
    });

    document.getElementById('btn-play-again').addEventListener('click', function () {
        window.location.reload();
    });
    document.getElementById('btn-menu').addEventListener('click', function () {
        if (typeof Game.goToMenuWithTransition === 'function') {
            Game.goToMenuWithTransition();
            return;
        }
        window.location.href = '../index.html';
    });
};

Game.handlePlayerDeath = function handlePlayerDeath() {
    if (Game.state.gameOver || Game.state.invincible) return;

    Game.state.invincible = true;
    Game.state.lives = Number(Game.state.lives) - 1;
    Game.updateLives();

    Game.clearEnemyShots();

    if (Game.state.lives <= 0) {
        Game.state.gameOver = true;
        Game.state.playerShot.active = false;
        Game.refs.playerShot.style.display = 'none';
        Game.refs.playerShip.style.display = 'none';

        // cancela todos os rasantes ativos e volta os inimigos pro grid antes de mostrar game over
        Game.state.enemyMovement.diveGroups.forEach(function (group) {
            group.wingmen.forEach(function (w) {
                if (Game.state.enemies.includes(w)) {
                    w.dataset.diving = '0';
                    w.dataset.returning = '0';
                    w.style.zIndex   = '4';
                }
            });
            if (Game.state.enemies.includes(group.leader)) {
                group.leader.dataset.diving = '0';
                group.leader.dataset.returning = '0';
                group.leader.style.zIndex = '4';
            }
        });
        Game.state.enemyMovement.diveGroups = [];

        window.setTimeout(function () {
            Game.showGameOverScreen();
        }, 400);
    } else {
		Game.state.playerShot.active = false;
        Game.refs.playerShot.style.display = 'none';
        Game.refs.playerShip.style.display = 'none';

        setTimeout(function () {
            if (!Game.state.gameOver) {
                Game.state.invincible = false;
                Game.refs.playerShip.style.display = 'block';
                Game.clampPlayerPosition();
            }
        }, 2000);
    }
};

Game.checkEnemyPlayerCollision = function checkEnemyPlayerCollision() {
    if (Game.state.gameOver || Game.state.invincible || Game.state.enemies.length === 0) {
        return false;
    }
    var playerTriangle = Game.getPlayerTriangle();
    for (var i = 0; i < Game.state.enemies.length; i += 1) {
        if (Game.isRectIntersectingTriangle(Game.getEnemyTightRect(Game.state.enemies[i]), playerTriangle)) {
            Game.handlePlayerDeath();
            return true;
        }
    }
    return false;
};

Game.checkShotEnemyCollision = function checkShotEnemyCollision() {
    if (!Game.state.playerShot.active) return;

    var shotRect = Game.getShotTightRect();

    for (var i = 0; i < Game.state.enemies.length; i += 1) {
        var enemyRect = Game.getEnemyTightRect(Game.state.enemies[i]);

        if (!(shotRect.left   < enemyRect.right  &&
              shotRect.right  > enemyRect.left   &&
              shotRect.top    < enemyRect.bottom  &&
              shotRect.bottom > enemyRect.top)) {
            continue;
        }

        
        var leaderGroupIdx = -1;
        for (var g = 0; g < Game.state.enemyMovement.diveGroups.length; g += 1) { // descobre se o inimigo morto era lider de algum grupo de rasante
            if (Game.state.enemyMovement.diveGroups[g].leader === Game.state.enemies[i]) { leaderGroupIdx = g; break; }
        }

        // se nao era lider, remove ele do grupo sem matar o rasante inteiro
        for (var g = 0; g < Game.state.enemyMovement.diveGroups.length; g += 1) {
            var wi = Game.state.enemyMovement.diveGroups[g].wingmen.indexOf(Game.state.enemies[i]);
            if (wi !== -1) {
                Game.state.enemyMovement.diveGroups[g].wingmen.splice(wi, 1);
                Game.state.enemyMovement.diveGroups[g].wingmenBeziers.splice(wi, 1);
                break;
            }
        }

        
        var destroyedEnemy = Game.state.enemies[i]; // salva referencia antes do splice — depois disso enemies[i] ja e outro
        destroyedEnemy.remove();
        Game.state.enemies.splice(i, 1);

        Game.hidePlayerShot();
        Game.updateScore(Game.getEnemyScore(destroyedEnemy.alt.split(' ').pop().toLowerCase()));

        var enemiesRemaining = Game.state.enemies.length;
        // Acelera o ritmo conforme limpa a wave.
        var decrement = enemiesRemaining > 15 ? 150 : enemiesRemaining > 8 ? 250 : 400;
        Game.state.enemyMovement.currentDiveCooldownMs = Math.max(600, Game.state.enemyMovement.currentDiveCooldownMs - decrement);

        var lim = Game.getHorizontalMovementLimits ? Game.getHorizontalMovementLimits() : { left: 0, right: 0 };
        Game.state.enemyMovement.offsetX = Math.min(Math.max(Game.state.enemyMovement.offsetX, -lim.left), lim.right);


        if (leaderGroupIdx !== -1) {
            var group = Game.state.enemyMovement.diveGroups[leaderGroupIdx];
            // filtra as naves nao lideres que ainda estao vivas (podem ter morrido no mesmo frame)
            var alive = group.wingmen.filter(function (w) { return Game.state.enemies.includes(w); });
            if (alive.length > 0) {
                // promove para lider e herda a curva de bezier dele
                var newLeader = alive[0];
                var nwi = group.wingmen.indexOf(newLeader);
                var promotedBezier = group.wingmenBeziers[nwi];
                group.wingmen.splice(nwi, 1);
                group.wingmenBeziers.splice(nwi, 1);
                group.leader = newLeader;
                if (promotedBezier) {
                    group.leaderBezier = promotedBezier;
                }
            } else {
                // grupo inteiro morreu, agenda o proximo rasante
                Game.state.enemyMovement.diveGroups.splice(leaderGroupIdx, 1);
                Game.scheduleNextEnemyDive(performance.now());
            }
        }

        if (Game.state.enemies.length === 0) {
            Game.clearEnemyShots();
            Game.state.lives = Number(Game.state.lives) + 1;
            Game.updateLives();
            Game.DifficultyIncrease();
            Game.restartEnemyFormation();
        }

        break;
    }
};


Game.updateEnemyShots = function updateEnemyShots(currentTime) {
    if (Game.state.gameOver) return;

    if (Game.state.paused) {
        Game.state.enemyShotsLastTime = 0;
        window.requestAnimationFrame(Game.updateEnemyShots);
        return;
    }

    if (Game.state.enemyShots.length === 0) {
        Game.state.enemyShotsLastTime = 0;
        window.requestAnimationFrame(Game.updateEnemyShots);
        return;
    }

    var state = Game.state;

    if (state.enemyShotsLastTime === 0) state.enemyShotsLastTime = currentTime;
    // Limite de dt para evitar teleporte de tiro em queda de FPS.
    var dt = Math.min((currentTime - state.enemyShotsLastTime) / 1000, 0.05);
    state.enemyShotsLastTime = currentTime;

    var fw = Game.refs.gameFrame.clientWidth;
    var fh = Game.refs.gameFrame.clientHeight;

    for (var i = state.enemyShots.length - 1; i >= 0; i -= 1) { // itera de tras pra frente porque pode remover elementos no meio do caminho
        var shot = state.enemyShots[i]; // atualiza posicao do tiro
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;

        var hw = shot.element.offsetWidth / 2 || 16;   // centraliza o elemento no ponto de origem
        var hh = shot.element.offsetHeight / 2 || 16;
        shot.element.style.left = (shot.x - hw) + 'px';
        shot.element.style.top = (shot.y - hh) + 'px';

        // descarta o tiro se saiu da tela (margem de 40px pra nao sumir antes de sair visualmente)
        if (shot.y > fh + 40 || shot.y < -40 || shot.x < -40 || shot.x > fw + 40) {
            shot.element.remove();
            state.enemyShots.splice(i, 1);
            continue;
        }

        if (!state.gameOver && !state.invincible) {
            var shotRect = { left: shot.x - hw, right: shot.x + hw, top: shot.y - hh, bottom: shot.y + hh }; // cria um retangulo do tiro pra facilitar a colisao
            if (Game.isRectIntersectingTriangle(shotRect, Game.getPlayerTriangle())) {
                shot.element.remove();
                state.enemyShots.splice(i, 1);
                Game.handlePlayerDeath();
                break;
            }
        }
    }

    window.requestAnimationFrame(Game.updateEnemyShots);
};
