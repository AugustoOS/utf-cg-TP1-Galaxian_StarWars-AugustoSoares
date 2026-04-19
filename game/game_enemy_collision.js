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

    var playerBox = Game.getPlayerRenderBox ? Game.getPlayerRenderBox() : null;
    var targetX = playerBox
        ? playerBox.x + playerBox.width / 2
        : Game.refs.gameFrame.clientWidth / 2;
    var targetY = playerBox
        ? playerBox.y + playerBox.height / 2
        : Game.refs.gameFrame.clientHeight - Game.scale(30);

    var startX = enemy.offsetLeft + enemy.offsetWidth / 2;
    var startY = enemy.offsetTop + enemy.offsetHeight / 2;

    var dx = targetX - startX;
    var dy = targetY - startY;
    var dist = Math.hypot(dx, dy) || 1;
    var speed = Game.scale(230);

    var shotEl = Game.refs.enemyShot.cloneNode(false);
    shotEl.style.display = 'block';
    shotEl.alt = 'Tiro inimigo';
    Game.refs.gameFrame.appendChild(shotEl);

    var hw = shotEl.offsetWidth / 2 || 16;
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
    var movement = Game.state.enemyMovement;

    for (var i = 0; i < Game.state.enemies.length; i += 1) {
        var enemy    = Game.state.enemies[i];
        var enemyRect = Game.getEnemyTightRect(enemy);

        if (!(shotRect.left   < enemyRect.right  &&
              shotRect.right  > enemyRect.left   &&
              shotRect.top    < enemyRect.bottom  &&
              shotRect.bottom > enemyRect.top)) {
            continue;
        }

        var leaderGroupIdx = -1;
        for (var g = 0; g < movement.diveGroups.length; g += 1) {
            if (movement.diveGroups[g].leader === enemy) { leaderGroupIdx = g; break; }
        }


        for (var g = 0; g < movement.diveGroups.length; g += 1) {
            var wi = movement.diveGroups[g].wingmen.indexOf(enemy);
            if (wi !== -1) {
                movement.diveGroups[g].wingmen.splice(wi, 1);
                movement.diveGroups[g].wingmenBeziers.splice(wi, 1);
                break;
            }
        }


        enemy.remove();
        Game.state.enemies.splice(i, 1);

        Game.hidePlayerShot();
        Game.updateScore(Game.getEnemyScore(enemy.alt.split(' ').pop().toLowerCase()));

        var rem       = Game.state.enemies.length;
        // Acelera o ritmo conforme limpa a wave.
        var decrement = rem > 15 ? 150 : rem > 8 ? 250 : 400;
        movement.currentDiveCooldownMs = Math.max(600, movement.currentDiveCooldownMs - decrement);

        var lim = Game.getHorizontalMovementLimits ? Game.getHorizontalMovementLimits() : { left: 0, right: 0 };
        movement.offsetX = Math.min(Math.max(movement.offsetX, -lim.left), lim.right);


        if (leaderGroupIdx !== -1) {
            var group = movement.diveGroups[leaderGroupIdx];
            var alive = group.wingmen.filter(function (w) { return Game.state.enemies.includes(w); });
            if (alive.length > 0) {
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
                movement.diveGroups.splice(leaderGroupIdx, 1);
                Game.scheduleNextEnemyDive(performance.now());
            }
        }

        if (Game.state.enemies.length === 0) {
            Game.clearEnemyShots();
            Game.state.lives = Number(Game.state.lives) + 1;
            Game.updateLives();
            Game.applyFleetClearDifficultyIncrease();
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

    for (var i = state.enemyShots.length - 1; i >= 0; i -= 1) {
        var shot = state.enemyShots[i];
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;

        var hw = shot.element.offsetWidth / 2 || 16;
        var hh = shot.element.offsetHeight / 2 || 16;
        shot.element.style.left = (shot.x - hw) + 'px';
        shot.element.style.top = (shot.y - hh) + 'px';

        if (shot.y > fh + 40 || shot.y < -40 || shot.x < -40 || shot.x > fw + 40) {
            shot.element.remove();
            state.enemyShots.splice(i, 1);
            continue;
        }

        if (!state.gameOver && !state.invincible) {
            var shotRect = { left: shot.x - hw, right: shot.x + hw, top: shot.y - hh, bottom: shot.y + hh };
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
