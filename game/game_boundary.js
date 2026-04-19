window.Game = window.Game ? Game : {};

// Retorna o bounding rect do gameFrame em coordenadas de tela.
// Útil pra calcular posições relativas ao frame durante eventos de input.
Game.getGameBounds = function getGameBounds() {
    return Game.refs.gameFrame.getBoundingClientRect();
};

// Calcula quanto a formação de inimigos pode se mover pra esquerda e pra direita
// sem que qualquer inimigo vivo saia da área do jogo.
// Analisa cada linha separadamente e pega o menor espaço livre em cada direção
// (o "gargalo" que limita o quanto toda a formação pode se deslocar).
Game.getHorizontalMovementLimits = function getHorizontalMovementLimits() {
    const formationEnemies = Game.getFormationEnemies ? Game.getFormationEnemies() : Game.state.enemies;

    if (!formationEnemies || formationEnemies.length === 0) {
        const fallback = Math.max((Game.refs.gameFrame.clientWidth - Game.state.enemyMovement.maxRowWidth) / 2, 0);
        return { left: fallback, right: fallback };
    }

    const sampleEnemy = formationEnemies[0];
    const enemyWidth = sampleEnemy.offsetWidth;
    const gapX = Game.scale(15);
    const columnSpacing = enemyWidth + gapX;

    const rowMap = {};
    formationEnemies.forEach((enemy) => {
        const row = Number(enemy.dataset.row);
        const col = Number(enemy.dataset.column);
        if (!rowMap[row]) {
            rowMap[row] = { minCol: col, maxCol: col, count: Number(enemy.dataset.count) };
        } else {
            rowMap[row].minCol = Math.min(rowMap[row].minCol, col);
            rowMap[row].maxCol = Math.max(rowMap[row].maxCol, col);
        }
    });

    const frameWidth = Game.refs.gameFrame.clientWidth;

    let minAllowedFromLeft = Infinity;
    let minAllowedFromRight = Infinity;

    Object.values(rowMap).forEach((row) => {
        const originalCount = row.count;
        const originalRowWidth = (originalCount * enemyWidth) + ((originalCount - 1) * gapX);
        const originalStartX = (frameWidth - originalRowWidth) / 2;

        const aliveLeft = originalStartX + (row.minCol * columnSpacing);
        const aliveRight = originalStartX + (row.maxCol * columnSpacing) + enemyWidth;

        const limitFromRight = frameWidth - aliveRight;
        const limitFromLeft = aliveLeft;

        minAllowedFromLeft = Math.min(minAllowedFromLeft, limitFromLeft);
        minAllowedFromRight = Math.min(minAllowedFromRight, limitFromRight);
    });

    return {
        left: Math.max(minAllowedFromLeft, 0),
        right: Math.max(minAllowedFromRight, 0),
    };
};

// Versão simplificada de getHorizontalMovementLimits: retorna um único valor
// que é o menor dos dois lados, garantindo que nenhuma borda seja ultrapassada.
Game.getHorizontalMovementLimit = function getHorizontalMovementLimit() {
    const limits = Game.getHorizontalMovementLimits();
    return Math.max(Math.min(limits.left, limits.right), 0);
};

// Impõe os limites horizontais ao jogador: garante que a nave nunca saia
// pelas bordas do gameFrame, levando em conta a largura escalada da nave.
// Atualiza também o atributo `left` no CSS pra refletir a posição final.
Game.clampPlayerPosition = function clampPlayerPosition() {
    const scale = Game.playerRenderConfig ? Game.playerRenderConfig.playerScale : 1;
    const halfShipWidth = (Game.refs.playerShip.offsetWidth * scale) / 2;
    const minX = halfShipWidth;
    const maxX = Game.refs.gameFrame.clientWidth - halfShipWidth;

    Game.state.movement.x = Math.min(Math.max(Game.state.movement.x, minX), maxX);
    Game.refs.playerShip.style.left = `${Game.state.movement.x}px`;
};
