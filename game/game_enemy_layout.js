window.Game = window.Game ? window.Game : {};

Game.getFormationEnemies = function getFormationEnemies() {
    return Game.state.enemies.filter((enemy) => enemy.dataset.diving !== '1' && enemy.dataset.returning !== '1');
};

Game.getEnemyFormationPosition = function getEnemyFormationPosition(enemy) {
    const gapX = Game.scale(15);
    const enemyWidth = enemy.offsetWidth;
    const enemyHeight = enemy.offsetHeight;
    const columnSpacing = enemyWidth + gapX;
    const rowSpacing = enemyHeight + Game.scale(12);
    const startY = Game.scale(80);
    const rowIndex = Number(enemy.dataset.row);
    const columnIndex = Number(enemy.dataset.column);
    const enemyCount = Number(enemy.dataset.count);
    const rowWidth = (enemyCount * enemyWidth) + ((enemyCount - 1) * gapX);
    const startX = ((Game.refs.gameFrame.clientWidth - rowWidth) / 2) + Game.state.enemyMovement.offsetX;

    return {
        x: startX + (columnIndex * columnSpacing),
        y: startY + (rowIndex * rowSpacing),
    };
};

Game.getMaxConcurrentDives = function getMaxConcurrentDives() {
    const remaining = Game.state.enemies.length;
    if (remaining <= 5)  return 4;
    if (remaining <= 11) return 3;
    if (remaining <= 18) return 2;
    return 1;
};

Game.getDiveCooldownMs = function getDiveCooldownMs() {
    return Game.state.enemyMovement.currentDiveCooldownMs;
};

Game.applyFleetClearDifficultyIncrease = function applyFleetClearDifficultyIncrease() {
    const movement = Game.state.enemyMovement;
    movement.diveCooldownMs = Math.max(600, movement.diveCooldownMs - 1500);
};

Game.scheduleNextEnemyDive = function scheduleNextEnemyDive(currentTime) {
    const movement = Game.state.enemyMovement;
    movement.nextDiveAt = currentTime + Game.getDiveCooldownMs();
};

Game.bezierPoint = function bezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
        x: (mt * mt * mt * p0.x) + (3 * mt * mt * t * p1.x) + (3 * mt * t * t * p2.x) + (t * t * t * p3.x),
        y: (mt * mt * mt * p0.y) + (3 * mt * mt * t * p1.y) + (3 * mt * t * t * p2.y) + (t * t * t * p3.y),
    };
};

Game.createBezierPath = function createBezierPath(startX, startY, targetX, targetY) {
    const fw = Game.refs.gameFrame.clientWidth;
    const fh = Game.refs.gameFrame.clientHeight;

    const side1 = Math.random() < 0.5 ? 1 : -1;
    const p1 = {
        x: Math.max(fw * 0.05, Math.min(fw * 0.95,
            (fw / 2) + side1 * fw * (0.18 + Math.random() * 0.28))),
        y: startY + (targetY - startY) * (0.1 + Math.random() * 0.3),
    };

    const side2 = -side1 * (Math.random() < 0.65 ? 1 : -1);
    const p2 = {
        x: Math.max(fw * 0.05, Math.min(fw * 0.95,
            targetX + side2 * fw * (0.12 + Math.random() * 0.28))),
        y: startY + (targetY - startY) * (0.5 + Math.random() * 0.35),
    };

    return {
        p0: { x: startX, y: startY },
        p1,
        p2,
        p3: { x: targetX, y: targetY },
    };
};

Game._fireDiveShot = function _fireDiveShot(enemy) {
    if (Game.state.gameOver || Game.state.invincible) {
        return;
    }

    Game.activateEnemyShotFromEnemy(enemy);
};

Game.startRandomEnemyDive = function startRandomEnemyDive(currentTime) {
    const movement = Game.state.enemyMovement;
    if (Game.state.enemies.length === 0) {
        return;
    }

    if (movement.diveGroups.length >= Game.getMaxConcurrentDives()) {
        return;
    }

    const candidates = Game.getFormationEnemies();
    if (candidates.length === 0) {
        Game.scheduleNextEnemyDive(currentTime);
        return;
    }

    const selectedEnemy = candidates[Math.floor(Math.random() * candidates.length)];
    const isRed = selectedEnemy.alt.toLowerCase().includes('red');

    const playerBox = Game.getPlayerRenderBox ? Game.getPlayerRenderBox() : null;
    const targetX = playerBox
        ? playerBox.x + playerBox.width / 2
        : Game.refs.gameFrame.clientWidth / 2;
    const targetY = playerBox
        ? playerBox.y
        : Game.refs.gameFrame.clientHeight - Game.scale(50);

    selectedEnemy.dataset.diving = '1';
    selectedEnemy.style.zIndex = '4';

    const leaderBezier = Game.createBezierPath(
        selectedEnemy.offsetLeft,
        selectedEnemy.offsetTop,
        targetX,
        targetY,
    );

    const group = {
        leader: selectedEnemy,
        wingmen: [],
        wingmenBeziers: [],
        leaderBezier,
        diveState: 'descending',
        bezierT: 0,
        shotThresholds: [0.30, 0.42],
        shotsFired: 0,
    };

    if (isRed && candidates.length > 1) {
        // Vermelho puxa escolta para deixar o dive mais agressivo.
        const leaderPos = Game.getEnemyFormationPosition(selectedEnemy);
        const others = candidates.filter((e) => e !== selectedEnemy);
        others.sort((a, b) => {
            const pa = Game.getEnemyFormationPosition(a);
            const pb = Game.getEnemyFormationPosition(b);
            return (
                Math.hypot(pa.x - leaderPos.x, pa.y - leaderPos.y)
                - Math.hypot(pb.x - leaderPos.x, pb.y - leaderPos.y)
            );
        });

        const wingmen = others.slice(0, Math.min(3, others.length));
        wingmen.forEach((w) => {
            const wingOffset = (Math.random() - 0.5) * Game.scale(50);
            const wBezier = Game.createBezierPath(
                w.offsetLeft,
                w.offsetTop,
                targetX + wingOffset,
                targetY,
            );
            group.wingmen.push(w);
            group.wingmenBeziers.push(wBezier);
            w.dataset.diving = '1';
            w.style.zIndex = '4';
        });
    }

    movement.diveGroups.push(group);

    Game.scheduleNextEnemyDive(currentTime);
};

Game.updateEnemyDive = function updateEnemyDive(currentTime, deltaTime) {
    const movement = Game.state.enemyMovement;

    if (currentTime >= movement.nextDiveAt
        && movement.diveGroups.length < Game.getMaxConcurrentDives()
        && Game.state.enemies.length > 0) {
        Game.startRandomEnemyDive(currentTime);
    }

    if (movement.diveGroups.length === 0) {
        return;
    }

    const diveDuration  = 2.6;
    const tStep         = deltaTime / diveDuration;
    const completedIdxs = [];

    movement.diveGroups.forEach((group, groupIndex) => {

        if (!Game.state.enemies.includes(group.leader)) {
            // Se o lider caiu, promove o primeiro wingman vivo.
            const aliveWingmen = group.wingmen.filter((w) => Game.state.enemies.includes(w));
            if (aliveWingmen.length > 0) {
                const newLeader = aliveWingmen[0];
                const wi = group.wingmen.indexOf(newLeader);
                const promotedBezier = group.wingmenBeziers[wi];
                group.wingmen.splice(wi, 1);
                group.wingmenBeziers.splice(wi, 1);
                group.leader = newLeader;
                if (promotedBezier) {
                    group.leaderBezier = promotedBezier;
                }
            } else {
                group.wingmen.forEach((w) => {
                    if (Game.state.enemies.includes(w)) {
                        w.dataset.diving = '0';
                        w.style.zIndex = '4';
                    }
                });
                completedIdxs.push(groupIndex);
                return;
            }
        }

        if (group.diveState === 'descending') {
            group.bezierT = Math.min(group.bezierT + tStep, 1);
            const t = group.bezierT;

            const lp = Game.bezierPoint(
                group.leaderBezier.p0,
                group.leaderBezier.p1,
                group.leaderBezier.p2,
                group.leaderBezier.p3,
                t,
            );
            group.leader.style.left = `${lp.x}px`;
            group.leader.style.top  = `${lp.y}px`;

            group.wingmen.forEach((w, wi) => {
                if (!Game.state.enemies.includes(w)) {
                    return;
                }
                const wb = group.wingmenBeziers[wi];
                if (!wb) {
                    return;
                }
                const wp = Game.bezierPoint(wb.p0, wb.p1, wb.p2, wb.p3, t);
                w.style.left = `${wp.x}px`;
                w.style.top  = `${wp.y}px`;
            });

            while (group.shotsFired < group.shotThresholds.length
                   && t >= group.shotThresholds[group.shotsFired]) {
                Game._fireDiveShot(group.leader);
                group.shotsFired += 1;
            }

            if (t >= 1) {
                group.diveState = 'returning';
                group.leader.dataset.returning = '1';
                group.wingmen.forEach((w) => {
                    if (Game.state.enemies.includes(w)) {
                        w.dataset.returning = '1';
                    }
                });
            }

            return;
        }

        if (group.diveState === 'returning') {
            const step = movement.returnSpeed * deltaTime;
            let allArrived = true;

            const moveToSlot = function moveToSlot(enemy) {
                const target = Game.getEnemyFormationPosition(enemy);
                const toX = target.x - enemy.offsetLeft;
                const toY = target.y - enemy.offsetTop;
                const dist = Math.hypot(toX, toY);
                if (dist < 2) {
                    enemy.style.left = `${target.x}px`;
                    enemy.style.top  = `${target.y}px`;
                    enemy.dataset.diving = '0';
                    enemy.style.zIndex = '4';
                    return true;
                }
                const ratio = Math.min(step / dist, 1);
                enemy.style.left = `${enemy.offsetLeft + (toX * ratio)}px`;
                enemy.style.top  = `${enemy.offsetTop  + (toY * ratio)}px`;
                return false;
            };

            if (!moveToSlot(group.leader)) {
                allArrived = false;
            }

            group.wingmen.forEach((w) => {
                if (!Game.state.enemies.includes(w)) {
                    return;
                }
                if (!moveToSlot(w)) {
                    allArrived = false;
                }
            });

            if (allArrived) {
                completedIdxs.push(groupIndex);
            }
        }
    });

    const completedGroups = completedIdxs.map(idx => movement.diveGroups[idx]);
    for (let i = completedIdxs.length - 1; i >= 0; i -= 1) {
        movement.diveGroups.splice(completedIdxs[i], 1);
    }

    completedGroups.forEach(group => {
        if (Game.state.enemies.includes(group.leader)) {
            group.leader.dataset.returning = '0';
        }
        group.wingmen.forEach(w => {
            if (Game.state.enemies.includes(w)) {
                w.dataset.returning = '0';
            }
        });
    });
};

Game.createEnemyFormation = function createEnemyFormation() {
    Game.enemyRows.forEach((enemyRow, rowIndex) => {
        const totalColumns = enemyRow.count;
        const positions = Array.isArray(enemyRow.positions) ? enemyRow.positions : null;

        for (let columnIndex = 0; columnIndex < totalColumns; columnIndex += 1) {
            if (positions && positions.indexOf(columnIndex) === -1) {
                continue;
            }

            const enemy = document.createElement('img');
            enemy.className = 'enemy-ship';
            enemy.src = enemyRow.src;
            enemy.alt = `Inimigo ${enemyRow.color}`;
            enemy.dataset.row = rowIndex;
            enemy.dataset.column = columnIndex;
            enemy.dataset.count = enemyRow.count;
            enemy.dataset.diving = '0';
            Game.refs.gameFrame.appendChild(enemy);
            Game.state.enemies.push(enemy);
        }
    });

    Game.scheduleNextEnemyDive(performance.now());
    Game.layoutEnemies();
};

Game.restartEnemyFormation = function restartEnemyFormation() {
    const movement = Game.state.enemyMovement;
    movement.offsetX = 0;
    movement.direction = -1;
    movement.lastTime = 0;
    movement.diveGroups = [];
    movement.currentDiveCooldownMs = movement.diveCooldownMs;
    Game.createEnemyFormation();
};

Game.layoutEnemies = function layoutEnemies() {
    const formationEnemies = Game.getFormationEnemies();
    if (formationEnemies.length === 0) {
        return;
    }

    const sampleEnemy = formationEnemies[0];
    const enemyWidth = sampleEnemy.offsetWidth;
    const enemyHeight = sampleEnemy.offsetHeight;
    const gapX = Game.scale(15);
    const columnSpacing = enemyWidth + gapX;
    const rowSpacing = enemyHeight + Game.scale(12);
    const startY = Game.scale(80);
    Game.state.enemyMovement.maxRowWidth = 0;

    formationEnemies.forEach((enemy) => {
        const rowIndex = Number(enemy.dataset.row);
        const columnIndex = Number(enemy.dataset.column);
        const enemyCount = Number(enemy.dataset.count);
        const rowWidth = (enemyCount * enemyWidth) + ((enemyCount - 1) * gapX);
        const startX = ((Game.refs.gameFrame.clientWidth - rowWidth) / 2) + Game.state.enemyMovement.offsetX;
        const enemyX = startX + (columnIndex * columnSpacing);
        const enemyY = startY + (rowIndex * rowSpacing);

        Game.state.enemyMovement.maxRowWidth = Math.max(Game.state.enemyMovement.maxRowWidth, rowWidth);

        enemy.style.zIndex = '4';
        enemy.style.left = `${enemyX}px`;
        enemy.style.top  = `${enemyY}px`;
    });
};

Game.getFrontAliveRowEnemies = function getFrontAliveRowEnemies() {
    const formationEnemies = Game.getFormationEnemies();
    if (formationEnemies.length === 0) {
        return [];
    }

    let frontRowIndex = -1;
    for (let index = 0; index < formationEnemies.length; index += 1) {
        frontRowIndex = Math.max(frontRowIndex, Number(formationEnemies[index].dataset.row));
    }

    return formationEnemies.filter((enemy) => Number(enemy.dataset.row) === frontRowIndex);
};

Game.getBackAliveRowEnemies = function getBackAliveRowEnemies() {
    const formationEnemies = Game.getFormationEnemies();
    if (formationEnemies.length === 0) {
        return [];
    }

    let backRowIndex = Number.POSITIVE_INFINITY;
    for (let index = 0; index < formationEnemies.length; index += 1) {
        backRowIndex = Math.min(backRowIndex, Number(formationEnemies[index].dataset.row));
    }

    return formationEnemies.filter((enemy) => Number(enemy.dataset.row) === backRowIndex);
};
