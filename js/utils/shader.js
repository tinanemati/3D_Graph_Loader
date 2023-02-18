'use strict'

import { loadExternalFile } from './utils.js'

class Shader
{
    constructor( gl, vertex_file, fragment_file )
    {
        this.gl = gl
        let vert = gl.createShader( gl.VERTEX_SHADER )
        let frag = gl.createShader( gl.FRAGMENT_SHADER )
        let program = gl.createProgram( );

        gl.shaderSource( vert, loadExternalFile( vertex_file ) )
        gl.shaderSource( frag, loadExternalFile( fragment_file ) )

        gl.compileShader( vert )
        if ( !gl.getShaderParameter( vert, gl.COMPILE_STATUS ) )
        {
            alert( `An error occurred compiling the shader: ${gl.getShaderInfoLog(vert)}` )
            gl.deleteShader( vert )
        }

        gl.compileShader( frag )
        if ( !gl.getShaderParameter( frag, gl.COMPILE_STATUS ) )
        {
            alert( `An error occurred compiling the shader: ${gl.getShaderInfoLog(frag)}` )
            gl.deleteShader( frag )
        }


        gl.attachShader( program, vert )
        gl.attachShader( program, frag )
        gl.linkProgram( program )

        if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) )
        {
            alert( `Unable to initialize the shader program: ${gl.getProgramInfoLog(program)}` )
            gl.deleteProgram( program )
        }

        this.program = program
    }

    use( )
    {
        this.gl.useProgram( this.program )
    }

    unuse( )
    {
        this.gl.useProgram( null )
    }

    getAttributeLocation( name )
    {
        return this.gl.getAttribLocation( this.program, name )
    }

    getUniformLocation( name )
    {
        return this.gl.getUniformLocation( this.program, name )
    }

    setUniform1f( name, value )
    {
        this.gl.uniform1f( this.getUniformLocation( name ), value )
    }

    setUniform2f( name, value )
    {
        this.gl.uniform2fv( this.getUniformLocation( name ), value )
    }

    setUniform3f( name, value )
    {
        this.gl.uniform3fv( this.getUniformLocation( name ), value )
    }

    setUniform1i( name, value )
    {
        this.gl.uniform1i( this.getUniformLocation( name ), value )
    }

    setUniform4x4f( name, value )
    {
        this.gl.uniformMatrix4fv( this.getUniformLocation( name ), false, value )
    }

    setArrayBuffer( name, buffer, num_components, stride = 0, offset = 0 )
    {
        const location = this.getAttributeLocation( name )

        this.gl.enableVertexAttribArray( location )
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, buffer )
        this.gl.vertexAttribPointer( location, num_components, this.gl.FLOAT, false, stride, offset )

    }

}

export default Shader
