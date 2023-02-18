'use strict'

import { Object3D } from '../../assignment6.object3d.js'

class Box extends Object3D {

    /**
     * Creates a 3D box from 8 vertices and draws it as a line mesh
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     */
    constructor( gl, shader, box_scale = [1,1,1] ) 
    {
        let vertices = [
            1.000000, 1.000000, -1.000000,
            1.000000, -1.000000, -1.000000,
            1.000000, 1.000000, 1.000000,
            1.000000, -1.000000, 1.000000,
            -1.000000, 1.000000, -1.000000,
            -1.000000, -1.000000, -1.000000,
            -1.000000, 1.000000, 1.000000,
            -1.000000, -1.000000, 1.000000
        ]

        for (let i = 0; i < vertices.length; i++) {
            vertices[i] = vertices[i] * box_scale[i%3]
        }

        let indices = [
            0, 1,
            1, 3,
            3, 2,
            2, 0,

            0, 4,
            1, 5,
            2, 6,
            3, 7,

            4, 5,
            5, 7,
            7, 6,
            6, 4
        ]
        
        super( gl, shader, vertices, indices, gl.LINES )
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
}

export default Box