const canvas = document.querySelector('.canvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL2 não está disponível');
    throw new Error('WebGL2 não suportado');
}

async function loadShader(path) {
    const response = await fetch(path);
    return await response.text();
}

function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    return shader;
}

async function createProgram(vertexPath, fragmentPath) {
    const vertexShaderCode = await loadShader(vertexPath);
    const fragmentShaderCode = await loadShader(fragmentPath);

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderCode));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderCode));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
    }

    return program;
}

function resizeCanvasToViewport() {
    const pixelRatio = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(canvas.clientWidth * pixelRatio);
    const displayHeight = Math.floor(canvas.clientHeight * pixelRatio);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
}

function setupGL() {
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    resizeCanvasToViewport();
}

window.addEventListener('resize', resizeCanvasToViewport);
resizeCanvasToViewport();
