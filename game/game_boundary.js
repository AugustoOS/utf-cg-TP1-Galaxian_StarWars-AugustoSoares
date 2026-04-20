window.Game = window.Game ? Game : {};

// retorna o bounding rect do frame — usado pra calcular posicoes relativas em eventos de input
Game.getGameBounds = function getGameBounds() {
    return Game.refs.gameFrame.getBoundingClientRect();
};

// calcula quanto o grid pode se mover pra cada lado sem inimigo sair da tela e analisa cada fileira separadamente e usa o menor espaco livre como limite
Game.getHorizontalMovementLimits = function getHorizontalMovementLimits() {
    const formationEnemies = Game.getFormationEnemies ? Game.getFormationEnemies() : Game.state.enemies;

    if (!formationEnemies || formationEnemies.length === 0) {
        // fallback: centraliza pelo maxRowWidth quando nao tem inimigos no grid
        const fallback = Math.max((Game.refs.gameFrame.clientWidth - Game.state.enemyMovement.maxRowWidth) / 2, 0);
        return { left: fallback, right: fallback };
    }

    const sampleEnemy = formationEnemies[0];
    const enemyWidth = sampleEnemy.offsetWidth;
    const gapX = Game.scale(15);
    const columnSpacing = enemyWidth + gapX;

    // agrupa inimigos por fileira e rastreia a coluna mais a esquerda e mais a direita de cada uma
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

    // pra cada fileira, calcula o espaco livre entre a borda da tela e o inimigo mais extremo
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

// versao simplificada que retorna o menor dos dois lados — util quando so precisa de um valor simetrico
Game.getHorizontalMovementLimit = function getHorizontalMovementLimit() {
    const limits = Game.getHorizontalMovementLimits();
    return Math.max(Math.min(limits.left, limits.right), 0);
};

// impede a nave de sair pelas bordas — leva em conta a escala do sprite pra nao cortar a asa
Game.clampPlayerPosition = function clampPlayerPosition() {
    const scale = Game.playerRenderConfig ? Game.playerRenderConfig.playerScale : 1;
    const halfShipWidth = (Game.refs.playerShip.offsetWidth * scale) / 2;
    const minX = halfShipWidth;
    const maxX = Game.refs.gameFrame.clientWidth - halfShipWidth;

    Game.state.movement.x = Math.min(Math.max(Game.state.movement.x, minX), maxX);
    Game.refs.playerShip.style.left = `${Game.state.movement.x}px`;
};
