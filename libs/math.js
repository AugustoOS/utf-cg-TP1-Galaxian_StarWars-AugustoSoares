// Helpers minimos de matriz para o pipeline 2D em WebGL.
function translation(tx, ty, tz) {  // translaÃ§Ã£o do object
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1]);
}

function ortho(l, r, b, t, n, f) {  // left, right, bottom, top, near, far

    const mx = 2 / (r - l);
    const my = 2 / (t - b);
    const mz = -2 / (f - n); // no webgl se usa orientaÃ§Ã£o mÃ£o direita, por isso Ã© negativo
    const tx = -(r + l) / (r - l);
    const ty = -(t + b) / (t - b);
    const tz = -(f + n) / (f - n);

    return new Float32Array([mx, 0, 0, 0, 0, my, 0, 0, 0, 0, mz, 0, tx, ty, tz, 1]); // column order
}
