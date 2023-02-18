'use strict'

import Texture from '../../assignment6.texture.js'

/**
 * The Material class is used to store material properties for Shaded Objects
 * 
 * It contains material properties and textures used in Goraud and Phong shading (among others)
 * 
 */
class Material {

    /**
     * Constructs a new material
     * 
     * @param {Array<Number>} kA Ambient color of the material
     * @param {Array<Number>} kD Diffuse color of the material
     * @param {Array<Number>} kS Specular color of the material
     * @param {Number} shininess Shininess of the specular color
     * @param {Texture} map_kD Optional image texture for this material
     * @param {Texture} map_nS Optional roughness texture for this material
     * @param {Texture} map_norm Optional normal texture for this material
     */
    constructor( kA = [0,0,0], kD = [0,0,0], kS = [0,0,0], shininess = 1.0, map_kD = null, map_nS = null, map_norm ) {
        this.kA = kA
        this.kD = kD
        this.kS = kS
        this.shininess = shininess

        this.map_kD = map_kD
        this.map_nS = map_nS
        this.map_norm = map_norm
    }

    hasTexture() {
        return this.map_kD != null || this.map_nS != null || this.map_norm != null
    }

    hasMapKD() {
        return this.map_kD != null
    }

    hasMapNS() {
        return this.map_nS != null
    }

    hasMapNorm() {
        return this.map_norm != null
    }

    getMapKD() {
        return this.map_kD.getGlTexture()
    }

    getMapNS() {
        return this.map_nS.getGlTexture()
    }

    getMapNorm() {
        return this.map_norm.getGlTexture()
    }
}

export default Material