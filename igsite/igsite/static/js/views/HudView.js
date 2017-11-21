function HudView(_params) {
	this.binding = _params.binding;
	this.controls = _params.controls;
}

HudView.prototype.init = function () {
	this.build();
	this.bind();
}

HudView.prototype.build = function () {
	var binding = $("#" + this.binding);
	binding.empty();
	if(this.controls != null) {
		for(var i = 0; i < this.controls.length; i++) {
			if(this.controls[i].type == "group") {
				binding.append("<div class='group'>"+this.controls[i].label+"<hr/></div>")
			}
			if(this.controls[i].type == "slider") {
				binding.append("<div id='"+this.controls[i].name+"_"+i+"'><span>"+this.controls[i].name+"</span></div>");
				$("#" +this.controls[i].name+"_"+i).append("<div></div>");
				var controlListBinding = $("#" +this.controls[i].name+"_"+i+" div");
				for(var j = 0; j < this.controls[i].data.length; j++) {
					var sliderbinding = this.controls[i].name+"_"+i+"_"+j;
					controlListBinding.append("<div id='"+sliderbinding+"' class='slider'></div><div id='"+sliderbinding+"_amount' class='sliderAmount' >"+this.controls[i].data[j]+"</div><div class='clearFloat'></div>");
				}
			}
		}
	}
}

HudView.prototype.bind = function () {
	var that = this;
	if(this.controls != null) {
		for(var i = 0; i < this.controls.length; i++) {
			if(this.controls[i].type == "slider") {
				for(var j = 0; j < this.controls[i].data.length; j++) {
					var sliderbinding = this.controls[i].name+"_"+i+"_"+j;
					$("#"+sliderbinding).slider({
						min: this.controls[i].min,
						max: this.controls[i].max,
						step: this.controls[i].step,
						value: this.controls[i].data[j],
						slide: function( event, ui ) {
							var value = ui.value;
							var id = $(event.target).attr("id");
					        $( "#"+id+"_amount" ).html( value );
					        var parts = id.split("_");
					        var index_j = parseInt(parts[parts.length-1], 10);
					        var index_i = parseInt(parts[parts.length-2], 10);
					        that.controls[index_i].data[index_j] = value;
					        if(that.controls[index_i].change != undefined) {
					        	that.controls[index_i].change(index_j, value);
					        }
					    }
					});
				}
			}
		}
	}
}