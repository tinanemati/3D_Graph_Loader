'use strict'

import { ShadedObject3D } from "../../assignment6.object3d.js"
import { SHADER_MAX_LIGHTS, hex2rgb, json2transform } from "../utils/utils.js"
import * as mat4 from "../lib/glmatrix/mat4.js"
import * as quat4 from "../lib/glmatrix/quat.js"

import { OBJLoader } from "../../assignment6.objloader.js"
import { Light, AmbientLight, DirectionalLight, PointLight } from "./light.js"


/**
 * A Scene represents a set of objects to be drawn on screen
 * Scenes are configured with a scene file which is loaded from disk
 * The Scene contains a scenegraph which is a hierarchical representation 
 * of all the objects in the scene. Each node in the scene graph has a 
 * transformation and transformations are cascaded through the graph.
 * 
 * Some nodes are purely virtual and others contain geometry
 * Virtual nodes are represented by the class SceneNode
 * Geometry nodes are represented by the class ModelNode
 * 
 */
class Scene {

    /**
     * Constructs a Scene using a scene config
     * 
     * @param {Object} scene_config JSON object containing the scene config loaded from a scene file
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw objects
     * @param {Shader} light_shader The shader to be used to represent lights in the scene
     */
    constructor(scene_config, gl, shader, light_shader) {
        this.scene_config = scene_config

        // First load the OBJ models
        this.models = 'models' in scene_config ? this.loadModels(scene_config.models, gl) : {}

        // Then load all the lights and reset the lights in the shader
        this.lights = 'lights' in scene_config ? this.loadLights(scene_config.lights) : {}
        this.light_counts = {}
        this.resetLights( shader )

        // Load the scenegraph recursively
        this.scenegraph = this.loadScenegraphNode(scene_config.scenegraph, gl, shader, light_shader)

        // Trigger the computation of all hierarchical transformations by setting the root's transformation
        this.scenegraph.setTransformation(this.scenegraph.transformation)
    }

    /**
     * Reset light settings in the shader
     * This is needed when switching between scenes, 
     * as uniforms are otherwise preserved
     * 
     * @param {Shader} shader The shader to be used to draw objects
     */
    resetLights( shader ) {
        shader.use( )
        for (let i = 0; i < SHADER_MAX_LIGHTS; i++ ) {
            shader.setUniform3f(`u_lights_ambient[${i}].color`, [0,0,0])
            shader.setUniform1f(`u_lights_ambient[${i}].intensity`, 0.0)

            shader.setUniform3f(`u_lights_directional[${i}].direction`, [0,0,0])
            shader.setUniform3f(`u_lights_directional[${i}].color`, [0,0,0])
            shader.setUniform1f(`u_lights_directional[${i}].intensity`, 0.0)

            shader.setUniform3f(`u_lights_point[${i}].position`, [0,0,0])
            shader.setUniform3f(`u_lights_point[${i}].color`, [0,0,0])
            shader.setUniform1f(`u_lights_point[${i}].intensity`, 0.0)
        }
        shader.unuse( )
    }

    /**
     * Loads model geometry defined by the config.
     * This uses the OBJLoader class to load OBJ files.
     * 
     * @param {Object} models_config JSON object containing the list of models from the scene config
     * @returns {Map<String,[Array<Number>, Array<Number>]>} A dictionary containing the model data for each loaded OBJ file. Model data consists of a tuple of vertex and index values. Refer to OBJLoader for details.
     */
    loadModels( models_config, gl ) {
        let models = {}

        for (let model_config of models_config) {
            // Load the OBJ file
            let loader = new OBJLoader(model_config.obj)
            models[model_config.name] = loader.load(gl)
        }

        return models
    }

    /**
     * Loads lights defined by the config
     * 
     * @param {Object} models_config JSON object containing the list of models from the scene config
     * @returns {Map<String,[Array<Number>, Array<Number>]>} A dictionary containing the model data for each loaded OBJ file. Model data consists of a tuple of vertex and index values. Refer to OBJLoader for details.
     */
    loadLights( lights_config ) {
        let lights = {}

        for (let light_config of lights_config) {
            // Load the light
            lights[light_config.name] = light_config            
        }

        return lights
    }

    /**
     * Instantiates a Object3D instance based on model geometry that was loaded by loadModels
     * 
     * @param {String} name Name of the model to be used for the Object3D
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @returns {Object3D} An instance of Object3D containing the model geometry
     */
    instantiateModel( name, gl, shader ) {
        if (!(name in this.models))
            throw `Unable to find model "${name}" requested by scenengraph`

        // Retrieve the model geometry
        let [ vertices, indices, material ] = this.models[name]

        // Instantiate a new Object3D using the geometry and a default draw_mode of gl.TRIANGLES
        return new ShadedObject3D( gl, shader, vertices, indices, gl.TRIANGLES, material )
    }

    /**
     * Instantiates a Light instance based on the light config loaded in loadLights
     * 
     * @param {String} name Name of the light to be used for the Light instance
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @param {Shader} light_shader The shader to be used to draw the object
     * @returns {Light} An instance of Light
     */
    instantiateLight( name, gl, shader, light_shader ) {
        if (!(name in this.lights))
            throw `Unable to find light "${name}" requested by scenegraph`

        // Update light counts
        if (!(this.lights[name].type in this.light_counts))
            this.light_counts[this.lights[name].type] = -1
        this.light_counts[this.lights[name].type] += 1

        // Retrieve light config
        let light = this.lights[name]

        // Get light's color
        let color = light.color[0] == '#' ? hex2rgb(light.color) : light.color

        switch(light.type) {
            case 'ambient':
                return new AmbientLight( this.light_counts[this.lights[name].type], color, light.intensity, shader, gl, light_shader )

            case 'point':
                return new PointLight( this.light_counts[this.lights[name].type], color, light.intensity, shader, gl, light_shader )

            case 'directional':
                return new DirectionalLight( this.light_counts[this.lights[name].type], color, light.intensity, shader, gl, light_shader )
            
            default:
                throw `Unsupoorted light type "${light.type}" for light "${light.name}"`
        }
    }

    /**
     * Recursively loads a node in the scenegraph
     * This method parses values encountered in the config like transformation or name
     * Based on the node type encountered in the config it instantiates different SceneNode classes
     * 
     * 
     * @param {Object} node_config JSON object containing the configuration of a single node
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @param {Shader} light_shader The shader to be used to represent lights in the scene
     * @returns {SceneNode} The parsed SceneNode
     */
    loadScenegraphNode( node_config, gl, shader, light_shader ) {
        let node = null

        // Check the node's type
        switch(node_config.type) {
            case 'node': // Virtual node without geometry
                node = new SceneNode(
                    node_config.name, 
                    node_config.type, 
                    'transformation' in node_config ? json2transform(node_config.transformation) : mat4.create()
                )
                break
            case 'model': // Geometry node containing a model
                node = new ModelNode(
                    this.instantiateModel(node_config.content, gl, shader), // Field "content" refers to the model to be associated with this node
                    node_config.name,
                    node_config.type,
                    'transformation' in node_config ? json2transform(node_config.transformation) : mat4.create()
                )
                break
            case 'light': // Light node containing a light
                node = new LightNode(
                    this.instantiateLight(node_config.content, gl, shader, light_shader), // Field "content" refers to the light to be associated with this node
                    node_config.name,
                    node_config.type,
                    'transformation' in node_config ? json2transform(node_config.transformation) : mat4.create()
                )
                break
        }

        // Iterate over the node's children and load them recursively
        if ('children' in node_config) {
            for (let child of node_config.children) {

                // Load the child node recursively
                let child_node = this.loadScenegraphNode(child, gl, shader, light_shader)

                // Add the child node to this node's children
                node.addChild(child_node)

                // Set the child's parent to be this node
                child_node.setParent(node)
            }
        }

        return node
    }

    /**
     * Getter to retrieve a flat list of all nodes in the scenegraph
     * 
     * @returns {Array<SceneNode>} All nodes in the graph
     */
    getNodes( ) {
        let nodes = this.scenegraph.getNodes( [] )
        return nodes
    }

    /**
     * Getter to retrieve a single node
     * 
     * @param {String} name the name of the node to find
     * @returns {SceneNode | null} the SceneNode, if found
     */
    getNode( name ) {
        let node = this.scenegraph.getNode( name )
        if (node == null)
            throw `Node "${name}" not found in scenegraph`
        return node
    }

    /**
     * Renders the scene by cascading through the scene graph and rendering nodes that hold geometry
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    render( gl ) {
        this.scenegraph.render( gl )
    }
}

/**
 * A SceneNode represents a single entry in the scenegraph
 * Each SceneNode has a name, type ("node" or "model") and a transformation matrix
 * This corresponds to the entries found in scene description files.
 * 
 * This class forms the base for more specialized nodes.
 */
class SceneNode {

    /**
     * Constructs a single SceneNode
     * 
     * @param {String} name Name of the node
     * @param {String} type Type of the node ("node"|"model")
     * @param {mat4} transformation The local transformation of the node
     */
    constructor( name, type, transformation ) {
        this.name = name
        this.type = type
        this.transformation = transformation
        this.world_transformation = this.calculateWorldTransformation()
        this.parent = null
        this.children = []
    }

    /**
     * Getter to retrieve the compound world transformation of this node
     * This includes all its parent's transformations
     * 
     * @returns {mat4} The compound world transformation of this node
     */
    getWorldTransformation() {
        return this.world_transformation
    }
    
    /**
     * (Re-)calculates the compound world transformation of this node based on its and its parent's transformations
     * 
     * @returns {mat4} The updated compound world transformation of this node
     */
    calculateWorldTransformation() {
        let transformations = this.getTransformationHierarchy([])
        let world = mat4.create()
        for (let transformation of transformations) {
            world = mat4.multiply(mat4.create(), transformation, world)
        }

        return world
    }

    /**
     * Gets a list of transformations in this node's branch of the tree
     * The transformations are ordered in the order: Leaf -> Root
     * 
     * @param {Array<mat4>} transformations Temporary list of transformations of this node's branch in the scenegraph (used for recursion)
     * @returns {Array<mat4>} List of transformations of this node's branch in the scenegraph
     */
    getTransformationHierarchy( transformations ) {
        transformations.push( this.transformation )
        if (this.parent != null)
            this.parent.getTransformationHierarchy( transformations )
        
        return transformations
    }

    /**
     * Getter for this node's local transformation
     * 
     * @returns {mat4} This node's local transformation
     */
    getTransformation( ) {
        return this.transformation
    }

    /**
     * Setter for this node's local transformation
     * Triggers recursive world transformation updates down this node's tree hierarchy
     * 
     * @param {mat4} transformation The node's new local transformation
     */
    setTransformation( transformation ) {
        this.transformation = transformation
        for (let child of this.children) 
            child.setTransformation(child.transformation)
        this.world_transformation = this.calculateWorldTransformation()
    }

    /**
     * Getter for the node's parent
     * 
     * @returns {SceneNode | null} The node's parent, if any
     */
    getParent( ) {
        return this.parent
    }

    /**
     * Setter for the node's parent
     * 
     * @param {SceneNode} node The node's parent
     */
    setParent( node ) {
        this.parent = node
    }

    /**
     * Adds a child node to this node
     * 
     * @param {SceneNode} node The child node to add
     */
    addChild( node ) {
        this.children.push(node)
    }

    /**
     * Recursive getter to retrieve all nodes in this node's hierarchy
     * 
     * @param {Array<SceneNode>} nodes Temporary list of nodes (used for recursion) 
     * @returns {Array<SceneNode>} A flat list of all nodes in this node's hierarchy
     */
    getNodes( nodes ) {
        nodes.push(this)
        for (let child of this.children)
            child.getNodes( nodes )
        return nodes
    }

    /**
     * Recursive getter to retrieve a single node of a specific name
     * 
     * @param {String} name The name of the node to retrieve
     * @returns {SceneNode | null} The SceneNode, if any
     */
    getNode( name ) {
        if (this.name == name)
            return this
        
        for (let child of this.children) {
            let node = child.getNode( name )
            if (node != null)
                return node
        }

        return null
    }

    /**
     * Recursively triggers render calls in this node's hierarchy
     * Subclasses might implement specific render logic
     * This method simply cascades the subtree
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    render( gl ) {
        for (let child of this.children) {
            child.render( gl )
        }
    }
}

/**
 * ModelNodes are a specialization of generic SceneNodes.
 * In addition to the features and properties of SceneNodes,
 * ModelNodes can hold 3D objects and support rendering them.
 * 
 * ModelNodes interface with the Object3D class to store geometry.
 * 
 */
class ModelNode extends SceneNode {

    /**
     * Constructs a ModelNode that contains a 3D model
     * 
     * @param {Object3D} obj3d The Object3D instance containing the model geometry
     * @param {String} name Name of this node
     * @param {String} type Type of this node (always "model")
     * @param {mat4} transformation The local transformation of the node
     */
    constructor( obj3d, name, type, transformation ) {
        super(name, type, transformation)

        this.obj3d = obj3d
    }

    /**
     * Change the node's object's draw mode
     * 
     * @param {WebGL2RenderingContext.GL_TRIANGLES | WebGL2RenderingContext.GL_POINTS} draw_mode The draw mode to use.
     */
    setDrawMode( draw_mode ) {
        this.obj3d.setDrawMode( draw_mode )
    }

    /**
     * Setter for this node's local transformation
     * Updates the models model matrix with this node's world transformation 
     * 
     * Overrides parent's setter
     * 
     * @param {mat4} transformation The node's new local transformation
     */
    setTransformation( transformation ) {
        super.setTransformation( transformation )

        this.obj3d.setTransformation(this.world_transformation)
    }

    /**
     * Setter for this node's object's shader
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     */
    setShader( gl, shader ) {
        this.obj3d.setShader( gl, shader )
    }

    /**
     * Renders this node's model
     * 
     * Overrides parent's method
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    render( gl ) {
        this.obj3d.render( gl )
        super.render( gl )
    }
}

/**
 * LightNodes are a specialization of generic SceneNodes.
 * In addition to the features and properties of SceneNodes,
 * LightNodes can hold light objects and support rendering them.
 * 
 * LightNodes interface with the Light class to set shader properties and visually represent the lights in the scene.
 * 
 */
class LightNode extends SceneNode {

    constructor( light, name, type, transformation ) {
        super( name, type, transformation )

        this.light = light
    }

    /**
     * Setter for this node's local transformation
     * Updates the light's model matrix with this node's world transformation 
     * 
     * Overrides parent's setter
     * 
     * @param {mat4} transformation The node's new local transformation
     */
    setTransformation( transformation ) {
        super.setTransformation( transformation )

        this.light.setTransformation(this.world_transformation)
        this.light.update( )
    }

    /**
     * Setter for this node's light's target shader
     * 
     * @param {Shader} shader The shader to be used to draw the object
     */
    setTargetShader( shader ) {
        this.light.setTargetShader( shader )
        this.light.update( )
    }

    /**
     * Renders this node's light gizmo (Box object) in the scene
     * 
     * Overrides parent's method
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    render( gl ) {
        this.light.render( gl )
        super.render( gl )
    }
}

export {
    Scene,
    SceneNode
}