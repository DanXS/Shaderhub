function ConfigView(_binding) {
	this.binding = _binding;
	this.programs = null;
	this.nPrograms = 0;
	this.accordianExists = false;
	this.gl = null;
}

ConfigView.prototype.init = function() {
	this.load();
}

ConfigView.prototype.load = function() {
	this.build();
	if(modelData.shaderBindings != undefined)
	{
		var shaderBindings = JSON.parse(modelData.shaderBindings);
		for(var i = 0; i < shaderBindings.length; i++) {
			this.addProgram(shaderBindings[i]);
			this.programs[i].vert_shader_binding = shaderBindings[i].vert_shader_binding;
			this.programs[i].frag_shader_binding = shaderBindings[i].frag_shader_binding;
			var result = this.doCompileShaders(i);
			if(result != null)
				alert(result);
			else {
				if(shaderBindings[i].shaderParams != null) {
					this.programs[i].shaderParams = shaderBindings[i].shaderParams;
					this.buildShaderParamBindings($("#shaderParamsBinding_"+i), this.programs[i].shaderParams, i, shaderBindings[i]);
					var checkIcons = $(".icon-check-empty");
					checkIcons.removeClass("icon-check-empty");
					checkIcons.addClass("icon-check");
				}
			}
		}
	}
}

ConfigView.prototype.build = function() {
	this.binding.append("<div id='ProgramContainer'></div>");
	this.binding.append("<button id='AddProgram'>Add Program</button><div class='clearFloat'></div>");
	this.binding.append("<button id='CommitBindings'>Commit Bindings</button><div class='clearFloat'></div>");
	this.binding.append("<div id='popupDialog'></div>");
	this.bind();
}

ConfigView.prototype.addProgram = function (shaderBinding) {
	$("#ProgramContainer").append("<h3 class='configProgramBlock' id='Program_"+this.nPrograms+"'>Program_"+formatPadding(this.nPrograms+1, 3)+"<div style='float:right;'><i class='progDel icon-remove-circle'></i></div></h3>");
	$("#ProgramContainer").append("<div id='configBlockContainer_"+this.nPrograms+"'></div>");
	if(this.programs == null)
		this.programs = new Array();
	this.programs.push(new Object());
	this.buildProgramContent($("#configBlockContainer_"+this.nPrograms), this.nPrograms, shaderBinding);
	this.rebindAccordian();
	this.bindProgramControls();
	this.nPrograms = this.nPrograms+1;
}

ConfigView.prototype.validateBindings = function (program) {
	var valid = true;
	valid = valid && (program.vert_shader_binding != null && program.vert_shader_binding.data != null);
	valid = valid && (program.frag_shader_binding != null && program.frag_shader_binding.data != null);
	if(valid) {
		if(program.shaderParams != null) {
			var attributes = program.shaderParams.attributes;
			for(var i = 0; i < attributes.length;i++) {
				valid = valid && (attributes[i].name != undefined && attributes[i].uuid != undefined);
			}
			var uniforms = program.shaderParams.uniforms;
			for(var i = 0; i < uniforms.length; i++) {
				valid = valid && (
						(uniforms[i].opps != undefined && uniforms[i].opps.name != null && uniforms[i].opps.data != null)
						|| (uniforms[i].name != undefined && uniforms[i].uuid != undefined)
						|| (uniforms[i].name != undefined && uniforms[i].data != undefined)
						);
			}
		}
		else {
			valid = false;
		}
	}
	return valid;
}

ConfigView.prototype.commitBindings = function () {
	var postBindings = new Array();
	for(var i = 0; i < this.programs.length; i++) {
		if(this.programs[i] != null) {
			if(this.validateBindings(this.programs[i]))
				postBindings.push(this.programs[i]);
		}
	}
	if(postBindings.length == 0) {
		alert("Unable to commit bindings, please ensure that they have all been set");
	}
	else {
		var postdata = new Object();
		postdata["file_uuid"] = file_uuid;
		postdata["data"] = JSON.stringify(postBindings);
		$.ajax({
			  type: "POST",
			  url: "/datastore/uploadbindings",
			  data: postdata,
			  success: function (result) {
				  alert(result.OK);
			  },
			  error: function (result) {
				  alert(result.Error);
			  },
			  dataType: "json"
		});
	}
}

ConfigView.prototype.rebindAccordian = function () {
	if(this.accordianExists)
		$("#ProgramContainer").accordion("destroy");
	$("#ProgramContainer").accordion();
	this.accordianExists = true;
}

ConfigView.prototype.bind = function() {
	var that = this;
	$("button").button();

	$("#AddProgram").click(function() {
		that.addProgram();
	});
	
	$("#CommitBindings").click(function() {
		that.commitBindings();
	});
}

ConfigView.prototype.buildProgramContent = function (containerBinding, curr, shaderBinding) {
	containerBinding.empty();
	containerBinding.append("<div class='canvasContainer' style='float:right'><canvas id='glCanvas_"+curr+"' width='300' height='200' style='background-color:#000000;'>Your browser does not support the HTML5 canvas tag.</canvas></div>")
	containerBinding.append("<div style='width:100%;clear:both;' id='vertShaderBinding_"+curr+"'></div><div style='width:100%;' id='fragShaderBinding_"+curr+"'></div>");
	var shaderVertBinding = $("#vertShaderBinding_"+curr);
	var shaderFragBinding = $("#fragShaderBinding_"+curr);
	shaderVertBinding.append("<p>Vertex Shader:</p>");
	shaderFragBinding.append("<p>Fragment Shader:</p>");
	if(shaderBinding == undefined ||
		shaderBinding.vert_shader_binding == undefined ||
		shaderBinding.frag_shader_binding == undefined) {
		this.buildShaderSelect(shaderVertBinding, "vert", curr);
		this.buildShaderSelect(shaderFragBinding, "frag", curr);
		this.buildShaderEditor(shaderVertBinding, "vert", curr);
		this.buildShaderEditor(shaderFragBinding, "frag", curr);
	}
	else
	{
		this.buildShaderSelect(shaderVertBinding, "vert", curr, shaderBinding.vert_shader_binding.key);
		this.buildShaderSelect(shaderFragBinding, "frag", curr, shaderBinding.frag_shader_binding.key);
		this.buildShaderEditor(shaderVertBinding, "vert", curr, shaderBinding.vert_shader_binding.data);
		this.buildShaderEditor(shaderFragBinding, "frag", curr, shaderBinding.frag_shader_binding.data);
	}
	containerBinding.append("<button class='compileShaders' id='compileShaders_"+curr+"'>Compile</button><div class='clearFloat'></div>");
	containerBinding.append("<div id='shaderParamsBinding_"+curr+"'></div>");
}

ConfigView.prototype.buildShaderSelect = function (shaderSelectBinding, type, curr, active) {
	var html = "<div style='width:100%;'><select class='"+type+"Select' id='"+type+"Select_"+curr+"'>";
	html += "<option value='-1'>None</option>";
	for(var i = 0; i < shaders.length; i++) {
		var selected = "";
		for (first in shaders[i]) break;
		if(active != undefined && active == shaders[i][first])
			selected = "selected='selected'";
		if(shaders[i][first].indexOf(type) > 0)
			html += "<option value='"+first+"' "+selected+">"+shaders[i][first]+"</option>";
	}
	html += "</select></div>";
	shaderSelectBinding.append(html);
}

ConfigView.prototype.buildShaderEditor = function (shaderTextAreaBinding, type, curr, data) {
	if(data == undefined)
		data = "";
	var html = "<pre id='txt_"+type+"_"+curr+"' class='editor'>"+data+"<pre>";
	shaderTextAreaBinding.append(html);
	this.bindShaderEditor(type, curr);
}

ConfigView.prototype.bindShaderEditor = function (type, curr) {
    var editor = ace.edit("txt_"+type+"_"+curr);
    editor.setTheme("ace/theme/chrome");
    editor.getSession().setMode("ace/mode/glsl");	
}

ConfigView.prototype.getValue = function (list, key) {
	for(var i = 0; i < list.length; i++) {
		for (first in list[i]) break;
		if(first == key)
			return list[i][first];
	}
	return "";
}

ConfigView.prototype.buildShaderParamBindings = function (shaderParamBidnging, shaderParams, curr, shaderBinding) {
	var html = "";
	var attributes = shaderParams.attributes;
	var uniforms = shaderParams.uniforms;
	html += "<p>Attribute Binding:</p>";
	html += "<div class='bindingTable' style='display:table;width:100%;'>";
	for(var i = 0; i < attributes.length; i++)
	{
		html += "<div class='bindingRow' style='display:table-row;width:100%;'>"
		html += "<div id='Attribute_"+curr+"_"+i+"' style='display:table-cell;inline:block;width:200px;'><i class='icon-li icon-check-empty'></i> "+attributes[i].activeInfo.name+"</div>";
		html += "<div id='Attribute_Assign_"+curr+"_"+i+"' style='display:table-cell;'></div>";
		html += "</div>";
	}
	html += "</div>";
	html += "<br/><p>Uniform Binding:</p>";
	html += "<div  class='bindingTable' style='display:table;width:100%;'>";
	for(var i = 0; i < uniforms.length; i++)
	{
		html += "<div class='bindingRow' style='display:table-row;width:100%;'>"
		html += "<div id='Uniform_"+curr+"_"+i+"' style='display:table-cell;inline:block;width:200px;'><i class='icon-li icon-check-empty'></i> "+uniforms[i].activeInfo.name+"</div>";
		html += "<div id='Uniform_Assign_"+curr+"_"+i+"' style='display:table-cell;'></div>";
		if(uniforms[i].activeInfo.type != uniformEnumType['GL_SAMPLER_2D'] && uniforms[i].activeInfo.type != uniformEnumType['GL_SAMPLER_CUBE']) {
			html += "<div style='display:table-cell;'><button id='Uniform_Define_"+curr+"_"+i+"' class='uniformDefine'>Define</button></div>";
			html += "<div style='display:table-cell;'><button id='Uniform_Opp_"+curr+"_"+i+"' class='uniformOpp'>Apply Operations</button></div>";		
		}
		html += "</div>";
	}
	html += "</div>";
	shaderParamBidnging.empty();
	shaderParamBidnging.append(html);
	for(var i = 0; i < attributes.length; i++) {
		this.buildModelAttributeSelectBox($("#Attribute_Assign_"+curr+"_"+i), attributes[i], "attributeBind", curr, i, shaderBinding);
	}
	for(var i = 0; i < uniforms.length; i++) {
		this.buildModelAttributeSelectBox($("#Uniform_Assign_"+curr+"_"+i), uniforms[i], "uniformBind", curr, i, shaderBinding);
	}
	shaderParamBidnging.append("<button class='previewShader' id='previewShader_"+curr+"'>Preview</button><div class='clearFloat'></div>");
	this.bindShaderParamBindings(shaderParams, curr);
}

ConfigView.prototype.buildModelAttributeSelectBox = function(selectBinding, param, type, curr, index, shaderBinding) {
	var html = "<div style='width:100%;'><select class='"+type+"Select' id='"+type+"Select_"+curr+"_"+index+"'>";
	html += "<option value='-1'>None</option>";
	var list = [];
	if(type=="attributeBind") // is attribute
		list = vertices.concat(normals, uvs);
	else { // is uniform
		if(param.activeInfo.type>=uniformEnumType["GL_BYTE"] && param.activeInfo.type<=uniformEnumType["GL_FLOAT"] || param.activeInfo.type==uniformEnumType["GL_BOOL"]) {
			// some kind of vector or single value
			// ToDo: so far nothing of this type exported from blender
		}
		if(param.activeInfo.type>=uniformEnumType["GL_FLOAT_VEC2"] && param.activeInfo.type<=uniformEnumType["GL_BOOL_VEC4"] && param.activeInfo.type!=uniformEnumType["GL_BOOL"]) {
			// some kind of vector or single value
			// ToDo: so far nothing of this type exported from blender
		}
		else if(param.activeInfo.type>=uniformEnumType["GL_FLOAT_MAT2"] && param.activeInfo.type<=uniformEnumType["GL_FLOAT_MAT4"]) {
			// some kind of matrix
			list = matrices;
		}
		else if(param.activeInfo.type>=uniformEnumType["GL_SAMPLER_2D"] && param.activeInfo.type<=uniformEnumType["GL_SAMPLER_CUBE"]) {
			// some kind of texture sampler
			list = textures;
		}
	}
	for(var i = 0; i < list.length; i++) {
		if(list[i] != null) {
			for (first in list[i]) break;
			var selected = "";
			if(shaderBinding != undefined && shaderBinding.shaderParams != undefined) {
				var vals = null;
				if(type=="attributeBind")
					vals = shaderBinding.shaderParams.attributes;
				else
					vals = shaderBinding.shaderParams.uniforms;
				if(list[i][first] == vals[index].name)
					selected = "selected='selected'";
			}
			html += "<option value='"+first+"'"+ selected +" >"+list[i][first]+"</option>";
		}
	}
	html += "</select></div>";
	selectBinding.append(html);
}

ConfigView.prototype.getAttributeSelectValue = function (key) {
	list = vertices.concat(normals, uvs);
	for(var i = 0; i < list.length; i++) {
		if(list[i] != null) {
			for (first in list[i]) break;
			if(first == key) {
				return list[i][key];
			}
		}
	}
	return null;
}

ConfigView.prototype.getUniformSelectValue = function (key) {
	list = matrices.concat(textures);
	for(var i = 0; i < list.length; i++) {
		if(list[i] != null) {
			for (first in list[i]) break;
			if(first == key) {
				return list[i][key];
			}
		}
	}
	return null;
}

ConfigView.prototype.buildUniformDefForm = function (binding, typeDetails, curr, index, values) {
	var html = "";
	if(values != undefined) {
		var data = values.data;
		var name = values.name;
	}
	if(name != undefined) {
		html += "<label for='name'>Name:</label>";
		html += "<input type='edit' id='defName' name='name'  value='"+name+"'/><br/><br/>";
	}
	else {
		html += "<label for='name'>Name:</label>";
		html += "<input type='edit' id='defName' name='name' /><br/><br/>";
	}
	if(typeDetails.isMat) {
		html += "<div style='display:table;'>";
		for(var i = 0; i < typeDetails.size; i++) {
			html += "<div style='display:table-row;'>";
			for(var j = 0; j < typeDetails.size; j++) {
				html += "<div style='display:table-cell;'>";
				value = (data == undefined) ? 0 : data[i*typeDetails.size+j];
				html += "<input class='defValSpinner' id='value_"+i+"' name='value_"+(typeDetails.size*i+j)+"'  value='"+value+"' style='width:40px;'/>";
				html += "</div>";
			}
			html += "</div>";
		}
		html += "</div>";
	}
	else {
		html += "<div style='display:table;'>";
		html += "<div style='display:table-row;'>";
		for(var i = 0; i < typeDetails.size; i++) {
			html += "<div style='display:table-cell'>";
			if(typeDetails.isBool) {
				value = (data == undefined) ? "" : ((data[i]) ? "checked='checked'" : "");
				html += "<input class='defValCheck' id='value_"+i+"' type='checkbox' name='value_"+i+"' "+value+" style='width:40px;' />";
			}
			else {
				value = (data == undefined) ? 0 : data[i];
				html += "<input class='defValSpinner' id='value_"+i+"' name='value_"+i+"' value='"+value+"' style='width:40px;'/>";
			}
			html += "</div>";
		}
		html += "</div></div>";
	}
	html += "<div id='defMessage'></div>";
	binding.append(html);
	this.bindUniformDefForm(typeDetails);
}

ConfigView.prototype.bindUniformDefForm = function (typeDetails) {
	if(typeDetails.isInt) {
		$(".defValSpinner").spinner();
	}
	else {
		$(".defValSpinner").spinner({
			step: 0.01,
			numberFormat: "n"
    		});
   	}
}

ConfigView.prototype.readUniformDefValues = function (typeDetails) {
	var data = new Array();
	var name = $("#defName").val();
	if(typeDetails.isBool) {
		$(".defValCheck").each(function () {
			data.push($(this).is(':checked'));
		});
	}
	else {
		$(".defValSpinner").each(function () {
			if(typeDetails.isInt)
				data.push(parseInt($(this).val(), 10));
			else
				data.push(parseFloat($(this).val()));
		});
	}
	return {"name":name, "data":data};
}

ConfigView.prototype.getUniformValues = function (prog, index) {
	return {"data" : this.programs[prog].shaderParams.uniforms[index]["data"],
			"name" : this.programs[prog].shaderParams.uniforms[index]["name"]};
}

ConfigView.prototype.setUniformValues = function (prog, index, values) {
	if(values == null) {
		delete this.programs[prog].shaderParams.uniforms[index]['data'];
		delete this.programs[prog].shaderParams.uniforms[index]['name'];
	}
	else {
		this.programs[prog].shaderParams.uniforms[index]["data"] = values.data;
		this.programs[prog].shaderParams.uniforms[index]["name"] = values.name;
	}
}

ConfigView.prototype.getUniformBinding = function (prog, index) {
	return {"uuid" : this.programs[prog].shaderParams.uniforms[index]["uuid"], 
	        "name" : this.programs[prog].shaderParams.uniforms[index]["name"]};
}

ConfigView.prototype.setUniformBinding = function (prog, index, values) {
	if(values == null) {
		delete this.programs[prog].shaderParams.uniforms[index]['uuid'];
		delete this.programs[prog].shaderParams.uniforms[index]['name'];
	}
	else {
		this.programs[prog].shaderParams.uniforms[index]["uuid"] = values.uuid;
		this.programs[prog].shaderParams.uniforms[index]['name'] = values.name;
	}
}

ConfigView.prototype.getAttributeBinding = function (prog, index) {
	return {"uuid" : this.programs[prog].shaderParams.attributes[index]["uuid"],
			"name" : this.programs[prog].shaderParams.attributes[index]["name"]};
}

ConfigView.prototype.setAttributeBinding = function (prog, index, values) {
	if(values == null) {
		delete this.programs[prog].shaderParams.attributes[index]['uuid'];
		delete this.programs[prog].shaderParams.attributes[index]["name"];
	}
	else {
		this.programs[prog].shaderParams.attributes[index]["uuid"] = values.uuid;
		this.programs[prog].shaderParams.attributes[index]["name"] = values.name;
	}
}

ConfigView.prototype.getUniformOpps = function(prog, index) {
	return this.programs[prog].shaderParams.uniforms[index]["opps"];
}

ConfigView.prototype.setUniformOpps = function(prog, index, opps) {
	if(opps == null) {
		delete this.programs[prog].shaderParams.uniforms[index]["opps"];
	}
	else
	{
		this.programs[prog].shaderParams.uniforms[index]["opps"] = opps;
	}
}

ConfigView.prototype.buildUniformOppForm = function(binding, type, prog, index, opps, hasData) {
	var html = "";
	var data = null;
	var name = null;
	if(opps != undefined) {
		data = opps.data;
		name = opps.name;
	}
	if(name != undefined) {
		html += "<label for='name'>Name:</label>";
		html += "<input type='edit' id='oppName' name='name' value='"+name+"' disabled /><br/><br/>";
	}
	else {
		html += "<label for='name'>Name:</label>";
		html += "<input type='edit' id='oppName' name='name' /><br/><br/>";
	}
	var validOpps = getValidUniformOperations(type, hasData);
	html += "<select class='oppSelect' id='oppSelect_"+index+"'>";
	for(var i = 0; i < validOpps.length; i++) {
		html += "<option value='"+i+"'>"+validOpps[i].Opp+"</option>";
	}
	html += "</select>";
	html += "<button class='addOpperation'>Add</button>";
	html += "<div class='clearFloat'></div>";
	html += "<div class='oppListContainer'><ul class='icons-ul' id='oppList'></ul></div>";
	html += "<div id='oppMessage'></div>";
	binding.append(html);
	if(data != null) {
		for(var i = 0; i < data.length; i++) {
			var selected = null;
			for(j = 0; j < validOpps.length; j++) {
				if(validOpps[j].Opp == data[i].Opp) {
					selected = j;
					break;
				}
			}
			if(selected != null) {
				$("#oppList").append("<li id='opp_"+i+"_"+selected+"'><i id='oppDel_"+i+"_"+selected+"' class='oppDel icon-li icon-remove-circle' style='cursor:pointer;'></i>"+data[i].Opp+"</li>");
				if(validOpps[selected].Params != null) {
					for(var k = 0; k < validOpps[selected].Params.length; k++) {
						var html = "<div id='opp_"+i+"_"+selected+"_"+k+"' style='width:100%;'>"
								+ "<span style='display:block;width:100px;float:left;'>"
								+ validOpps[selected].Params[k] + "</span>";
						html += "<input class='defValSpinner' id='oppParam_"+i+"_"+selected+"_"+k
								+ "' style='width:40px;float:right;' value='"
								+ data[i].ParamVals[k] + "'></input>";
						html += "</div><div class='clearFloat'></div>";
						$("#opp_"+i+"_"+selected).append(html);
					}
					$(".defValSpinner").spinner({
						step: 0.01,
						numberFormat: "n"
		    			});
				}
			}
		}
	}
	this.bindUniformOppForm(validOpps);
}

ConfigView.prototype.bindUniformOppForm = function (validOpps) {
	var that = this;
	$("button").button();
	$(".addOpperation").click(function (event) {
		var index = $("#oppList li").length;
		var selected = $(".oppSelect").val();
		$("#oppList").append("<li id='opp_"+index+"_"+selected+"'><i id='oppDel_"+index+"_"+selected+"' class='oppDel icon-li icon-remove-circle' style='cursor:pointer;'></i>"+validOpps[selected].Opp+"</li>");
		if(validOpps[selected].Params != null) {
			for(var i = 0; i < validOpps[selected].Params.length; i++) {
				var html = "<div id='opp_"+index+"_"+selected+"_"+i+"' style='width:100%;'>"
						+ "<span style='display:block;width:100px;float:left;'>"
						+ validOpps[selected].Params[i] + "</span>";
				html += "<input class='defValSpinner' id='oppParam_"+index+"_"+selected+"_"+i
						+ "' style='width:40px;float:right;' value='"
						+ validOpps[selected].Default[i] + "'></input>";
				html += "</div><div class='clearFloat'></div>";
				$("#opp_"+index+"_"+selected).append(html);
			}
			$(".defValSpinner").spinner({
				step: 0.01,
				numberFormat: "n"
    			});
		}
		that.rebindUniformOppDelete.call(that);
	});
	this.rebindUniformOppDelete();
}

ConfigView.prototype.rebindUniformOppDelete = function () {
	$(".oppDel").unbind();
	$(".oppDel").click(function(event) {
		var id = $(event.currentTarget).attr("id");
		$(event.currentTarget).parent().remove();
	});	
}


ConfigView.prototype.readUniformOppValues = function (type, hasData) {
	var oppList = $("#oppList").find("li");
	var selectedOpps = new Object();
	selectedOpps.name = $("#oppName").val();
	selectedOpps.data = new Array();
	if(oppList.length > 0) {
		var validOpps = getValidUniformOperations(type, hasData);
		for(var i = 0; i < oppList.length; i++) {
			var id = $(oppList[i]).attr("id");
			var parts = id.split("_");
			var opIndex = parts[1];
			var index = parseInt(id.substring(id.lastIndexOf("_")+1), 10);
			var json = JSON.stringify(validOpps[index]);
			selectedOpps.data.push(JSON.parse(json));
			if(selectedOpps.data[i].Params.length > 0) {
				var vals = new Array();
				for(j = 0; j < selectedOpps.data[i].Params.length; j++) {
					var val = $("#oppParam_"+opIndex+"_"+index+"_"+j).val();
					vals.push(parseFloat(val));
				}
				selectedOpps.data[i].ParamVals = vals;
			}
		}
	}
	return selectedOpps;
}

ConfigView.prototype.doCompileShaders = function (curr) {
	var message = null;
	try {
		var vertexEditor = ace.edit("txt_vert_"+curr);
		var vertexShaderSource = vertexEditor.getValue();
		var fragmentEditor = ace.edit("txt_frag_"+curr);
		var fragmentShaderSource = fragmentEditor.getValue();
		if(this.gl == null)
			this.gl = initGL(document.getElementById("glCanvas_"+curr));
		var vertexShader = compileShader(this.gl, vertexShaderSource, this.gl.VERTEX_SHADER);
		var fragmentShader = compileShader(this.gl, fragmentShaderSource, this.gl.FRAGMENT_SHADER);
		this.programs[curr].vert_shader_binding.data = vertexShaderSource;
		this.programs[curr].frag_shader_binding.data = fragmentShaderSource;
		this.programs[curr].program = linkShaders(this.gl, vertexShader, fragmentShader);
		this.programs[curr].shaderParams = getShaderParams(this.gl, this.programs[curr].program);
	}
	catch(e) {
		message = e.message;
	}
	return message;
}

ConfigView.prototype.bindProgramControls = function () {
	var that = this;
	
	$(".vertSelect").unbind();
	$(".fragSelect").unbind();
	$(".progDel").unbind();
	$(".vertSelect").unbind();
	$(".fragSelect").unbind();
	$(".compileShaders").unbind();
	
	$("button").button();

	$(".vertSelect").mousedown(function (event) {
		event.stopPropagation();
	});
	
	$(".fragSelect").mousedown(function (event) {
		event.stopPropagation();
	});
	
	$(".progDel").click(function (event) {
		if(confirm("Are you sure you want to delete this program?")) {
			var id = $(event.currentTarget).parent().parent().attr("id");
			var parts = id.split("_");
			var index = parseInt(parts[1], 10);
			that.programs[index] = null;
			$("#ProgramContainer").accordion("destroy");
			$("#"+id).remove();
			$("#configBlockContainer_"+index).remove();
			$("#ProgramContainer").accordion();
			var j = 0;
			for(var i = 0; i < that.programs.length; i++) {
				if(that.programs[i] != null) {
					var name = "Program_"+formatPadding(j+1, 3);
					$("#Program_"+i).html(name+"<div style='float:right;'><i class='progDel icon-remove-circle'></i></div>");
					j++;
				}
			}
		}
		that.bindProgramControls.call(that);
		return false;
	});

	$(".vertSelect").change(function (event) {
		var source = $(event.target).attr("id");
		var key = $("#"+source).val();
		var value = that.getValue(shaders, key);
		var curr = source.substring(source.lastIndexOf("_")+1);
		that.programs[curr].vert_shader_binding = {key:value};
		var shaderData = modelData[value];
		var editor = ace.edit("txt_vert_"+curr);
		editor.selectAll();
		editor.removeLines();
		editor.insert(shaderData);
		return true;
	});

	$(".fragSelect").change(function (event) {
		var source = $(event.target).attr("id");
		var key = $("#"+source).val();
		var value = that.getValue(shaders, key);
		var curr = source.substring(source.lastIndexOf("_")+1);
		that.programs[curr].frag_shader_binding = {key:value};
		var shaderData = modelData[value];
		var editor = ace.edit("txt_frag_"+curr);
		editor.selectAll();
		editor.removeLines();
		editor.insert(shaderData);
		return false;
	});
	
	$(".compileShaders").click(function (event) {
		var source = $(event.currentTarget).attr("id");
		var curr = source.substring(source.lastIndexOf("_")+1);
		var result = that.doCompileShaders.call(that, curr);
		if(result != null)
			alert(result);
		else
			that.buildShaderParamBindings.call(that, $("#shaderParamsBinding_"+curr), that.programs[curr].shaderParams, curr);
		return false;
	});
}

ConfigView.prototype.bindShaderParamBindings = function (shaderParams, curr) {
	var that = this;
	
	$("button").button();

	$(".attributeBindSelect").mousedown(function (event) {
		event.stopPropagation();
	});
	
	$(".uniformBindSelect").mousedown(function (event) {
		event.stopPropagation();
	});

	$(".attributeBindSelect").change(function (event) {
		var source = $(event.target).attr("id");
		var parts = source.split('_');
		var index = parts[parts.length-1];
		var prog = parts[parts.length-2];
		var key = $("#"+source).val();
		if(key == "-1") {
			that.setAttributeBinding.call(that, prog, index, null);
			var checkIcon = $("#Attribute_"+prog+"_"+index+" i");
			checkIcon.removeClass("icon-check");
			checkIcon.addClass("icon-check-empty");
		}
		else {
			var name = that.getAttributeSelectValue.call(that, key);
			var values = {"uuid":key, "name":name};
			that.setAttributeBinding.call(that, prog, index, values);
			var checkIcon = $("#Attribute_"+prog+"_"+index+" i");
			checkIcon.removeClass("icon-check-empty");
			checkIcon.addClass("icon-check");
		}
		return false;
	});
	
	$(".uniformBindSelect").change(function (event) {
		var source = $(event.target).attr("id");
		var parts = source.split('_');
		var index = parts[parts.length-1];
		var prog = parts[parts.length-2];
		var key = $("#"+source).val();
		if(key == "-1") {
			that.setUniformBinding.call(that, prog, index, null);
			var checkIcon = $("#Uniform_"+prog+"_"+index+" i");
			checkIcon.removeClass("icon-check");
			checkIcon.addClass("icon-check-empty");
			$("#Uniform_Define_"+prog+"_"+index).button("enable");
		}
		else {
			var name = that.getUniformSelectValue.call(that, key);
			var values = {"uuid":key, "name":name};
			that.setUniformBinding.call(that, prog, index, values);
			var checkIcon = $("#Uniform_"+prog+"_"+index+" i");
			checkIcon.removeClass("icon-check-empty");
			checkIcon.addClass("icon-check");
			$("#Uniform_Define_"+prog+"_"+index).button("disable");
		}
		return false;
	});
	
	$(".uniformDefine").click(function (event) {
		var source = $(event.currentTarget).attr("id");
		var parts = source.split('_');
		var index = parts[parts.length-1];
		var prog = parts[parts.length-2];
		var uniform = shaderParams.uniforms[index];
		var typeDetails = getTypeDetails.call(that, uniform.activeInfo.type);
		var popup = $("#popupDialog");
		popup.empty();
		popup.append("<div id='paramDef_"+prog+"_"+index+"'></div>");
		var values = that.getUniformValues.call(that, prog, index);
		that.buildUniformDefForm.call(that, $("#paramDef_"+prog+"_"+index), typeDetails, prog, index, values);
		popup.dialog({
			title: "Define Uniform",
			autoOpen: false,
			show: {
				effect: "size",
				duration: 200
			},
			hide: {
				effect: "size",
				duration: 200
			},
			buttons: {
				"Apply": function() {
					var newvalues = new Object;
					newvalues = JSON.parse(JSON.stringify(that.readUniformDefValues.call(that, typeDetails)));
					if(newvalues.name == null || newvalues.name.length == 0)
					{
						$("#defMessage").html("Please provide a name<i class='icon-exclamation'></i>");
					}
					else
					{
						that.setUniformValues.call(that, prog, index, newvalues);
						var checkIcon = $("#Uniform_"+prog+"_"+index+" i");
						checkIcon.removeClass("icon-check-empty");
						checkIcon.addClass("icon-check");
						$( this ).dialog( "close" );
					}
				},
				Cancel: function() {
					$( this ).dialog( "close" );
				}
			}
		});
		popup.dialog('open');
		return false;
	});
	
	$(".uniformOpp").click(function (event) {
		var source = $(event.currentTarget).attr("id");
		var parts = source.split('_');
		var index = parts[parts.length-1];
		var prog = parts[parts.length-2];
		var uniform = shaderParams.uniforms[index];
		var popup = $("#popupDialog");
		popup.empty();
		popup.append("<div id='paramOpp_"+prog+"_"+index+"'></div>");
		var opps = that.getUniformOpps.call(that, prog, index);
		var uniformDataBinding = that.getUniformBinding.call(that, prog, index);
		var hasData = (uniformDataBinding != undefined) && (uniformDataBinding.name != undefined);
		if(hasData && opps == undefined)
			opps = {"name":uniformDataBinding.name};
		that.buildUniformOppForm.call(that, $("#paramOpp_"+prog+"_"+index), uniform.activeInfo.type, prog, index, opps, hasData);
		popup.dialog({
			title: "Apply Operations",
			autoOpen: false,
			width:340,
			height:420,
			show: {
				effect: "size",
				duration: 200
			},
			hide: {
				effect: "size",
				duration: 200
			},
			buttons: {
				"Apply": function() {
					var newopps = new Object;
					newopps = JSON.parse(JSON.stringify(that.readUniformOppValues.call(that, uniform.activeInfo.type, hasData)));
					if(newopps.name == null || newopps.name.length == 0)
					{
						$("#oppMessage").html("Please provide a name<i class='icon-exclamation'></i>");
					}
					else
					{
						that.setUniformOpps.call(that, prog, index, newopps);
						var checkIcon = $("#Uniform_"+prog+"_"+index+" i");
						checkIcon.removeClass("icon-check-empty");
						checkIcon.addClass("icon-check");
						$( this ).dialog( "close" );
					}
				},
				Cancel: function() {
					$( this ).dialog( "close" );
				}
			}
		});
		popup.dialog('open');
		return false;
	});

	$(".previewShader").click(function (event) {
		alert("This feature has not been implemented yet, comming soon!");
		return;
		var source = $(event.currentTarget).attr("id");
		var parts = source.split('_');
		var curr = parseInt(parts[1], 10);
		var program = that.programs[curr];
		console.info(JSON.stringify(program));
	});

}



