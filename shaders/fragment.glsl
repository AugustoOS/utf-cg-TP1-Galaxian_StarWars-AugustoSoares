#version 300 es

// precisao alta pra nao ter artefato estranho nas texturas
precision highp float;

// coordenada uv interpolada que vem do vertex shader
in vec2 v_uv;
// textura do sprite (nave, inimigo, etc)
uniform sampler2D u_texture;
// cor final do fragmento
out vec4 outColor;

void main() {
    // so pega a cor da textura naquela coordenada e manda pra tela
    outColor = texture(u_texture, v_uv);
}
