#version 300 es

// Fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision".
precision mediump float;

// the color to draw with
const vec3 c_color_1 = vec3(30.0/255.0, 56.0/255.0, 136.0/255.0); // Aggie Blue
const vec3 c_color_2 = vec3(255.0/255.0,191.0/255.0, 0.0/255.0); // Aggie Gold

// with webgl 2, we now have to define an out that will be the color of the fragment
out vec4 o_fragColor;

void main() {
    float z = gl_FragCoord.w;
    vec3 c = mix(c_color_1, c_color_2, z);
    o_fragColor = vec4(c,1);
}