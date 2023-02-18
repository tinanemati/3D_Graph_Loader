'use strict'

import * as mat4 from '../lib/glmatrix/mat4.js'
import * as vec3 from '../lib/glmatrix/vec3.js'
import * as quat4 from '../lib/glmatrix/quat.js'

import Box from './box3d.js'

/**
 * The Light base class. Stores common properties of all lights like color and intensity
 * It derives from the Box class (which is an Object3D in turn). This is done to visually
 * represent lights in the scene a differently shaped boxes.
 */
class Light extends Box {

    /**
     * Constructs a new light instance
     * 
     * @param {Number} id Light id derived from the scene config
     * @param {vec3} color Color of the light as 3-component vector
     * @param {Number} intensity Intensity of the light source
     * @param {Shader} target_shader The shader in which the light is to be used for shading
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context
     * @param {Shader} shader The shader that will be used to render the light gizmo in the scene
     * @param {vec3} box_scale A scale to skew the vertices in the Box class to generate differently shaped lights
     */
    constructor(id, color, intensity, target_shader, gl, shader, box_scale = [1,1,1]) {
        super( gl, shader, box_scale )

        this.id = id
        this.color = color
        this.intensity = intensity

        this.target_shader = target_shader
    }

    /**
     * Setter for this light's target shader
     * The target shader is the shader in which the light information will be used (i.e., Goraud, Phong, etc)
     * 
     */
    setTargetShader( shader ) {
        this.target_shader = shader
    }

    /**
     * Perform any necessary updates.
     * Children can override this.
     *
     */
    udpate( )
    {
        return
    }

    /**
     * Render the light gizmo to the scene
     * Note that this has nothing to do with Goraud or Phong shading
     * We just want to visually represent the light as a box and therefore need to render that box
     * 
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context 
     */
    render( gl ) {
        this.shader.use( )
        this.shader.setUniform3f('u_color', this.color)
        this.shader.unuse( )

        super.render( gl )
    }
}

/**
 * Ambient lights have color and intensity but no direction or position
 */
class AmbientLight extends Light {

    /**
     * Constructs the ambient light
     * 
     * @param {Number} id Light id derived from the scene config
     * @param {vec3} color Color of the light as 3-component vector
     * @param {Number} intensity Intensity of the light source
     * @param {Shader} target_shader The shader in which the light is to be used for shading
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context
     * @param {Shader} shader The shader that will be used to render the light gizmo in the scene
     * @param {vec3} box_scale A scale to skew the vertices in the Box class to generate differently shaped lights
     */
    constructor(id, color, intensity, target_shader, gl, shader) {
        super(id, color, intensity, target_shader, gl, shader, [10000.0, 10000.0, 10000.0])
    }

    /**
     * Updates the shader uniforms for this light
     * Access the correct light in the shader's light array by using this.id
     */
    update( ) {
        this.target_shader.use()
        this.target_shader.setUniform3f(`u_lights_ambient[${this.id}].color`, this.color)
        this.target_shader.setUniform1f(`u_lights_ambient[${this.id}].intensity`, this.intensity)
        this.target_shader.unuse()
    }
}

/**
 * Directional light have color, intensity and a direction that they cast light in
 * Light rays cast by directional lights all run in parallel, so their direction is all we need to describe them.
 */
class DirectionalLight extends Light {

    /**
     * Constructs the directional light
     * 
     * @param {Number} id Light id derived from the scene config
     * @param {vec3} color Color of the light as 3-component vector
     * @param {Number} intensity Intensity of the light source
     * @param {Shader} target_shader The shader in which the light is to be used for shading
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context
     * @param {Shader} shader The shader that will be used to render the light gizmo in the scene
     * @param {vec3} box_scale A scale to skew the vertices in the Box class to generate differently shaped lights
     */
    constructor(id, color, intensity, target_shader, gl, shader) {
        super(id, color, intensity, target_shader, gl, shader, [0.025, 0.25, 0.025])
    }

    /**
     * Updates the shader uniforms for this light
     * Access the correct light in the shader's light array by using this.id
     * 
     * Use the light's this.model_matrix to find the direction
     */
    update( ) {
        let transform = mat4.getRotation(mat4.create(), this.model_matrix)
        let direction = vec3.transformQuat(vec3.create(), [0.0,-1.0,0.0], transform)

        this.target_shader.use()
        this.target_shader.setUniform3f(`u_lights_directional[${this.id}].direction`, direction)
        this.target_shader.setUniform3f(`u_lights_directional[${this.id}].color`, this.color)
        this.target_shader.setUniform1f(`u_lights_directional[${this.id}].intensity`, this.intensity)
        this.target_shader.unuse()
    }
}

/**
 * Point lights have color, intensity and a position
 * Their light rays all originate from that position which means they have many different directions. In fact, all directions.
 */
class PointLight extends Light {

    /**
     * Constructs the point light
     * 
     * @param {Number} id Light id derived from the scene config
     * @param {vec3} color Color of the light as 3-component vector
     * @param {Number} intensity Intensity of the light source
     * @param {Shader} target_shader The shader in which the light is to be used for shading
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context
     * @param {Shader} shader The shader that will be used to render the light gizmo in the scene
     * @param {vec3} box_scale A scale to skew the vertices in the Box class to generate differently shaped lights
     */
    constructor(id, color, intensity, target_shader, gl, shader) {
        super(id, color, intensity, target_shader, gl, shader, [0.1, 0.1, 0.1])
    }

    /**
     * Updates the shader uniforms for this light
     * Access the correct light in the shader's light array by using this.id
     * 
     * Use this light's this.model_matrix to find its position
     */
    update( ) {
        let position = mat4.getTranslation(vec3.create(), this.model_matrix)

        this.target_shader.use()
        this.target_shader.setUniform3f(`u_lights_point[${this.id}].position`, position)
        this.target_shader.setUniform3f(`u_lights_point[${this.id}].color`, this.color)
        this.target_shader.setUniform1f(`u_lights_point[${this.id}].intensity`, this.intensity)
        this.target_shader.unuse()
    }
}

export {
    Light,
    AmbientLight,
    DirectionalLight,
    PointLight
}
