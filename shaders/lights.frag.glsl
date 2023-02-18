#version 300 es

// Fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision".
precision mediump float;

// light color
uniform vec3 u_color;

// with webgl 2, we now have to define an out that will be the color of the fragment
out vec4 o_fragColor;

void main() {
    o_fragColor = vec4(u_color, 1);
}