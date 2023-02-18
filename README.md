# 3D Graph Loader App
An app that can draw 3D models by loading, rendering and manipulating 3D scenes created using both JavaScript and GLSL. 

[Application Showcase]() 

### This project fulfills the following requirements:
* Load OBJs with normal data and texture coordinates.
* Correctly set up vertex attributes to access a mixed buffer containing positions, normals, texture coordinates, and tangents.
* Have a Texture class to load image data and set up GL textures.
* Provide correct color, roughness and normal mapping.

## There are roughly three tasks done in this project
CPU Code (JS)
1. Combining vertex data into a single buffer and writing the VAO setup for ShadedOjbect3D to accommodate a mixed vertex buffer containing positions, normals, texture coordinates, and vertex tangents. 

    * Implementing code to pass material properties to the shader code. The MTL file parser is part of the template, so no need to implement any parsing code.
2. Implementing a Texture class, which contains all the GL code needed to load and store image data as textures. The class will be used in Materials to represent different textures.

GPU Code (GLSL)

3. Implementing a shader pipelines, each consisting of vertex and fragment stage. The shader will be based on the Phong shader and extend as needed for texture mapping.

    * Implementing surface texturing using color image textures.
    * Implementing roughness mapping using grayscale image textures.
    * Implementing normal mapping using normal maps.

### The Starter Template
The starter template contained six files assignment6.textured.(frag|vert).js, assignment6.mtlloader.js, assignment6.object3d.js, assignment6.objloader.js which contain empty classes and/or methods that need to be implemented.

To help debug normals and normal mapping a toggle to visualize normals on the model has been added to the template. Holding "N" will result in seeing the scene's normals. Since we interpret normals as colors [x, y, z] -> [r, g, b], green will be 'up', red will be 'right', and blue will be 'forward'.
* All normals are shown in world space unless changes made in the shader.

## **References** 

[Materials](https://learnopengl.com/Lighting/Materials)

[Textures](https://learnopengl.com/Getting-started/Textures)

[Normal Mapping 1](https://learnopengl.com/Advanced-Lighting/Normal-Mapping)

[Normal Mapping 2](http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapping/)

[File Specification 1](http://paulbourke.net/dataformats/obj/)

[File Specification 2](http://paulbourke.net/dataformats/mtl/)
