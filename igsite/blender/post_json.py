import json
import requests

def roundList(l, n):
    return list(map(lambda x: round(x, n), l))

def exportMesh(obj_dict, obj, prefix):
    mesh = bpy.data.meshes[obj.name]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.quads_convert_to_tris()
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.update(True, True)
    vertex_list = []
    normal_list = []
    smooth = False
    for face in mesh.tessfaces:
        if face.use_smooth:
            smooth = True
        for index in face.vertices:
            vert = mesh.vertices[index]
            vertex_list.append(vert.co[0])
            vertex_list.append(vert.co[1])
            vertex_list.append(vert.co[2])
            if smooth:
                normal_list.append(vert.normal[0])
                normal_list.append(vert.normal[1])
                normal_list.append(vert.normal[2])
            else:
                normal_list.append(face.normal[0])
                normal_list.append(face.normal[1])
                normal_list.append(face.normal[2])
    obj_dict[prefix+'_vertices'] = roundList(vertex_list,4)
    obj_dict[prefix+'_normals'] = roundList(normal_list,4)
    useTexture = False
    if len(mesh.tessface_uv_textures) > 0:
        uv_list = []
        active_uv_layer = mesh.tessface_uv_textures.active
        if(active_uv_layer):
            useTexture = True
            for face_uvmap in mesh.tessface_uv_textures:
                for uvmap in face_uvmap.data:
                    uv_list.append(uvmap.uv[0][0])
                    uv_list.append(uvmap.uv[0][1])
                    uv_list.append(uvmap.uv[1][0])
                    uv_list.append(uvmap.uv[1][1])
                    uv_list.append(uvmap.uv[2][0])
                    uv_list.append(uvmap.uv[2][1])
            obj_dict[prefix+'_'+face_uvmap.name+'_uvs'] = roundList(uv_list,6)
    obj_dict = exportShader(obj_dict, prefix+'_Shader', useTexture)
    return obj_dict
        
def exportMatrix(obj_dict, obj, prefix):
    w = []
    l = []
    for i in range(0, 4):
        for j in range(0, 4):
            w.append(obj.matrix_world[i][j])
            l.append(obj.matrix_local[i][j])
    obj_dict[prefix+'_local'] = l
    obj_dict[prefix+'_world'] = w
    return obj_dict

def exportShader(obj_dict, prefix, useTexture):
    if useTexture:
        obj_dict[prefix+'_frag'] = "\n\
	precision mediump float;\n\
	varying vec3 vTransformedNormal;\n\
	varying vec4 vPosition;\n\
	varying vec2 vTextureCoord;\n\
	uniform vec3 uAmbientColor;\n\
	uniform vec3 uPointLightingLocation;\n\
	uniform vec3 uPointLightingColor;\n\
	uniform sampler2D uSampler;\n\
	void main(void) {\n\
		vec3 lightDirection = normalize(uPointLightingLocation - vPosition.xyz);\n\
		float directionalLightWeighting = max(dot(normalize(vTransformedNormal), lightDirection), 0.0);\n\
		vec3 lightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;\n\
		vec4 fragmentColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\n\
		gl_FragColor = vec4(fragmentColor.rgb * lightWeighting, fragmentColor.a);\n\
	}"
        obj_dict[prefix+'_vert'] = "\n\
    attribute vec3 aVertexPosition;\n\
    attribute vec3 aVertexNormal;\n\
	attribute vec2 aTextureCoord;\n\
	uniform mat4 uMVMatrix;\n\
    uniform mat4 uPMatrix;\n\
    uniform mat3 uNMatrix;\n\
    varying vec2 vTextureCoord;\n\
    varying vec3 vTransformedNormal;\n\
    varying vec4 vPosition;\n\
    void main(void) {\n\
        vPosition = uMVMatrix * vec4(aVertexPosition, 1.0);\n\
        gl_Position = uPMatrix * vPosition;\n\
        vTransformedNormal = uNMatrix * aVertexNormal;\n\
		vTextureCoord = aTextureCoord;\n\
    }"
    else:
        obj_dict[prefix+'_frag'] = "\n\
    precision mediump float;\n\
	varying vec3 vTransformedNormal;\n\
	varying vec4 vPosition;\n\
	uniform vec3 uAmbientColor;\n\
	uniform vec3 uPointLightingLocation;\n\
	uniform vec3 uPointLightingColor;\n\
	void main(void) {\n\
		vec3 lightDirection = normalize(uPointLightingLocation - vPosition.xyz);\n\
		float directionalLightWeighting = max(dot(normalize(vTransformedNormal), lightDirection), 0.0);\n\
		vec3 lightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;\n\
		vec4 fragmentColor = vec4(1.0, 1.0, 1.0, 1.0);\n\
		gl_FragColor = vec4(fragmentColor.rgb * lightWeighting, fragmentColor.a);\n\
	}"
        obj_dict[prefix+'_vert'] = "\n\
    attribute vec3 aVertexPosition;\n\
    attribute vec3 aVertexNormal;\n\
    uniform mat4 uMVMatrix;\n\
    uniform mat4 uPMatrix;\n\
    uniform mat3 uNMatrix;\n\
    varying vec3 vTransformedNormal;\n\
    varying vec4 vPosition;\n\
    void main(void) {\n\
        vPosition = uMVMatrix * vec4(aVertexPosition, 1.0);\n\
        gl_Position = uPMatrix * vPosition;\n\
        vTransformedNormal = uNMatrix * aVertexNormal;\n\
    }"
    return obj_dict
    
def exportSelectedObjects():
    i = 1
    obj_dict = {}
    for obj in bpy.context.selected_objects:
        if obj.type == "MESH":
            prefix = ("Mesh_%03d_" % i) + obj.name
            obj_dict = exportMesh(obj_dict, obj, prefix)
        prefix = ("Matrix_%03d_" % i) + obj.name
        obj_dict = exportMatrix(obj_dict, obj, prefix)
        i = i + 1
    return obj_dict

scene_file = {
            'file_name' : 'fleur',
            'secret' : 'b4df53ff-fd43-4265-a304-495964f40c3e',
            'op' : 'overwrite'}

scene_file['data']=exportSelectedObjects()

url = "http://localhost:8000/datastore/uploadjson"
headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}

r = requests.post(url, data=json.dumps(scene_file), headers=headers)