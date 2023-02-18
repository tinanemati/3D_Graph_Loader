#version 300 es

// an attribute will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;
in vec3 a_tangent;
in vec2 a_texture_coord;

// transformation matrices
uniform mat4x4 u_m;
uniform mat4x4 u_v;
uniform mat4x4 u_p;

// output to fragment stage
// TODO: Create varyings to pass data to the fragment stage (position, texture coords, and more)
out vec3 o_vertex_normal_world;
out vec3 o_vertex_position_world;
out vec3 o_vertex_tangent_world;
out vec2 o_texture_coord;
out mat3 o_tbn_world;

void main() {

    // transform a vertex/normal and tangent from object space directly to screen space
    // the full chain of transformations is:
    // object space -{model}-> world space -{view}-> view space -{projection}-> clip space
    vec4 vertex_position_world = u_m * vec4(a_position, 1.0);
    vec4 vertex_normal_world = u_m * vec4(a_normal, 0.0);
    vec4 vertex_tangent_world = u_m * vec4(a_tangent, 0.0);

    // TODO: Construct TBN matrix from normals, tangents and bitangents
    // TODO: [Tina] Something is off with the calculations here 
    // TODO: Not sure which calculation should I go with
    
    //mat3 norm_matrix = transpose(inverse(mat3(u_m)));
    //vec3 t = normalize(norm_matrix * vec3(vertex_tangent_world));
    //vec3 n = normalize(norm_matrix * vec3(vertex_normal_world));
    //mat4 norm_matrix = transpose(inverse(u_m));
    //vec3 t = normalize(norm_matrix * vertex_tangent_world).xyz;
    //vec3 n = normalize(norm_matrix * vertex_normal_world).xyz;
    vec3 t = normalize(vec3(vertex_tangent_world));
    vec3 n = normalize(vec3(vertex_normal_world));

    // TODO: Use the Gram-Schmidt process to re-orthogonalize tangents
    // NOTE: Different from the book, try to do all calculations in world space using the TBN to transform normals
    // HINT: Refer to https://learnopengl.com/Advanced-Lighting/Normal-Mapping for all above
    t = normalize(t - dot(t, n) * n);
    vec3 b = cross(n, t);
    mat3 tbn = mat3(t, b, n);

    // TODO: Forward data to fragment stage

    gl_Position = u_p * u_v * vertex_position_world;
    
    o_vertex_normal_world = vertex_normal_world.xyz;
    o_vertex_position_world = vertex_position_world.xyz;
    o_vertex_tangent_world = vertex_tangent_world.xyz;
    o_texture_coord = a_texture_coord;
    o_tbn_world = tbn;
}