function HudController(_params) {
	this.params = _params;
	this.hudView = null;
}

HudController.prototype.init = function () {
	this.hudView = new HudView(this.params);
	this.hudView.init();
}

