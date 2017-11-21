function ConfigController(_binding) {
	this.binding = _binding;
	this.configView = null;
}

ConfigController.prototype.init = function () {
	this.configView = new ConfigView(this.binding);
	this.configView.init();
}