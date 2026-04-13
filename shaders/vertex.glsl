#version 300 es

in vec2 a_position;
uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform vec2 u_scale;
out vec2 v_uv;

void main() {
    vec2 position = (a_position * u_scale) + u_translation;
    vec2 clip = ((position / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);
    gl_Position = vec4(clip, 0.0, 1.0);
    v_uv = vec2(a_position.x, 1.0 - a_position.y);
}