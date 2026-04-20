#version 300 es

in vec2 a_position;
// tamanho do canvas em pixels
uniform vec2 u_resolution;
// posicao do sprite na tela
uniform vec2 u_translation;
// tamanho do sprite em pixels
uniform vec2 u_scale;
// uv passado pro fragment shader
out vec2 v_uv;

void main() {
    // aplica escala e translacao no espaco de pixels
    vec2 position = (a_position * u_scale) + u_translation;
    // converte pixels pra clip space (-1..1), e inverte Y pra ficar certo
    vec2 clip = ((position / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);
    gl_Position = vec4(clip, 0.0, 1.0);
    // inverte uv.y tambem pra textura nao sair de cabeca
    v_uv = vec2(a_position.x, 1.0 - a_position.y);
}