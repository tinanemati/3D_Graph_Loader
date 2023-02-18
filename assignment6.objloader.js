'use strict'

import { loadExternalFile, getFileDir } from './js/utils/utils.js'
import { MTLLoader } from './assignment6.mtlloader.js'
import Material from './js/app/material.js'

import * as vec3 from './js/lib/glmatrix/vec3.js'
import * as vec2 from './js/lib/glmatrix/vec2.js'

/**
 * A class to load OBJ files from disk
 */
class OBJLoader {

    /**
     * Constructs the loader
     * 
     * @param {String} filename The full path to the model OBJ file on disk
     */
    constructor(filename) {
        this.filename = filename
    }

    /**
     * Loads the file from disk and parses the geometry
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @returns {[Array<Number>, Array<Number>]} A triple / list containing 1) the list of vertices and 2) the list of triangle indices and 3) a material
     */
    load( gl ) {

        // Load the file's contents
        let contents = loadExternalFile(this.filename)

        // Create lists for vertex positions, vertex normals, and indices and a material map
        let vertex_positions = []
        let vertex_texture_coords = []
        let vertex_normals = []
        let vertex_tangents = []
        let position_indices = []
        let texture_coord_indices = []
        let normal_indices = []
        let materials = {}

        // Create a new placeholder material
        let material = new Material([0.2,0.2,0.2], [0.5,0.5,0.5], [0.3,0.3,0.3], 20.0)

        // Parse the file line-by-line
        for (let line of contents.split('\n')){
            let token = line.split(' ')[0]
            switch(token) {
                case 'mtllib':
                    let file = line.split(' ')[1]
                    let filepath = getFileDir(this.filename)
                    let loader = new MTLLoader(`${filepath}/${file}`)
                    materials = loader.load( gl )
                    break
                case 'usemtl':
                    let material_name = line.split(' ')[1]
                    if (!(material_name in materials))
                        throw `OBJ requested material "${material_name}" which is not defined by MTL`
                    material = materials[material_name]
                    break
                case 'v':
                    vertex_positions.push(...this.parseVertex(line))
                    break
                case 'vt':
                    vertex_texture_coords.push(...this.parseTextureCoord(line))
                    break
                case 'vn':
                    vertex_normals.push(...this.parseNormal(line))
                    break
                case 'f':
                    position_indices.push(...this.parseFace(line, 0))
                    texture_coord_indices.push(...this.parseFace(line, 1))
                    normal_indices.push(...this.parseFace(line, 2))
                    break
            }
        }

        // Sanity check for texture coordinates
        if (material.hasTexture() && vertex_texture_coords.length <= 0)
            throw `Object "${this.filename}" requests texture but defines no texture coordinates`

        // Find min and max extents and normalize the vertex positions
        let max_extent = -Infinity
        let min_extent = Infinity
        for (let v of vertex_positions) {
            if (v > max_extent) max_extent = v
            if (v < min_extent) min_extent = v
        }

        let total_extent = max_extent - min_extent
        for (let i = 0; i < vertex_positions.length; i++) {
            vertex_positions[i] = 2 * ( (vertex_positions[i] - min_extent) / total_extent ) - 1.0
        }

        // Reorder entries to match the order of vertex position indices
        [vertex_positions, vertex_normals, vertex_texture_coords, position_indices] = this.resolveIndexGroups(vertex_positions, vertex_normals, vertex_texture_coords, position_indices, normal_indices, texture_coord_indices)

        //throw '"OBJLoader.load" is incomplete'

        // Merge vertex positions and normals into a single vertex list
        let vertex_data = []
        for (let i = 0; i < vertex_positions.length/3; i++) {
            vertex_data.push(...vertex_positions.slice(i*3, i*3+3)); 
            vertex_data.push(...vertex_normals.slice(i*3, i*3+3));
            
        }
        // If the loaded material has texture(s), pass tangents and texture coordinates too
        if (material.hasTexture()) {
            // If there is a texture, we made sure to have texture coordinates
            // We calculate the per-vertex tangents in all cases even if there is no normal map
            // This makes VAO creation easier and more uniform
            vertex_tangents = this.calculateTangents(vertex_positions, vertex_texture_coords, position_indices)
            let temp_vertex_data = []
             // Pass tangents and texture coordinates
            for (let i = 0; i < vertex_positions.length/3; i++){
                temp_vertex_data.push(...vertex_data.slice(i*6, i*6+6));
                temp_vertex_data.push(...vertex_tangents.slice(i*3, i*3+3));
                temp_vertex_data.push(...vertex_texture_coords.slice(i*2, i*2+2));

            }
           vertex_data = temp_vertex_data;
        }

        return [ vertex_data, position_indices, material ]
    }

    /**
     * Reorders, rearranges, and duplicates the given list of positions, normals and indices to account for heterogenous index pairs
     * The goal is to form a number of lists so that entries in all lists correspond to each other
     * 
     * Since a vertex position index can pair with different normal or texture coordinate indices, we need to duplicate some entries to account for this ambiguity 
     * 
     * @param {Array<Number>} vertex_positions List of vertex positions
     * @param {Array<Number>} vertex_normals List of vertex normals
     * @param {Array<Number>} vertex_texture_coords List of vertex texture coordinates
     * @param {Array<Number>} position_indices List of position indices
     * @param {Array<Number>} normal_indices List of normal indices
     * @param {Array<Number>} texture_coord_indices List of texture coordinate indices
     * @returns {[Array<Number>, Array<Number>, Array<Number>]} Triplet containing the new list of positions, normals, and indices
     */
     resolveIndexGroups(vertex_positions, vertex_normals, vertex_texture_coords, position_indices, normal_indices, texture_coord_indices) 
     {
         if (position_indices.length != normal_indices.length || position_indices.length != texture_coord_indices.length)
             throw 'Index count mismatch. Number of indices must be equal for all vertex data'
 
         let num_entries = position_indices.length
 
         let entry_indices = {}
 
         let out_vertex_positions = []
         let out_vertex_normals = []
         let out_vertex_texture_coords = []
 
         let out_indices = []
 
         for (let i = 0; i < num_entries; i++) {
             let position_idx = position_indices[i] * 3
             let normal_idx = normal_indices[i] * 3
             let texture_coord_idx = texture_coord_indices[i] * 2
 
             let key = `${[position_indices[i]]},${normal_indices[i]},${texture_coord_indices[i]}`
 
             if (!(key in entry_indices)) {
                 entry_indices[key] = out_vertex_positions.length / 3
                 for (let j = 0; j < 3; j++) {
                     out_vertex_positions.push(vertex_positions[position_idx + j])
                     out_vertex_normals.push(vertex_normals[normal_idx + j])
                     if (j < 2)
                        out_vertex_texture_coords.push(vertex_texture_coords[texture_coord_idx + j])
                 }
             }
 
             out_indices.push(entry_indices[key])
         }
 
 
         if (out_vertex_positions.length != out_vertex_normals.length)
             throw 'Both vertex data lists need to be the same length after processing'
 
         return [out_vertex_positions, out_vertex_normals, out_vertex_texture_coords, out_indices]
    }

    /**
     * Calculates UV-aligned tangents for each vertex
     * These can be used together with the normal in the shader to create a tangent space matrix
     * which is needed to perform normal mapping
     * 
     * 
     * @param {Array<Number>} vertex_positions List of vertex positions
     * @param {Array<Number>} vertex_texture_coords List of texture coordinates
     * @param {Array<Number>} indices List of vertex indices
     * @returns {Array<Number>} List of tangents
     */
    calculateTangents(vertex_positions, vertex_texture_coords, indices) {
        let vertex_tangents = []

        let get_triangle = (source, idx1, idx2, idx3, num_components) => {
            let triangle = []
            for (let idx of [idx1, idx2, idx3]) {
                let entry = []
                for (let k = 0; k < num_components; k++) {
                    entry.push(source[(idx*num_components)+k])
                }
                triangle.push(entry)
            }
            return triangle
        }

        for (let i = 0; i < indices.length; i+=3) {
            let [pos0,pos1,pos2] = get_triangle(vertex_positions, indices[i], indices[i+1], indices[i+2], 3)
            let [uv0, uv1, uv2] = get_triangle(vertex_texture_coords, indices[i], indices[i+1], indices[i+2], 2)

            let dpos1 = vec3.subtract(vec3.create(), pos1, pos0)
            let dpos2 = vec3.subtract(vec3.create(), pos2, pos0)

            let duv1 = vec2.subtract(vec2.create(), uv1, uv0)
            let duv2 = vec2.subtract(vec2.create(), uv2, uv0)

            let r = 1.0 / (duv1[0] * duv2[1] - duv1[1] * duv2[0]);
            let tangent = vec3.scale(vec3.create(), 
                vec3.subtract(vec3.create(),
                    vec3.scale(vec3.create(), dpos1, duv2[1]),
                    vec3.scale(vec3.create(), dpos2, duv1[1]))
                ,r)

            for (let j = 0; j < 3; j++) {
                vertex_tangents[indices[i+j]*3 ] = tangent[0]
                vertex_tangents[indices[i+j]*3 + 1] = tangent[1]
                vertex_tangents[indices[i+j]*3 + 2] = tangent[2]
            }
        }

        return vertex_tangents
    }
 

    /**
     * Parses a single OBJ vertex position (v) entry given as a string
     * 
     * @param {String} vertex_string String containing the vertex position entry 'v {x} {y} {z}'
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the vertex position
     */
    parseVertex(vertex_string)
    {
        return this.parseVec3(vertex_string)
    }

    /**
     * Parses a single OBJ vertex texture coord (vt) entry given as a string
     * 
     * @param {String} vertex_string String containing the vertex texture coord entry 'vt {x} {y} {z}'
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the vertex texture coord
     */
    parseTextureCoord(texture_coord_string) {
        return this.parseVec2(texture_coord_string)
    }

    /**
     * Parses a single OBJ vertex normal (vn) entry given as a string
     * 
     * @param {String} vertex_string String containing the vertex normal entry 'vn {x} {y} {z}'
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the vertex normal
     */
    parseNormal(normal_string) {
        return this.parseVec3(normal_string)
    }

    /**
     * Parse generic 3-float entry from OBJ files (v, vn, vt)
     * 
     * @param {String} vec_string 
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the entry
     */
    parseVec3(vec_string) {
        let components = vec_string.split(' ')

        return [
            parseFloat(components[1]),
            parseFloat(components[2]),
            parseFloat(components[3])
        ]
    }

    /**
     * Parse generic 3-float entry from OBJ files (v, vn, vt)
     * 
     * @param {String} vec_string 
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the entry
     */
    parseVec2(vec_string) {
        let components = vec_string.split(' ')

        return [
            parseFloat(components[1]),
            parseFloat(components[2])
        ]
    }

    /**
     * Parses a single OBJ face entry given as a string
     * 
     * @param {String} face_string String containing the face entry 'f {v0}/{vt0}/{vn0} {v1}/{vt1}/{vn1} {v2}/{vt2}/{vn2} ({v3}/{vt3}/{vn3})'
     * @param {Number} entry_index The index of the entry to parse (v = 0, vt = 1, vn = 2)
     * @returns {Array<Number>} A list containing 3 (or 6) indices
     */
    parseFace(face_string, entry_index)
    {
        let components = face_string.split(' ')
        let face = []

        for (let component of components) {
            if (component == 'f')
                continue

            let vtn = component.split('/')
            if (vtn.length <= entry_index)
                throw `No face entry found for entry indes ${entry_index}`
            face.push(parseInt(vtn[entry_index])-1)
        }

        if (face.length == 3) {
            return face
        } else if (face.length == 4) {
            return this.triangulateFace(face)
        } else {
            throw `Unexpected number of entries for face. Expected 3 or 4 but got ${face.length}`
        }
    }

    /**
     * Triangulates a face entry given as a list of 4 indices
     * Return a new index list containing the triangulated indices
     * 
     * @param {Array<Number>} face The quad indices with 4 entries
     * @returns {Array<Number>} The newly created list containing triangulated indices
     */
    triangulateFace(face)
    {
        return [
            face[0], face[1], face[3],
            face[1], face[2], face[3]
        ]
    }
}



// JS Module Export -- No need to modify this
export
{
    OBJLoader
}