#version 300 es

// an attribute will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;

// transformation matrices
uniform mat4x4 u_m;
uniform mat4x4 u_v;
uniform mat4x4 u_p;

// output to fragment stage
out vec3 o_vertex_normal_world;
out vec3 o_vertex_position_world;

void main() {

    // transform a vertex from object space directly to screen space
    // the full chain of transformations is:
    // object space -{model}-> world space -{view}-> view space -{projection}-> clip space
    vec4 vertex_position_world = u_m * vec4(a_position, 1.0);

    mat3 norm_matrix = transpose(inverse(mat3(u_m)));
    vec3 vertex_normal_world = normalize(norm_matrix * a_normal);
    gl_Position = u_p * u_v * vertex_position_world;

    o_vertex_normal_world = vertex_normal_world.xyz;
    o_vertex_position_world = vertex_position_world.xyz;

}