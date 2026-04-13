window.GLPanel = window.GLPanel ? window.GLPanel : {};

GLPanel.state = { // Cria (ou recria) um objeto chamado "state" dentro de "GLPanel" para armazenar o estado atual do painel WebGL.
    canvas: null,
    gl: null,
    program: null,
    positionBuffer: null,
    locations: null,
    pixelRatio: 1,
    options: {
        shaderPaths: {
            vertex: '',
            fragment: '',
        },
    },
};

GLPanel.loadShaderSource = async function loadShaderSource(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Could not fetch shader: ${path}`);
    }

    return response.text();
};

GLPanel.createShader = function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
};

GLPanel.createProgram = function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = GLPanel.createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = GLPanel.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
};

GLPanel.resize = function resize() {
    const state = GLPanel.state;
    const pixelRatio = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(state.canvas.clientWidth * pixelRatio);
    const displayHeight = Math.floor(state.canvas.clientHeight * pixelRatio);

    if (state.canvas.width !== displayWidth || state.canvas.height !== displayHeight) {
        state.canvas.width = displayWidth;
        state.canvas.height = displayHeight;
    }

    state.pixelRatio = pixelRatio;
    state.gl.viewport(0, 0, state.canvas.width, state.canvas.height);
};

GLPanel.init = async function init(canvasElement, options) {
    if (GLPanel.state.gl) {
        return GLPanel.state.gl;
    }

    const canvas = canvasElement || document.querySelector('.canvas');
    if (!canvas) {
        return null;
    }

    const mergedOptions = {
        shaderPaths: {
            vertex: '',
            fragment: '',
        },
        ...(options || {}),
        shaderPaths: {
            vertex: (options && options.shaderPaths && options.shaderPaths.vertex) || '',
            fragment: (options && options.shaderPaths && options.shaderPaths.fragment) || '',
        },
    };

    if (!mergedOptions.shaderPaths.vertex || !mergedOptions.shaderPaths.fragment) {
        console.error('GLPanel.init requires shaderPaths.vertex and shaderPaths.fragment.');
        return null;
    }

    const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
    });
    if (!gl) {
        console.error('WebGL2 is not available in this browser.');
        return null;
    }

    let vertexShaderSource = '';
    let fragmentShaderSource = '';

    try {
        const sources = await Promise.all([
            GLPanel.loadShaderSource(mergedOptions.shaderPaths.vertex),
            GLPanel.loadShaderSource(mergedOptions.shaderPaths.fragment),
        ]);

        vertexShaderSource = sources[0];
        fragmentShaderSource = sources[1];
    } catch (error) {
        console.error(error);
        return null;
    }

    const program = GLPanel.createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) {
        return null;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ]),
        gl.STATIC_DRAW,
    );

    GLPanel.state = {
        canvas,
        gl,
        program,
        positionBuffer,
        pixelRatio: 1,
        options: mergedOptions,
        locations: {
            aPosition: gl.getAttribLocation(program, 'a_position'),
            uResolution: gl.getUniformLocation(program, 'u_resolution'),
            uTranslation: gl.getUniformLocation(program, 'u_translation'),
            uScale: gl.getUniformLocation(program, 'u_scale'),
            uTexture: gl.getUniformLocation(program, 'u_texture'),
        },
    };

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(GLPanel.state.locations.aPosition);
    gl.vertexAttribPointer(GLPanel.state.locations.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); //desinverte a textura para alinhar com as coordenadas de tela
    gl.clearColor(0, 0, 0, 0);

    GLPanel.resize();
    window.addEventListener('resize', GLPanel.resize);
    return gl;
};

GLPanel.loadTextureFromUrl = function loadTextureFromUrl(url) {
    const state = GLPanel.state;
    if (!state.gl) {
        return Promise.reject(new Error('GLPanel must be initialized before loading textures.'));
    }

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const texture = state.gl.createTexture();
            state.gl.bindTexture(state.gl.TEXTURE_2D, texture);
            state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_WRAP_S, state.gl.CLAMP_TO_EDGE);
            state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_WRAP_T, state.gl.CLAMP_TO_EDGE);
            state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_MIN_FILTER, state.gl.NEAREST);
            state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_MAG_FILTER, state.gl.NEAREST);
            state.gl.texImage2D(
                state.gl.TEXTURE_2D,
                0,
                state.gl.RGBA,
                state.gl.RGBA,
                state.gl.UNSIGNED_BYTE,
                image,
            );
            resolve(texture);
        };

        image.onerror = () => reject(new Error(`Could not load texture: ${url}`));
        image.src = url;
    });
};

GLPanel.beginFrame = function beginFrame() {
    const state = GLPanel.state;
    if (!state.gl) {
        return;
    }

    GLPanel.resize();
    state.gl.useProgram(state.program);
    state.gl.clear(state.gl.COLOR_BUFFER_BIT);
};

GLPanel.drawSprite = function drawSprite(texture, x, y, width, height) {
    const state = GLPanel.state;
    if (!state.gl || !texture) {
        return;
    }

    const scaledX = x * state.pixelRatio;
    const scaledY = y * state.pixelRatio;
    const scaledWidth = width * state.pixelRatio;
    const scaledHeight = height * state.pixelRatio;

    state.gl.uniform2f(state.locations.uResolution, state.canvas.width, state.canvas.height);
    state.gl.uniform2f(state.locations.uTranslation, scaledX, scaledY);
    state.gl.uniform2f(state.locations.uScale, scaledWidth, scaledHeight);
    state.gl.activeTexture(state.gl.TEXTURE0);
    state.gl.bindTexture(state.gl.TEXTURE_2D, texture);
    state.gl.uniform1i(state.locations.uTexture, 0);
    state.gl.drawArrays(state.gl.TRIANGLES, 0, 6);
};
