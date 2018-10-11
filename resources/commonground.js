// Functions for CommonGround
function CommonGround(){

	var baseMaps = {
		'National Library of Scotland': L.tileLayer('https://geo.nls.uk/maps/os/1inch_2nd_ed/{z}/{x}/{y}.png', {
			attribution: 'Tiles: &copy; <a href="http://geo.nls.uk/maps/">National Library of Scotland Historic Maps</a>',
			bounds: [[49.6, -12], [61.7, 3]],
			minZoom: 1,
			maxZoom: 18,
			subdomains: '0123'
		}),
		'Esri WorldImagery': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
			attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
		}),
	}
	var commons = new DataMapper({
		'id': 'commonground',
		'baseMaps': baseMaps,
		'src': [
			'layers/layers.json',
			'https://raw.githubusercontent.com/odileeds/west-yorkshire-mapping/master/data/mapper.json'
		]
	});

	commons.on('init',function(){

		this.signin = function(){
			var _obj = this;

			if(S('#authform').length==0) S('body').append('<div id="authform" class="popup open"><button class="close" title="Close"></button><div class="centered"><iframe height="400" width="400" src="https://www.imactivate.com/urbancommons/signin/form.html"></iframe></div></div>');

			// Add close contents and event
			S('#authform .close').html(getIcon('remove')).on('click',function(e){
				S('#authform').remove();
			});

			// Listen for communication from imactivate
			function receiveMessage(event) {

				d = JSON.parse(event.data);
				console.log("receiveMessage:",d);

				if(d.msg == "success"){

					S('#authform').remove();
					_obj.setUser(d.user);
					_obj.getUserLayers();

				}else{
					// Error state
					console.log('something went wrong',d)
				}
			}

			window.addEventListener("message", receiveMessage, false);

			return this;
		}

		this.signout = function(){
			console.log('signout')
			// Do a call to imactivate here
			S(document).ajax("https://www.imactivate.com/urbancommons/signin/logout.php",{
				'dataType':'jsonp',
				'this':_obj,
				'success':function(data,attr){
					console.log('Yay',data,this,'hi',data,attr);
					this.setUser('');
					this.removeUserLayers();

					for(var l in layers){
						// BLAH
					}
		/*
					if(typeof d=="object"){
						layers = d;
						// Load any layers that now can be loaded
						this.finishLoadingLayers();
					}*/
				}
			});

			//this.setUser();
			return this;
		}

		this.getUser = function(){
			S(document).ajax("https://www.imactivate.com/urbancommons/signin/checkuser.php",{
				'dataType':'jsonp',
				'this':_obj,
				'success':function(data,attr){
					this.setUser(data.user);
					this.getUserLayers();
					if(typeof d=="object"){
						//for(l in d) layers.push(d[l])
						// Load any layers that now can be loaded
						//this.finishLoadingLayers();
					}
				}
			});
			return this;
		}

		this.setUser = function(user){
			this.user = user;
			if(user){
				S('.needs-user').css({'display':'inline-block'});
				S('.signin').css({'display':'none'});
				S('.signout').css({'display':'inline-block'});
				S('#createaccount').css({'display':'none'});
				S('#user').css({'display':'inline-block'}).html(user);
			}else{
				S('.needs-user').css({'display':'none'});
				S('.signin').css({'display':'inline-block'});
				S('.signout').css({'display':'none'});
				S('#createaccount').css({'display':'inline-block'});
				S('#user').css({'display':'none'}).html('');
			}
			return this;
		}

		this.removeUserLayers = function(){
			for(var l in layers){
				if(layers[l].organisation){
					this.removeLayer(l);
					delete layers[l];
				}
			}
			return this;
		}

		this.getUserLayers = function(){

			if(!this.user){
				console.log('Where has the user gone?');
				return this;
			}

			// Now we need to load the layers
			url = "https://www.imactivate.com/urbancommons/getUserLayers.php";
			console.log('Getting '+url);
			S(document).ajax(url,{
				'dataType':'jsonp',
				'this':this,
				'success':function(d){
					console.log('returned layers',d,layers);
					if(typeof d==="object"){
						console.log('Adding layers',d);
						for(l in d){
							if(!layers[l]){
								// Kludge to fix GeoJSON returned
								if(d[l].geojson.indexOf("\"type\":\"FeatureCollection\"") > 0){
									d[l].geojson = JSON.parse(d[l].geojson.replace(/\?$/,"").replace(/\\"/,'"'));
								}
								layers[l] = d[l];
								// User layers are editable
								layers[l].edit = true;
							}
						}
						// Load any layers that now can be loaded
						this.finishLoadingLayers();
					}
				}
			});
		}
		// Create a new layer
		this.target.find('.newLayer input[type="submit"]').on('click',{me:this},function(e){
			e.preventDefault();

			var k = 0;
			var key = "temporary-layer";
			while(layers[key+(k > 0 ? '-'+k:'')]) k++;
			key = key+(k > 0 ? '-'+k:'');

			var obj = {'name':e.data.me.target.find('.name')[0].value,'desc':e.data.me.target.find('.desc')[0].value,'url':e.data.me.target.find('.url')[0].value,'owner':'stuart','credit':'&copy; Stuart Lowe','licence':'ODbL','odbl':true,'colour':e.data.me.target.find('.color')[0].value,'edit':true};

			// Do things here to create a new layer
			layers[key] = obj;
			e.data.me.loadLayer(key);
			e.data.me.toggleLayer(key);
			e.data.me.updateLayers();
			e.data.me.startEditLayer(key);
			
			e.data.me.target.find('.newLayer').removeClass('open');
		});

		this.target.find('.create-layer').on('click',{me:this},function(e){
			e.data.me.target.find('.add').removeClass('open');
			e.data.me.target.find('.newLayer').addClass('open').find('.close').focus();
		});

		this.target.find('.newLayer .close').html(getIcon('remove')).on('click',{me:this},function(e){
			e.data.me.target.find('.newLayer').removeClass('open');
			e.data.me.target.find('.layers .add').focus();
		});

		S('.signin').on('click',{me:this},function(e){
			e.preventDefault();
			e.stopPropagation();
			var a = e.data.me.signin();
			return false;
		});

		S('.signout').on('click',{me:this},function(e){
			e.preventDefault();
			e.stopPropagation();
			var a = e.data.me.signout();
			return false;
		});


		function stopDrawing(e){
			_obj.drawing = false;
			_obj.target.find('.leaflet-draw-toolbar .active').removeClass('active');
			_obj.map.editTools.stopDrawing();
			removeTooltip(e);
			return;
		}
		function drawItem(el,me,typ,id){
			me.drawingtype = typ;
			if(me.drawing){
				stopDrawing();
			}else{
				me.drawing = true;
				el.addClass('active');
				_obj.map.editTools.featuresLayer = this.layers[id].leaflet;
				if(typ=="polyline") window.LAYER = _obj.map.editTools.startPolyline.call(_obj.map.editTools);
				if(typ=="polygon") window.LAYER = _obj.map.editTools.startPolygon.call(_obj.map.editTools);
				if(typ=="marker") window.LAYER = _obj.map.editTools.startMarker.call(_obj.map.editTools,_obj.map.editTools,{'icon':makeMarker(layers[id].colour)});
			}
			return;
		}

		this.startEditLayer = function(id){
			if(this.editing) this.stopEditLayer();
			if(layers[id]){
				this.editing = id;
				this.target.find('.layers li.edit').removeClass('edit');
				this.target.find('.editor').remove();
				this.layerlookup[id].addClass('edit').removeClass('open');
				// If the Leaflet layer doesn't exist, create a layerGroup
				if(!this.layers[id].leaflet) this.layers[id].leaflet = new L.layerGroup();
				// Add the layer to the map
				this.layers[id].leaflet.addTo(this.map);
				// If we have any features we need to make them editable
				this.layers[id].leaflet.eachLayer(function(layer) { layer.enableEdit(); });
				this.map.on('editable:drawing:start', function(e){
					if(e.layer.setStyle) e.layer.setStyle({color: layers[id].colour});
					addTooltip(e);
				}).on('editable:drawing:end', function(e){
					stopDrawing(e);
				}).on('editable:drawing:click', function(e){
					updateTooltip(e);
				});


				// Set the colours
				this.setLayerColours(id);				

				// Add the Editor HTML
				this.layerlookup[id].append('<div class="editor"><div><div class="left padded"><form><div class="row"><label for="edit-name">Title:</label><input type="text" id="edit-name" name="edit-name" value="'+layers[id].name+'" /></div><div class="row"><label for="edit-desc">Description:</label><textarea id="edit-desc">'+(layers[id].desc ? layers[id].desc:'')+'</textarea></div><div class="row"><label for="edit-url">Website:</label><input type="url" id="edit-url" name="edit-url" value="'+layers[id].url+'" /></div><div class="row"><label for="edit-color">Colour:</label><input type="color" id="edit-color" name="edit-color" value="'+layers[id].colour+'" /></div></form></div><div class="right"><div class="leaflet-draw-toolbar leaflet-bar leaflet-draw-toolbar-top"><a class="leaflet-draw-draw-polyline" href="#" title="Draw a polyline"><span class="sr-only">Draw a polyline</span></a><a class="leaflet-draw-draw-polygon" href="#" title="Draw a polygon"><span class="sr-only">Draw a polygon</span></a><a class="leaflet-draw-draw-marker" href="#" title="Draw a marker"><span class="sr-only">Draw a marker</span></a></div><input id="editor-save" type="submit" value="Save" /></div></div></div>');
//				S('#saver').html('<input id="editor-save" type="submit" value="Save" />').css({'display':''});


				// Add events to elements we've just added
				this.target.find('.editor-save').on('click',{me:this,id:id},function(e){
					this.layerlookup[e.data.id].find('form').trigger('submit');
				});
				this.target.find('.edit-color').on('change',{me:this},function(e){
					layers[id].colour = e.data.me.target.find('.edit-color')[0].value;
					e.data.me.setLayerColours(id);
				});
				this.layerlookup[id].find('form').on('submit',function(e){
					e.preventDefault();
					e.stopPropagation();
					_obj.stopEditLayer();
				});
				this.target.find('.leaflet-draw-draw-polyline').on('click',{me:this},function(e){
					e.stopPropagation();
					e.preventDefault();
					drawItem(this,e.data.me,'polyline',id);
				});
				this.target.find('.leaflet-draw-draw-polygon').on('click',{me:this},function(e){
					e.stopPropagation();
					e.preventDefault();
					drawItem(this,e.data.me,'polygon',id);
				});
				this.target.find('.leaflet-draw-draw-marker').on('click',{me:this},function(e){
					e.stopPropagation();
					e.preventDefault();
					drawItem(this,e.data.me,'marker',id);
				});

				// Loop over visible layers and find out if we need to hide any
				var showmessage = false;
				for(var k in layers){
					if(this.layers[k].active && k != id && layers[k].odbl){
						//(typeof layers[k].licence==="object" ? layers[k].licence.text || layers[k].licence).toLowerCase() != "odbl"){
						showmessage = true;
						if(this.layers[k].active){
							this.hideLayer(k);
							this.temporaryhide.push(k);
						}
					}
				}
			
				if(this.target.find('.message').length > 0 && showmessage){
					this.target.find('.message').html("<button class='close'>"+this.getIcon('remove')+"</button>We've temporarily hidden some layers because of copyright. They'll reappear once you stop editing.");
					this.target.find('.message .close').on('click',function(e){ S('#message').remove(); });
					this.target.find.addClass('hasmessage');
				}
			}
			return this;
		}

		this.saveUserLayer = function(id){

			if(!id && this.editing) id = this.editing;

			this.log('saveUserLayer',id)

			if(!layers[id]) return this;

			// Now we need to load the layers
			// If the ID starts with "temporary-layer" we don't send that ID
			url = "https://www.imactivate.com/urbancommons/saveUserLayer.php?id="+(id.indexOf("temporary-layer")==0 ? "" : id)+"&name="+layers[id].name+"&desc="+(layers[id].desc ? layers[id].desc:'')+"&url="+layers[id].url+"&colour="+layers[id].colour.substr(1)+"&data="+JSON.stringify(layers[id].data);

			this.log('Saving to '+url);
			S(document).ajax(url,{
				'dataType':'jsonp',
				'this':this,
				'success':function(d){
					this.log('return is ',d);
					if(d.msg=="success"){
						// We need to re-ID the layer
						this.changeLayerID(id,d.key);
					}else{
						this.log('saveUserLayer went wrong in some way')
					}
				}
			});

			return this;
		}

		this.stopEditLayer = function(){
			if(this.editing) id = this.editing;
			this.log('stopEditLayer',id,this.editing)
			if(layers[id]){
				// Need to save
				layers[id].name = this.target.find('.edit-name')[0].value;
				layers[id].desc = this.target.find('.edit-desc')[0].value || "";
				layers[id].url = this.target.find('.edit-url')[0].value;
				layers[id].colour = this.target.find('.edit-color')[0].value;
				// Disable edit on feature
				this.layers[id].leaflet.eachLayer(function(layer) { layer.disableEdit(); });
				// Store the layer as data
				layers[id].data = this.layers[id].leaflet.toGeoJSON();
				_obj.setLayerColours(id);
				_obj.updateLayers();
				this.saveUserLayer();
				this.target.find('.layers li.edit').removeClass('edit');
				this.target.find('.editor').remove();
				this.target.find('.message').html("");
				this.target.find('.saver').html("").css({'display':'none'});
				this.target.removeClass('hasmessage');
				for(var i = 0; i < this.temporaryhide.length; i++){
					this.showLayer(this.temporaryhide[i]);
				}
				this.temporaryhide = [];
			}
			this.editing = "";
			return this;
		}

	}
	commons.icons.edit = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>edit layer</title><path style="fill:%COLOUR%;" d="M27 0c2.761 0 5 2.239 5 5 0 1.126-0.372 2.164-1 3l-2 2-7-7 2-2c0.836-0.628 1.874-1 3-1zM2 23l-2 9 9-2 18.5-18.5-7-7-18.5 18.5zM22.362 11.362l-14 14-1.724-1.724 14-14 1.724 1.724z"></path></svg>';
	commons.on('setLayerColours',function(e){
		this.log('setLayerColours',e.id,this,this.layerlookup,this.layerlookup[e.id],e.color)
		this.layerlookup[e.id].find('.edit').html(this.getIcon("edit",e.color));
	});
	commons.on('loadLayer',function(e){
		id = e.id;
		if(this.layerlookup[id] && e.layer.edit && this.layerlookup[id].find('.edit').length == 0){
			this.layerlookup[id].find('.nav').prepend('<a href="#" class="edit" title="Edit this layer">'+this.getIcon('edit',e.layer.textcolor)+'</a>');
			this.layerlookup[id].find('.edit').on('click',{id:id,me:this},function(e){
				e.stopPropagation();
				e.preventDefault();
				e.data.me.startEditLayer(e.data.id);
			});
		}
	});
	commons.init();
	commons.getUser();

	return this;
}