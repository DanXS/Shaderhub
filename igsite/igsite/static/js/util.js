uniformEnumType = {
'GL_BYTE'                   :        0x1400,
'GL_UNSIGNED_BYTE'          :        0x1401,
'GL_SHORT'                  :        0x1402,
'GL_UNSIGNED_SHORT'         :        0x1403,
'GL_INT'                    :        0x1404,
'GL_UNSIGNED_INT'           :        0x1405,
'GL_FLOAT'                  :        0x1406,
'GL_FIXED'                  :        0x140C,
'GL_FLOAT_VEC2'             :        0x8B50,
'GL_FLOAT_VEC3'             :        0x8B51,
'GL_FLOAT_VEC4'             :        0x8B52,
'GL_INT_VEC2'               :        0x8B53,
'GL_INT_VEC3'               :        0x8B54,
'GL_INT_VEC4'               :        0x8B55,
'GL_BOOL'                   :        0x8B56,
'GL_BOOL_VEC2'              :        0x8B57,
'GL_BOOL_VEC3'              :        0x8B58,
'GL_BOOL_VEC4'              :        0x8B59,
'GL_FLOAT_MAT2'             :        0x8B5A,
'GL_FLOAT_MAT3'             :        0x8B5B,
'GL_FLOAT_MAT4'             :        0x8B5C,
'GL_SAMPLER_2D'             :        0x8B5E,
'GL_SAMPLER_CUBE'           :        0x8B60};

uniformOperations = [
	{"Opp":"Time", "NeedsData": false, "AllowData": false, "Params": [], "AppliesTo": ['GL_FLOAT', 'GL_FIXED']},
	{"Opp":"Range", "NeedsData": true, "AllowData": true, "Params": ["Min", "Max", "Step"], "Default": [0, 1, 0.1], "AppliesTo": ['GL_FLOAT', 'GL_FIXED', 'GL_INT', 'GL_UNSIGNED_BYTE', 'GL_UNSIGNED_SHORT', 'GL_UNSIGNED_INT', 'GL_FLOAT_VEC2', 'GL_FLOAT_VEC3', 'GL_FLOAT_VEC4', 'GL_INT_VEC2', 'GL_INT_VEC3', 'GL_INT_VEC4']},
	{"Opp":"Switch", "NeedsData": true, "AllowData": true, "Params": ["Default"], "Default": [true], "AppliesTo": ['GL_BOOL', 'GL_BOOL_VEC2', 'GL_BOOL_VEC3', 'GL_BOOL_VEC4']},
	{"Opp":"Inverse", "NeedsData": true, "AllowData": true, "Params": [], "AppliesTo": ['GL_FLOAT_MAT2', 'GL_FLOAT_MAT3', 'GL_FLOAT_MAT4']},
	{"Opp":"Transpose", "NeedsData": true, "AllowData": true, "Params": [], "AppliesTo": ['GL_FLOAT_MAT2', 'GL_FLOAT_MAT3', 'GL_FLOAT_MAT4']},
	{"Opp":"Perspective", "NeedsData": false, "AllowData": false, "Params": [], "AppliesTo": ['GL_FLOAT_MAT4']},
	{"Opp":"Orthographic", "NeedsData": false, "AllowData": false, "Params": [], "AppliesTo": ['GL_FLOAT_MAT4']},
	{"Opp":"CameraLookAt", "NeedsData": false, "AllowData": true, "Params": [], "AppliesTo": ['GL_FLOAT_MAT4']}
];

function formatPadding(n, p) {
	var txt = n.toString();
	var len = txt.length;
	if(len >= p)
		return str(n);
	var pad = ""
	for(var i = 0; i < p-len; i++) {
		pad = pad+"0"; 
	}
	return pad+txt;
}

function initGL(canvas) {
	try {
		var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		gl.getExtension('OES_standard_derivatives');
		return gl;
	} catch(e) {
	}
	if (!gl) {
		throw ({message:"Could not initialise WebGL!"});
	}
}

function compileShader(gl, shaderSource, shaderType) {
	var shader = gl.createShader(shaderType);
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);
	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!success) {
		throw ({message:"Could not compile "+((shaderType==gl.VERTEX_SHADER) ? "vertex" : "fragment")+" shader: " + gl.getShaderInfoLog(shader)});
	}
    return shader;
}

function linkShaders(gl, vertexShader, fragmentShader) {
	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	var success = gl.getProgramParameter(shaderProgram, gl.LINK_STATUS);
	if(!success) {
		throw ({message:"Could not link shaders: " + gl.getProgramInfoLog (shaderProgram)});
	}
    return shaderProgram;
}

function getShaderParams(gl, shaderProgram) {
	var attributes = []
	var uniforms = []
	for(var j = 0; j < gl.getProgramParameter(shaderProgram, gl.ACTIVE_ATTRIBUTES); j++) {
		activeInfo = gl.getActiveAttrib(shaderProgram, j);
		attributes.push({'activeInfo':activeInfo});
	}
	for(var j = 0; j < gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS); j++) {
		activeInfo = gl.getActiveUniform(shaderProgram, j);
		uniforms.push({'activeInfo':activeInfo});
	}
	return {'attributes':attributes, 'uniforms':uniforms};
}

function getUniformTypeName(type) {
    var result = null;
	for(key in uniformEnumType) {
		if(uniformEnumType[key] == type) {
			result = key;
			break;
		}
	}
	return result;
}

function getValidUniformOperations(type, hasData) {
	var validOpps = new Array();
	var typeName = getUniformTypeName(type);
	if(typeName != undefined) {
		for(i = 0; i < uniformOperations.length; i++) {
			if(uniformOperations[i].AppliesTo.indexOf(typeName) >= 0 &&
				(uniformOperations[i].NeedsData == hasData || 
				uniformOperations[i].AllowData == hasData)) {
				validOpps.push(uniformOperations[i]);
			}
		}
	}
	return validOpps;
}

function getTypeDetails(type) {
	var isBool = false;
	var isInt = false;
	var isMat = false;
	var size = 0;
	switch(type) {
		case uniformEnumType['GL_BYTE']:
		case uniformEnumType['GL_UNSIGNED_BYTE']:
		case uniformEnumType['GL_SHORT']:
		case uniformEnumType['GL_UNSIGNED_SHORT']:
		case uniformEnumType['GL_INT']:
		case uniformEnumType['GL_UNSIGNED_INT']:
			isInt = true;
			size = 1;
			break;
		case uniformEnumType['GL_FLOAT']:
		case uniformEnumType['GL_FIXED']:
			size = 1;
			break;
		case uniformEnumType['GL_BOOL']:
			isBool = true;
			size = 1;
			break;
		case uniformEnumType['GL_FLOAT_VEC2']:
			size = 2;
			break;
		case uniformEnumType['GL_INT_VEC2']:
			size = 2;
			isInt = true;
			break;
		case uniformEnumType['GL_BOOL_VEC2']:
			isBool = true;
			size = 2;
			break;
		case uniformEnumType['GL_FLOAT_VEC3']:
			size = 3;
			break;
		case uniformEnumType['GL_INT_VEC3']:
			isInt = true;
			size = 3;
			break;
		case uniformEnumType['GL_BOOL_VEC3']:
			isBool = true;
			size = 3;
			break;
		case uniformEnumType['GL_FLOAT_VEC4']:
			size = 4;
			break;
		case uniformEnumType['GL_INT_VEC4']:
			size = 4;
			isInt = true;
			break;
		case uniformEnumType['GL_BOOL_VEC4']:
			size = 4;
			isBool = true;
			break;
		case uniformEnumType['GL_FLOAT_MAT2']:
			size = 2;
			isMat = true;
			break;
		case uniformEnumType['GL_FLOAT_MAT3']:
			size = 3;
			isMat = true;
			break;
		case uniformEnumType['GL_FLOAT_MAT4']:
			size = 4;
			isMat = true;
			break;
		default:
			break;
	}
	return {"isMat" : isMat, "isInt" : isInt, "isBool": isBool, "size": size};
}

function getSubMat(data, type) {
	var typeDetails = getTypeDetails(type);
	if(typeDetails.size == 4)
		return data;
	if(typeDetails.size == 3)
		return [
		        data[0], data[1], data[2],
		        data[4], data[5], data[6],
		        data[8], data[9], data[10]
		        ];
	if(typeDetails.size == 2)
		return [data[0], data[1],
		        data[4], data[5]];
	
}

function loadImage(url, callback) {
	  var image = new Image();
	  image.src = url;
	  image.onload = callback;
	  return image;
}


