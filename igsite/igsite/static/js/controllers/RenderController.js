function RenderController(_data) {
	this.data = data;
	this.shaderBindings = null;
	this.canvas = null;
	this.gl = null;
	this.program = null;
	this.textures = null;
	this.texturesRequired = 0;
	this.texturesLoaded = 0;
	this.hudController = null;
	this.requestSnapshot = false;
	this.snapshotContext = null;
	this.snapshotCallback = null;
	this.opperations = null;
	this.selectedProgram = 0;
}

RenderController.prototype.init = function (_shaderBindings, _canvas, _experimentBinding, _programSelector, _vertEditor, _fragEditor) {
	try {
		this.shaderBindings = _shaderBindings;
		this.canvas = _canvas;
		if(this.data.useExperiment) {
			$("#"+_experimentBinding).show();
			this.experimentBinding = $("#"+_experimentBinding);
			this.programSelector = $("#"+_programSelector);
			this.buildProgramSelector();
			this.vertEditor = ace.edit(_vertEditor);
			this.vertEditor.setTheme("ace/theme/chrome");
			this.vertEditor.getSession().setMode("ace/mode/glsl");
			this.fragEditor = ace.edit(_fragEditor);
			this.fragEditor.setTheme("ace/theme/chrome");
			this.fragEditor.getSession().setMode("ace/mode/glsl");
			this.setEditors(0);
			this.bindCompile();
		}
		else {
			$("#"+_experimentBinding).hide();
		}
		this.opperations = new Opps();
		
		this.initShaders();
		if(this.data.useHud) {
			this.buildHud();
		}
	}
	catch (e) {
		alert(e.message);
	}
}

RenderController.prototype.buildProgramSelector = function (curr) {
	var html = "<select id='progSel'>";
	for(var i = 0; i < this.shaderBindings.length; i++) {
		html += "<option value='"+i+"'>Program "+(i+1)+"</option>";
	}
	html += "</select>";
	this.programSelector.append(html);
	$("#progSel").change(function (event) {
		var source = $(event.target).attr("id");
		var key = $("#"+source).val();
		this.setEditor(key);
	});
}

RenderController.prototype.bindCompile = function (curr) {
	var that = this;
	$(".compileShaders").click(function () {
		var vertSource = that.vertEditor.getValue();
		var fragSource = that.fragEditor.getValue();
		try {
			var vertShader = compileShader(that.gl, vertSource, that.gl.VERTEX_SHADER);
			var fragShader = compileShader(that.gl, fragSource, that.gl.FRAGMENT_SHADER);
			that.program[that.selectedProgram] = linkShaders(that.gl, vertShader, fragShader);
		}
		catch(e) {
			alert(e.message);
		}
	});
}

RenderController.prototype.setEditors = function (curr) {
	this.selectedProgram = curr;
	this.vertEditor.selectAll();
	this.vertEditor.removeLines();
	if(this.shaderBindings[curr] != null &&
			this.shaderBindings[curr].vert_shader_binding != null &&
			this.shaderBindings[curr].frag_shader_binding != null) {
		this.vertEditor.insert(this.shaderBindings[curr].vert_shader_binding.data);
		this.fragEditor.selectAll();
		this.fragEditor.removeLines();
		this.fragEditor.insert(this.shaderBindings[curr].frag_shader_binding.data);
	}
}

RenderController.prototype.initShaders = function () {
	try {
		this.gl = initGL(this.canvas);
		if(this.gl) {
		    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
		    this.gl.clearDepth(1.0);                 // Clear everything
		    this.gl.enable(this.gl.DEPTH_TEST);           // Enable depth testing
		    this.gl.depthFunc(this.gl.LEQUAL);            // Near things obscure far things
			this.program = new Array();
			for(var i = 0; i < this.shaderBindings.length; i++) {
				if(this.shaderBindings[i] != null &&
						this.shaderBindings[i].vert_shader_binding != null &&
						this.shaderBindings[i].frag_shader_binding != null) {
					var vertShader = compileShader(this.gl, this.shaderBindings[i].vert_shader_binding.data, this.gl.VERTEX_SHADER);
					var fragShader = compileShader(this.gl, this.shaderBindings[i].frag_shader_binding.data, this.gl.FRAGMENT_SHADER);
					this.program[i] = linkShaders(this.gl, vertShader, fragShader);
					this.gl.useProgram(this.program[i]);
					this.texturesRequired = this.countTexturesRequired();
					this.initAttributes(i);
					this.initUniforms(i);
				}
			}
			this.startRender();
		}
	}
	catch(e) {
		alert(e.message);
	}
}

RenderController.prototype.initAttributes = function (curr) {
	var attributes = this.shaderBindings[curr].shaderParams.attributes;
	this.shaderBindings[curr].buffers = new Array;
	for(var i = 0; i < attributes.length; i++) {
		var activeInfo = attributes[i].activeInfo;
		var paramName = activeInfo.name;
		var paramData = this.data.modelData[attributes[i].name];
		var typeDetails = getTypeDetails(activeInfo.type);
		var attribute = this.gl.getAttribLocation(this.program[curr], paramName);
		this.gl.enableVertexAttribArray(attribute);
		this.shaderBindings[curr].buffers[i] = this.gl.createBuffer();
		this.shaderBindings[curr].buffers[i].size = typeDetails.size;
		this.shaderBindings[curr].buffers[i].length =  paramData.length / typeDetails.size;
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.shaderBindings[curr].buffers[i]);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(paramData), this.gl.STATIC_DRAW);
		this.gl.vertexAttribPointer(attribute, typeDetails.size, this.gl.FLOAT, false, 0, 0);
	}
}

RenderController.prototype.initUniforms = function (curr) {
	var uniforms = this.shaderBindings[curr].shaderParams.uniforms;
	for(var i = 0; i < uniforms.length; i++) {
		var activeInfo = uniforms[i].activeInfo;
		var paramName = activeInfo.name;
		var paramData = null;
		var paramLoc = this.gl.getUniformLocation(this.program[curr], paramName);
		if(uniforms[i].uuid != undefined) {
			if(uniforms[i].activeInfo.type == uniformEnumType['GL_SAMPLER_2D']) {
				paramData = this.getValue(this.data.textures, uniforms[i].uuid);
			}
			else {
				paramData = this.data.modelData[uniforms[i].name];
			}
		}
		else if(uniforms[i].data != undefined) {
			paramData = uniforms[i].data;
		}
		if(uniforms[i].opps != undefined) {
			paramData = this.performOpps(uniforms[i]);
			if(uniforms[i].activeInfo.type == uniformEnumType['GL_FLOAT_MAT4'] ||
			   uniforms[i].activeInfo.type == uniformEnumType['GL_FLOAT_MAT3'] ||
			   uniforms[i].activeInfo.type == uniformEnumType['GL_FLOAT_MAT2'])
				paramData = getSubMat(paramData, uniforms[i].activeInfo.type);
		}
		if(paramData != null) {
			this.setUniform(curr, paramLoc, paramData, uniforms[i]);
		}
	}
}


RenderController.prototype.setUniform = function (curr, paramLoc, paramData, uniform) {
	switch(uniform.activeInfo.type) {
	case uniformEnumType['GL_FLOAT_MAT4']:
		uniform.buff = new Float32Array(paramData);
		this.gl.uniformMatrix4fv(paramLoc, false, uniform.buff);
		break;
	case uniformEnumType['GL_FLOAT_MAT3']:
		paramData = M4x4.topLeft3x3(paramData);
		uniform.buff = new Float32Array(paramData);
		this.gl.uniformMatrix3fv(paramLoc, false, uniform.buff);
		break;
	case uniformEnumType['GL_FLOAT_MAT2']:
		uniform.buff = new Float32Array(paramData);
		this.gl.uniformMatrix2fv(paramLoc, false, uniform.buff);
		break;
	case uniformEnumType['GL_FLOAT_VEC4']:
		uniform.buff = new Float32Array(paramData);
		this.gl.uniform4fv(paramLoc, uniform.buff);
		break;
	case uniformEnumType['GL_FLOAT_VEC3']:
		uniform.buff = new Float32Array(paramData);
		this.gl.uniform3fv(paramLoc, uniform.buff);
		break;
	case uniformEnumType['GL_FLOAT_VEC2']:
		uniform.buff = new Float32Array(paramData);
		this.gl.uniform2fv(paramLoc, uniform.buff);
		break;
	case uniformEnumType['GL_INT_VEC4']:
		uniform.buff = new Int32Array(paramData);
		this.gl.uniform4iv(paramLoc, uniform.buff);
		break;
	case uniformEnumType['GL_INT_VEC3']:
		uniform.buff = new Int32Array(paramData);
		this.gl.uniform3iv(paramLoc, uniform.buff);
		break;
	case uniformEnumType['GL_INT_VEC2']:
		uniform.buff = new Int32Array(paramData);
		this.gl.uniform2iv(paramLoc, uniform.buff);
		break;
	case uniformEnumType['GL_SAMPLER_2D']:
		this.bindTexture(paramData);
		break;
	case uniformEnumType['GL_FLOAT']:
		uniform.buff = new Float32Array(paramData);
		this.gl.uniform1fv(paramLoc, uniform.buff);
		break;	
	}	
}


RenderController.prototype.updateUniformBuffer = function (curr, i, paramData) {
	var uniform = this.shaderBindings[curr].shaderParams.uniforms[i];
	var paramLoc = this.gl.getUniformLocation(this.program[curr], uniform.activeInfo.name);
	this.setUniform(curr, paramLoc, paramData, uniform);
}

RenderController.prototype.performOpps = function (uniform) {
	var opps = uniform.opps;
	var data = null;
	if(uniform.uuid != null) {
		var matrixKey = this.getValue(this.data.matrices, uniform.uuid);
		if(matrixKey != null) {
			data = this.data.modelData[matrixKey];
		}
	}
	else if(uniform.data != null) {
		data = uniform.data;
	}
	if(opps != null) {
		for(var i = 0; i < opps.data.length; i++) {
			if(opps.data[i].NeedsData || opps.data[i].AllowData) {
				data = this.opperations.performOpp(opps.data[i].Opp, opps.data[i].Params, data);
			}
			else {
				data = this.opperations.performOpp(opps.data[i].Opp, opps.data[i].Params, null);
			}
		}
	}
	return data;
}

RenderController.prototype.getValue = function (list, key) {
	for(var i = 0; i < list.length; i++) {
		for (first in list[i]) break;
		if(first == key)
			return list[i][first];
	}
	return "";
}

RenderController.prototype.countTexturesRequired = function () {
	var count = 0;
	for(var i = 0; i < this.shaderBindings.length; i++) {
		var uniforms = this.shaderBindings[i].shaderParams.uniforms;
		if(uniforms != null) {
			for(var j = 0; j < uniforms.length; j++) {
				var type = uniforms[j].activeInfo.type;
				if(type == uniformEnumType['GL_SAMPLER_2D'])
					count+=1;
			}
		}
	}
	return count;
}

RenderController.prototype.findTextureProgAndLoc = function (texture_name) {
	for(var i = 0; i < this.shaderBindings.length; i++) {
		var uniforms = this.shaderBindings[i].shaderParams.uniforms;
		if(uniforms != null) {
			for(var j = 0; j < uniforms.length; j++) {
				var type = uniforms[j].activeInfo.type;
				if(type == uniformEnumType['GL_SAMPLER_2D']) {
					var paramData = this.getValue(this.data.textures, uniforms[j].uuid);
					if(paramData == texture_name) {
						return {prog: i, name: uniforms[j].name, loc: this.gl.getUniformLocation(this.program[i], uniforms[j].activeInfo.name)};
					}
				}
			}
		}
	}
	return null;
}

RenderController.prototype.bindTexture = function (texture_name) {
	if(this.shaderBindings.textures == null)
		this.shaderBindings.textures = new Array();
	var that = this;
	var image = loadImage("/media/" + texture_name, function (event) {
		var src = $(event.target).attr("src");
		var texture_loaded = src.substring(src.lastIndexOf("/")+1);
		var texture = that.gl.createTexture();
		that.shaderBindings.textures.push({ "file": texture_loaded, "texture" : texture });
		var i = that.shaderBindings.textures.length - 1;
		that.gl.activeTexture(that.gl.TEXTURE0 + i);
		that.gl.pixelStorei(that.gl.UNPACK_FLIP_Y_WEBGL, true);
		that.gl.bindTexture(that.gl.TEXTURE_2D, that.shaderBindings.textures[i].texture);
		var progAndLoc = that.findTextureProgAndLoc.call(that, texture_loaded);
		if(progAndLoc != null) {
			that.shaderBindings.textures[i].prog = progAndLoc.prog;
			that.shaderBindings.textures[i].name = progAndLoc.name;
			that.gl.uniform1i(progAndLoc.loc, progAndLoc.prog);
			that.gl.texImage2D(that.gl.TEXTURE_2D, 0, that.gl.RGBA, that.gl.RGBA, that.gl.UNSIGNED_BYTE, image);
			that.gl.texParameteri(that.gl.TEXTURE_2D, that.gl.TEXTURE_MAG_FILTER, that.gl.LINEAR);
			that.gl.texParameteri(that.gl.TEXTURE_2D, that.gl.TEXTURE_MIN_FILTER, that.gl.LINEAR_MIPMAP_LINEAR);
			that.gl.generateMipmap(that.gl.TEXTURE_2D);
			that.gl.bindTexture(that.gl.TEXTURE_2D, null);
			var error = that.gl.getError();
			if(error != that.gl.NO_ERROR) {
				alert("Error binding textures, please ensure they are powers of two width and height!");
			}
			else {
				that.texturesLoaded++;
			}
		}
	});
}

RenderController.prototype.startRender = function () {
	var that = this;
	this.timer = setInterval(function () {
		if(that.texturesLoaded == that.texturesRequired) {
			that.render();
			if(that.requestSnapshot) {
				that.requestSnapshot = false;
				that.takeSnapshot();
			}
		}
	}
	,1000/60);
}

RenderController.prototype.performProgramOpps = function (curr) {
	for(var i = 0; i < this.shaderBindings[curr].shaderParams.uniforms.length; i++) {
		var uniform = this.shaderBindings[curr].shaderParams.uniforms[i];
		var paramData = this.performOpps(uniform);
		if(paramData != null) {
			var paramLoc = this.gl.getUniformLocation(this.program[curr], uniform.activeInfo.name);
			this.setUniform(curr, paramLoc, paramData, uniform);
		}
	}
}

RenderController.prototype.render = function () {
	this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	for(var i = 0; i < this.shaderBindings.length; i++) {
		if(this.program[i] != null) {
			this.gl.useProgram(this.program[i]);
			this.performProgramOpps(i);
			this.updateAttributes(i);
			this.updateUniforms(i);
			this.gl.drawArrays(this.gl.TRIANGLES, 0, this.shaderBindings[i].buffers[0].length);
		}
	}
}

RenderController.prototype.updateAttributes = function (curr) {
	var attributes = this.shaderBindings[curr].shaderParams.attributes;
	for(var i = 0; i < attributes.length; i++) {
		var activeInfo = attributes[i].activeInfo;
		var paramName = activeInfo.name;
		var typeDetails = getTypeDetails(activeInfo.type);
		var attribute = this.gl.getAttribLocation(this.program[curr], paramName);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.shaderBindings[curr].buffers[i]);
		this.gl.vertexAttribPointer(attribute, typeDetails.size, this.gl.FLOAT, false, 0, 0);
	}
}

RenderController.prototype.updateUniforms = function (curr) {
	var j = 0;
	var uniforms = this.shaderBindings[curr].shaderParams.uniforms;
	for(var i = 0; i < uniforms.length; i++) {
		var activeInfo = uniforms[i].activeInfo;
		var paramName = activeInfo.name;
		var paramLoc = this.gl.getUniformLocation(this.program[curr], paramName);
		switch(uniforms[i].activeInfo.type) {
		case uniformEnumType['GL_FLOAT_MAT4']:
			this.gl.uniformMatrix4fv(paramLoc, false, uniforms[i].buff);
			break;
		case uniformEnumType['GL_FLOAT_MAT3']:
			this.gl.uniformMatrix3fv(paramLoc, false, uniforms[i].buff);
			break;
		case uniformEnumType['GL_FLOAT_MAT2']:
			this.gl.uniformMatrix2fv(paramLoc, false, uniforms[i].buff);
			break;
		case uniformEnumType['GL_FLOAT_VEC4']:
			this.gl.uniform4fv(paramLoc, uniforms[i].buff);
			break;
		case uniformEnumType['GL_FLOAT_VEC3']:
			this.gl.uniform3fv(paramLoc, uniforms[i].buff);
			break;
		case uniformEnumType['GL_FLOAT_VEC2']:
			this.gl.uniform2fv(paramLoc, uniforms[i].buff);
			break;
		case uniformEnumType['GL_INT_VEC4']:
			this.gl.uniform4iv(paramLoc, uniforms[i].buff);
			break;
		case uniformEnumType['GL_INT_VEC3']:
			this.gl.uniform3iv(paramLoc, uniforms[i].buff);
			break;
		case uniformEnumType['GL_INT_VEC2']:
			this.gl.uniform2iv(paramLoc, uniforms[i].buff);
			break;
		case uniformEnumType['GL_SAMPLER_2D']:
			this.updateTextures(curr, paramLoc, uniforms[i].name);
			break;
		}
	}
}

RenderController.prototype.findTextureByProgAndName = function (curr, name) {
	for(var i = 0; i < this.shaderBindings.textures.length; i++) {
		if(this.shaderBindings.textures[i].prog == curr &&
		   this.shaderBindings.textures[i].name == name) {
			return i;
		}
	}
	return -1;
}

RenderController.prototype.updateTextures = function (curr, paramLoc, name) {
	var i = this.findTextureByProgAndName(curr, name);
	if(i >= 0) {
		this.gl.activeTexture(this.gl.TEXTURE0 + i);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.shaderBindings.textures[i].texture);
		this.gl.uniform1i(paramLoc, i);
	}
}

RenderController.prototype.buildHud = function () {
	var that = this;
	var controls = new Array();
	var params = this.opperations.getCameraParams();
	if(this.containsOpp("Perspective")) {
		controls.push({
			"type" : "group",
			"label" : "Perspective Projection"
		});
		controls.push({
			"type" : "slider",
			"name" : "FOV",
			"data" : params.fovy,
			"min" : 0,
			"max" : 180,
			"step" : 0.1,
			"change" : function (index, val) {
				that.opperations.params.fovy[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Aspect",
			"data" : params.aspect,
			"min" : 0,
			"max" : 2,
			"step" : 0.01,
			"change" : function (index, val) {
				that.opperations.params.aspect[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Near",
			"data" : params.znear,
			"min" : 0,
			"max" : 1000,
			"step" : 0.1,
			"change" : function (index, val) {
				that.opperations.params.znear[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Far",
			"data" : params.zfar,
			"min" : 0,
			"max" : 1000,
			"step" : 0.1,
			"change" : function (index, val) {
				that.opperations.params.zfar[index] = val;
			}
		});
		
	}
	if(this.containsOpp("Orthographic")) {
		controls.push({
			"type" : "group",
			"label" : "Orthographic Projection"
		});
		controls.push({
			"type" : "slider",
			"name" : "Top",
			"data" : params.top,
			"min" : -200,
			"max" : 200,
			"step" : 1,
			"change" : function (index, val) {
				that.opperations.params.top[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Left",
			"data" : params.left,
			"min" : -200,
			"max" : 200,
			"step" : 1,
			"change" : function (index, val) {
				that.opperations.params.left[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Bottom",
			"data" : params.bottom,
			"min" : -200,
			"max" : 200,
			"step" : 1,
			"change" : function (index, val) {
				that.opperations.params.bottom[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Right",
			"data" : params.right,
			"min" : -200,
			"max" : 200,
			"step" : 1,
			"change" : function (index, val) {
				that.opperations.params.right[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Near",
			"data" : params.znear,
			"min" : 0,
			"max" : 1000,
			"step" : 0.1,
			"change" : function (index, val) {
				that.opperations.params.znear[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Far",
			"data" : params.zfar,
			"min" : 0,
			"max" : 1000,
			"step" : 0.1,
			"change" : function (index, val) {
				that.opperations.params.zfar[index] = val;
			}
		});
	}
	if(this.containsOpp("CameraLookAt")) {
		controls.push({
			"type" : "group",
			"label" : "Look At Camera"
		});
		controls.push({
			"type" : "slider",
			"name" : "Eye",
			"data" : params.eye,
			"min" : -100,
			"max" : 100,
			"step" : 0.1,
			"change" : function (index, val) {
				that.opperations.params.eye[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Center",
			"data" : params.center,
			"min" : -100,
			"max" : 100,
			"step" : 0.1,
			"change" : function (index, val) {
				that.opperations.params.center[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Up",
			"data" : params.up,
			"min" : 0,
			"max" : 1,
			"step" : 0.01,
			"change" : function (index, val) {
				that.opperations.params.up[index] = val;
			}
		});
		controls.push({
			"type" : "slider",
			"name" : "Rotation",
			"data" : params.camRot,
			"min" : -180,
			"max" : 180,
			"step" : 0.1,
			"change" : function (index, val) {
				that.opperations.params.camRot[index] = val;
			}
		});
	}
	for(var i = 0; i < this.shaderBindings.length; i++) {
		controls.push({
			"program" : i,
			"type" : "group",
			"label" : "Program_"+formatPadding(i+1, 3)
		});
		var shaderParams = this.shaderBindings[i].shaderParams;
		if(shaderParams != null) {
			for(var j = 0; j < shaderParams.uniforms.length; j++) {
				if(shaderParams.uniforms != null) {
					var param = shaderParams.uniforms[j];
					if(param.opps != undefined) {
						if(param.opps.data != undefined) {
							for(var k = 0; k < param.opps.data.length; k++) {
								var opp = param.opps.data[k].Opp;
								if(opp == "Range") {
									var min = parseFloat(param.opps.data[k].ParamVals[0]);
									var max = parseFloat(param.opps.data[k].ParamVals[1]);
									var step = parseFloat(param.opps.data[k].ParamVals[2]);
									controls.push({
										"program" : i,
										"uniform" : j,
										"type" : "slider",
										"name" : param.opps.name,
										"data" : param.data,
										"min" : min,
										"max" : max,
										"step" : step,
										"change" : function (index, val) {
											that.updateUniformBuffer.call(that, this.program, this.uniform, this.data);
										}
									})
								}
							}
						}
					}
				}
			}
		}
	}
	var params = {
			binding : "hudControl",
			controls : controls
		};
	this.hudController = new HudController(params);
	this.hudController.init();
}

RenderController.prototype.containsOpp = function (oppName) {
	for(var i = 0; i < this.shaderBindings.length; i++) {
		if(this.shaderBindings[i].shaderParams != null) {
			var uniforms = this.shaderBindings[i].shaderParams.uniforms;
			for(var j = 0; j < uniforms.length; j++) {
				if(uniforms[j].opps != null) {
					if(uniforms[j].opps.data != null) {
						for(var k = 0; k < uniforms[j].opps.data.length; k++) {
							if(uniforms[j].opps.data[k].Opp == oppName) {
								return true;
							}
						}
					}
				}
			}
		}
	}
	return false;
}

RenderController.prototype.snapshot = function (context, callback) {
	this.requestSnapshot = true;
	this.snapshotContext = context;
	this.snapshotCallback = callback;
}

RenderController.prototype.takeSnapshot = function () {
	if(this.snapshotContext != null && this.snapshotCallback != null) {
		var imgData = this.canvas.toDataURL();
		this.snapshotCallback.call(this.snapshotContext, imgData);
	}
}