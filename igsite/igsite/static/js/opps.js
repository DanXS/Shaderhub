function Opps(_params) {
	this.params = _params;
	if(_params == undefined) {
		this.params = new Object();
		this.params.fovy = [35];
		this.params.aspect = [1.33];
		this.params.left = [-10];
		this.params.right = [10];
		this.params.bottom = [-10];
		this.params.top = [10];
		this.params.znear = [0.1];
		this.params.zfar = [100];
		this.params.eye = [0,-20,0];
		this.params.center = [0,0,0];
		this.params.camRot = [0.0];
		this.params.up = [0,0,1];
	}
	else {
		this.setCameraParams(_params);
	}
	this.startTime = new Date();
}

Opps.prototype.getCameraParams = function () {
	return this.params;
}

Opps.prototype.setCameraParams = function (_params) {
	this.params = _params;
}

Opps.prototype.performOpp = function (oppName, params, data) {
	var result = null;
	try {
		switch(oppName) {
		case "Range":
			result = data;
			break;
		case "Time":
			var deltaTime = ((new Date()) - this.startTime)/1000.0;
			result = [deltaTime];
			break;
		case "Inverse":
			var mat = this.buildMat(data);
			result = M4x4.inverseTo3x3(mat);
			result = this.buildMat(result);
			break;
		case "Transpose":
			var mat = this.buildMat(data);
			result = M4x4.transpose(mat);
			break;
		case "Perspective":
			result = M4x4.makePerspective(this.params.fovy[0], this.params.aspect[0], this.params.znear[0], this.params.zfar[0]);
			break;
		case "Orthographic":
			result = M4x4.makeOrtho(this.params.left[0], this.params.right[0], this.params.bottom[0], this.params.top[0], this.params.znear[0], this.params.zfar[0]);
			break;
		case "CameraLookAt":
			var eye = V3.$(this.params.eye[0], this.params.eye[1], this.params.eye[2]);
			var center = V3.$(this.params.center[0], this.params.center[1], this.params.center[2]);
			var up = V3.$(this.params.up[0], this.params.up[1], this.params.up[2]);
			var rot = M4x4.makeRotate(this.params.camRot[0]*Math.PI/180.0, V3.$(0,1,0));
			up = V3.mul4x4(rot, up);
			if(data != null) {
				var mat = this.buildMat(data);
				var camera = M4x4.makeLookAt(eye, center, up);
				result = M4x4.mulAffine(camera, mat);
			}
			else
				result = M4x4.makeLookAt(eye, center, up);
			break;
		default:
			break;
		}
	} catch (err) {
		alert(err);
	}
	return result;
}

Opps.prototype.buildMat = function (data) {
	var mat = null;
	if(data == null) {
		throw "No data";
	}
	if(data.length == 16) {
		mat = M4x4.$(
				data[0], data[1], data[2], data[3],
				data[4], data[5], data[6], data[7],
				data[8], data[9], data[10], data[11],
				data[12], data[13], data[14], data[15]
		);
	}
	else if(data.length == 9) {
		mat = M4x4.$(
				data[0], data[1], data[2], 0,
				data[3], data[4], data[5], 0,
				data[6], data[7], data[8], 0,
				0, 0, 0, 1
		);
	}
	else if(data.length == 4) {
		mat = M4x4.$(
				data[0], data[1], 0, 0,
				data[2], data[3], 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1
		);
	}
	return mat;
}



