(function(S) {

	var layers = {};

	function DataMapper(attr){
		if(!attr) attr = {};

		this.src = ['https://www.imactivate.com/urbancommons/getLayers.php'];
		this.topicfile = "";
		this.name = "Data Mapper";
		this.version = "v0.8";
		this.title = (attr.title || this.name);

		console.log('%c'+this.name+' '+this.version+'%c','font-weight:bold;font-size:1.25em;','');

		if(attr.id) this.id = attr.id;
		if(attr.src) this.src = attr.src;
		if(attr.topics) this.topicfile = attr.topics;
		if(attr.baseMaps) this.baseMaps = attr.baseMaps;
		else this.baseMaps = {};
		this.callbacks = {};
		if(attr.callbacks) this.callbacks = attr.callbacks;

		this.visible = {};
		this.editing = "";
		this.layersloaded = false;
		this.layerstoload = [];
		this.srcloaded = 0;
		this.target = S(attr.id ? '#'+attr.id : 'body');
		this.lat = null;
		this.lon = null;
		this.d = null;
		this.mapid = "";
		this.map = null;
		this.mapel = null;
		this.layerlookup = {};
		this.events = {};
		this.logging = (location.search.indexOf("logging=true") >= 0 ? true : false);
		this.layers = {};
		this.log = new Logger({'id':this.title,'logging':this.logging});

		// Do we update the address bar?
		this.pushstate = !!(window.history && history.pushState);

		function makePopup(popup){
			if(popup && popup.indexOf("function")==0){
				try {
					popup = eval('('+popup+')');
				}catch(e){
				}
			}
			return popup;
		}



		this.init = function(){

			// Add the datamapper class to the main element
			// This will target all the CSS styles
			this.target.addClass('datamapper');
			if(this.target.find('h1').length == 1) this.target.find('h1').html(this.title);
			if(this.target.find('.version').length == 1) this.target.find('.version').html(this.version);

			if(this.target.find('.left').length == 0) this.target.append('<div class="left"></div>');
			if(this.target.find('.left .offside').length == 0){
				this.target.find('.left').before('<input type="checkbox" id="'+this.id+'_hamburger" class="offside" checked="checked" data="test" />');
				this.target.find('.left').before('<label for="'+this.id+'_hamburger" class="offside b2-bg"><span class="nv">Toggle menu (if not visible)</span><div class="chevron"></div></label>');
			}
			if(this.target.find('.left .layers').length == 0) this.target.find('.left').prepend('<menu class="panel layers"><div class="panel-inner"><button class="add-layer add">&plus; Add</button><h2>Layers</h2><ul id="layers-list"></ul></div></menu>');
			if(this.target.find('.left .map').length == 0) this.target.append('<div class="map"><div id="tooltip"></div></div>');
			if(this.target.find('.left .layer-search').length == 0) this.target.append('<div class="layer-search popup"><button class="close" title="Close"></button><div class="padded inner"><h2>Add a layer</h2><form action="/search/" method="GET"><input value="" class="b6-bg" type="submit"><input class="q" name="q" value="" type="text" placeholder="To search the layers start typing here" autocomplete="off"></form></div></div>');

			// Add events
			this.target.find('.layer-search form').on('submit',function(e){
				e.preventDefault();
			});

			// Add splash screen interaction if it exists
			if(this.target.find('.splash').length > 0){
				setTimeout(function(){ _obj.target.find('.splash').trigger('click'); },5000);
				this.target.find('h1').on('click',function(){ _obj.target.find('.splash').addClass('open').find('button').focus(); });
				this.target.find('.splash button').on('click',function(e){ _obj.target.find('.splash').removeClass('open'); });
				this.target.find('.privacy button').on('click',function(e){ _obj.target.find('.privacy').removeClass('open'); window.history.back(); });
			}

			this.target.find('.add-layer').on('click',{me:this},function(e){
				e.data.me.target.find('.layer-search').addClass('open').find('.q').focus();
				e.data.me.addTopicSearch();
				e.data.me.layerSearchResults("");
			});

			this.target.find('.layer-search .close').html(getIcon('remove')).on('click',{me:this},function(e){
				e.data.me.target.find('.layer-search').removeClass('open');
				e.data.me.target.find('.layers').focus();
			});

			this.target.find('.q').on('focus',{me:this},function(e){
				e.data.me.log.message('Focus',layers,e.data.me.target.find('.layer-search .searchresults'));
				if(e.data.me.target.find('.layer-search .searchresults').length <= 0){
					e.data.me.log.message('Here',e.data.me.target.find('.layer-search form'));
					e.data.me.target.find('.layer-search form').after('<div class="searchresults"></div>');
				}
			}).on('keyup',{me:this},function(e){
				e.preventDefault();

				if(e.originalEvent.keyCode==40 || e.originalEvent.keyCode==38){
					// Down=40
					// Up=38
					var li = e.data.me.target.find('.layer-search searchresults li');
					var s = -1;
					for(var i = 0; i < li.e.length; i++){
						if(S(li.e[i]).hasClass('selected')) s = i;
					}
					if(e.originalEvent.keyCode==40) s++;
					else s--;
					if(s < 0) s = li.e.length-1;
					if(s >= li.e.length) s = 0;
					e.data.me.target.find('.layer-search .searchresults .selected').removeClass('selected');
					S(li.e[s]).addClass('selected');
				}else if(e.originalEvent.keyCode==13){
					selectName.call(e.data.me,{'selected':e.data.me.target.find('.layer-search .searchresults .selected')});
				}else{
					// Need to load the data file for the first letter
					var name = this.e[0].value.toLowerCase();
					//var fl = name[0];
					e.data.me.layerSearchResults(name);
					//if(name == "") clearResults();
				}
			});

			// Set up the map
			this.setupMap();

			// Get the state from the hash
			if(S('.datamapper').length == 1) window[(this.pushstate) ? 'onpopstate' : 'onhashchange'] = function(e){ if(e.state){ _obj.visible = e.state.visible; } _obj.moveMap(e); };
			this.getAnchor();
			this.lat = (this.anchor && this.anchor.latitude) ? this.anchor.latitude : 53.79661;
			this.lon = (this.anchor && this.anchor.longitude) ? this.anchor.longitude : -1.53362;
			this.zoom = (this.anchor && this.anchor.zoom) ? this.anchor.zoom : 13;
			this.temporaryhide = [];

			// Set the view
			this.map.setView([this.lat, this.lon], this.zoom);

			// Add callback to the move end event
			this.map.on('moveend',function(){
				if(_obj.trackmove) _obj.updateMap();
				_obj.trackmove = true;
			});

			if(!this.layersloaded){
				for(var s = 0; s < this.src.length; s++){
					S(document).ajax(this.src[s],{
						'dataType':'json',
						'this':this,
						'cache': false,
						'url': this.src[s],
						'layers': layers,
						'popup': makePopup,
						'success':function(d,attr){
							if(typeof d=="object"){
								var l;
								for(l in d){
									if(d[l].popup) d[l].popup = attr.popup.call(this,d[l].popup);
								}
								for(l in d){
									if(d[l]){
										attr.layers[l] = d[l];
										this.layers[l] = {'active':false};
									}
								}
								this.log.message('ajax',attr.layers);

								// Increment source file loading counter
								this.srcloaded++;

								// Load any layers that now can be loaded
								this.finishLoadingLayers();
							}
						},
						'error':function(e,attr){
							this.log.error("Couldn't load "+attr.url,e);
						}
					});
				}
			}
			
			if(this.topicfile){
				S(document).ajax(this.topicfile,{
					'dataType':'json',
					'this':this,
					'cache': true,
					'url': this.topicfile,
					'success':function(d,attr){
						if(typeof d=="object"){
							this.log.message('Got topics',d);
							this.topics = d;
						}
					},
					'error':function(e,attr){
						this.log.error("Couldn't load topics from "+attr.url);
					}
				});
			}

			this.trigger('init');

			return this;
		};

		// Function to create the Leaflet map
		this.setupMap = function(){

			this.baseMaps.Default = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
				attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
				subdomains: 'abcd',
				maxZoom: 19
			});

			// Add map element if it doesn't exist
			this.mapid = this.id+'-map';
			this.mapel = this.target.find('.map');
			this.mapel.attr('id',this.mapid);
			this.lat = 53.79659;
			this.lon = -1.53385;
			this.d = 0.03;
			this.map = L.map(this.mapid,{'layers':[this.baseMaps.Default],'scrollWheelZoom':true,'zoomControl':false,'editable': true}).fitBounds([
				[this.lat-this.d, this.lon-this.d],
				[this.lat+this.d, this.lon+this.d]
			]);

			new L.Control.Zoom({ position: 'topright' }).addTo(this.map);
			if(Object.keys(this.baseMaps).length > 1){ var control = L.control.layers(this.baseMaps); control.addTo(this.map); }
			else this.baseMaps.Default.addTo(this.map);

			var _obj = this;
			this.map.on('baselayerchange',function(layer){
				if(layer.name == "National Library of Scotland") _obj.mapel.addClass('nls');
				else _obj.mapel.removeClass('nls');
			});

			// Add events for added layers
			var deleteShape = function (e) {
				if ((e.originalEvent.ctrlKey || e.originalEvent.metaKey) && this.editEnabled()) this.editor.deleteShapeAt(e.latlng);
			};
			this.map.on('layeradd', function (e) {
				if (e.layer instanceof L.Path) e.layer.on('click', L.DomEvent.stop).on('click', deleteShape, e.layer);
			});

			return this;
		};

		// Set the map view
		this.setView = function(coord,z){
			this.lat = coord[0];
			this.lon = coord[1];
			if(z) this.zoom = z;
			this.map.setView([this.lat, this.lon], this.zoom);
			return this;
		};

		// Get the anchor attributes
		this.getAnchor = function(str){
			var id,a,l,i,attr;
			if(!str) str = location.href.split("#")[1];
			if(!str) str = location.search.replace(/logging=true/,"").replace(/\&.*$/g,"").split("?")[1];
			// CHECK
			if(str && str.indexOf("\/") < 0 && S('#'+str).length == 1){
				S('#'+str).addClass('open').find('button').focus();
				return this;
			}
			a = (str) ? str.split('/') : [13,53.79659,-1.53385];
			if(!this.anchor) this.anchor = {};
			this.anchor.latitude = a[1];
			this.anchor.zoom = a[0];
			this.anchor.longitude = a[2];
			this.anchor.str = str;
			if(a[3]){
				l = a[3].split(';');
				for(i = 0; i < l.length; i++){
					attr = "";
					l[i] = l[i].replace(/\{(.*)\}$/g,function(m,p1){ attr = p1; return ""; });
					if(attr){
						if(!this.anchor.layers) this.anchor.layers = {};
						this.anchor.layers[l[i]] = this.getProps(attr);
					}
					_obj.loadLayer(l[i]);
				}
			}
			return this;
		};

		this.getProps = function(str){
			var i,p,out,pairs;
			// Define acceptable property keys
			var ok = {'colour':true,'color':true,'key':true};
			pairs = decodeURI(str).split(/\,/);
			if(typeof pairs==="string") pairs = [pairs];
			out = {'_original':str};
			for(i = 0; i < pairs.length; i++){
				p = pairs[i].split(/:/);
				// Only allow acceptable keys
				if(ok[p[0]]) out[p[0]] = p[1];
			}
			return out;
		}

		this.getPropsString = function(a){
			var str = "";
			if(this.anchor.layers && this.anchor.layers[a]){
				for(var key in this.anchor.layers[a]){
					if(key[0] != "_"){
						if(str) str += ',';
						str += key+':'+this.anchor.layers[a][key];
					}
				}
			}
			if(str) str = '{'+str+'}';
			return str;
		}

		// Work out where we are based on the anchor tag
		this.moveMap = function(e,a){
			_obj.getAnchor(a);
			if(!a){
				_obj.trackmove = false;
				this.map.setView({lon:_obj.anchor.longitude,lat:_obj.anchor.latitude},_obj.anchor.zoom);
			}else{
				if(S('.datamapper').length == 1 && _obj.pushstate) history.pushState({visible:_obj.visible},"Map","?"+_obj.anchor.str);
			}
			this.updateLayers();
			return this;
		};

		this.updateLayers = function(){
			this.log.message('updateLayers');
			var ls = this.target.find('.layers li');
			this.log.message('updateLayers',ls);
			var el,i,c,id,title;
			var credits = {};
			var attrib = "";
			for(i = 0; i < ls.length; i++){
				el = S(ls[i]);
				id = el.attr('data-id');
				this.log.message('el',el,ls,id,layers[id]);
				if(layers[id]){
					if(!this.layers[id]) this.layers[id] = {};
					this.layers[id].active = false;
					for(var a in this.visible){
						if(a==id) this.layers[id].active = true;
					}
					if(el.hasClass('deactivated') == this.layers[id].active){
						this.layers[id].active = !this.layers[id].active;
						this.toggleLayer(id);
					}
					this.log.message('layers',layers[id],this.layers[id]);

					if(this.layers[id].active) credits[getCredit(layers[id],"text")] = true;

					this.updateTitle(id);

					// Update layer properties
					if(layers[id].format && layers[id].format.keys){
						var opt = '';
						for(var k in layers[id].format.keys){
							if(typeof layers[id].format.keys[k]==="string"){
								opt += '<option value="'+layers[id].format.keys[k]+'"'+(layers[id]._attr && layers[id]._attr.key==layers[id].format.keys[k] ? ' selected="selected"':'')+'>'+layers[id].format.keys[k]+'</option>';
							}else if(typeof layers[id].format.keys[k].key==="string"){
								opt += '<option value="'+layers[id].format.keys[k].key+'"'+(layers[id]._attr && layers[id]._attr.key==layers[id].format.keys[k].key ? ' selected="selected"':'')+'>'+(layers[id].format.keys[k].title||layers[id].format.keys[k].key)+'</option>';
							}
						}
						// Add the HTML to the page
						el.find('.description .keys').html('<select>'+opt+'</select>');
						// Add an event to the <select>
						el.find('.description .keys select').on('change',{id:id,me:this},function(e){
							layers[e.data.id].format.key = e.currentTarget.value;
							e.data.me.addLayer(e.data.id);
						})
					}
					el.find('.description .padding').html((layers[id].desc || '')+(layers[id].owner == "osm" ? '<br /><br />This data set comes from Open Street Map - a map built by citizens. If something is not quite right you can help <a href="https://openstreetmap.org/edit?pk_campaign=odileeds-edit">improve the map</a>.':'')+'<p class="credit"><a href="'+(layers[id].url || "")+'">'+getCredit(layers[id])+'</a>'+makeLicenceString(layers[id])+'</p>'+(layers[id].date ? '<p>Last updated: '+layers[id].date+'</p>':''));
					el.find('.description .download').html((typeof layers[id].geojson === "string" ? '<a href="'+layers[id].geojson+'" class="button">Download (GeoJSON'+(layers[id].size ? ' '+niceSize(layers[id].size) : '')+')</a>' : ''));
					// Update color of layer
					this.setLayerColours(id);
				}
			}
			for(c in credits){
				if(credits[c]){
					if(attrib) attrib += "; ";
					attrib += c;
				}
			}
			this.log.message('ATTRIB',attrib,credits);
			if(attrib) attrib = "<strong>Data:</strong> "+attrib;
			this.map.attributionControl.setPrefix(attrib ? '<span class="AttributionClass">'+attrib+'</span>':'');


			return this;
		};

		this.updateMap = function(){
			var centre = this.map.getCenter();
			var s = "";
			var i = 0;
			for(var a in this.visible){
				if(this.visible[a]){
					if(s) s += ';';
					s += a+this.getPropsString(a);
					i++;
				}
			}
			_obj.moveMap({},this.map.getZoom()+'/'+centre.lat.toFixed(5)+'/'+centre.lng.toFixed(5)+'/'+s);
			if(i > 0) this.target.find('.nolayers').remove();
		};

		// Initial set up
		var _obj = this;

		function loadCode(url,attr,callback){
			var el;
			_obj.log.message('loadCode',url);
			if(url.indexOf(".js")>= 0){
				el = document.createElement("script");
				el.setAttribute('type',"text/javascript");
				el.src = url;
			}else if(url.indexOf(".css")>= 0){
				el = document.createElement("style");
				el.setAttribute('rel','stylesheet');
				el.setAttribute('type','text/css');
				el.setAttribute('href',url);
			}
			if(el){
				attr.url = url;
				el.onload = function(){ callback.call((attr.this||this),attr); };
				document.getElementsByTagName('head')[0].appendChild(el);
			}
		}

		// Attach a handler to an event for the Data Mapper object
		//   .on(eventType[,eventData],handler(eventObject));
		//   .on("resize",function(e){ console.log(e); });
		//   .on("resize",{me:this},function(e){ console.log(e.data.me); });
		this.on = function(ev,e,fn){
			if(typeof ev!="string") return this;
			if(typeof fn=="undefined"){ fn = e; e = {}; }
			else{ e = {data:e}; }
			if(typeof e!="object" || typeof fn!="function") return this;
			if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
			else this.events[ev] = [{e:e,fn:fn}];
			return this;
		};

		// Trigger a defined event with arguments. This is for internal-use to be 
		// sure to include the correct arguments for a particular event
		this.trigger = function(ev,args){
			if(typeof ev != "string") return;
			if(typeof args != "object") args = {};
			var o = [];
			if(typeof this.events[ev]=="object"){
				for(var i = 0 ; i < this.events[ev].length ; i++){
					var e = deepExtend({},this.events[ev][i].e,args);
					if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(this,e));
				}
			}
			if(o.length > 0) return o;
		};

		this.removeLayerData = function(id){
			if(layers[id]){
				// Set this layer to inactive
				this.layers[id].active = false;
				delete this.visible[id];
				if(this.layers[id].leaflet){
					// Remove the data
					this.layers[id].leaflet.remove();
					delete this.layers[id].leaflet;
				}
			}
			return this;
		};

		this.removeLayer = function(id){
			this.log.message('removeLayer',id);
			this.layerlookup[id].remove();
			delete this.layerlookup[id];
			this.removeLayerData(id);
			this.updateMap();
			return this;
		};

		this.updateLayerState = function(id){
			if(layers[id]){
				if(this.layerlookup[id]){
					if(this.layers[id].active) this.layerlookup[id].removeClass('deactivated').css({'color':layers[id].textcolor});
					else this.layerlookup[id].addClass('deactivated').css({'color':''});
					this.setLayerColours(id);
				}else{
					this.log.error('Unable to update layer state for '+id,this.layerlookup);
				}
			}
			return this;
		};

		this.showLayer = function(id){
			if(layers[id]){
				this.addLayer(id);
				this.updateLayerState(id);
			}
			return this;
		};

		this.hideLayer = function(id){
			this.log.message('hideLayer');
			if(layers[id]){
				this.removeLayerData(id);
				this.updateLayerState(id);
			}
			return this;
		};

		this.toggleLayer = function(id){
			if(layers[id]){
				this.layers[id].active = !this.layers[id].active;
				if(this.layers[id].active) this.showLayer(id);
				else this.hideLayer(id);
			}
			return this;
		};

		this.fitLayer = function(id){
			if(layers[id]) this.map.fitBounds(this.layers[id].leaflet.getBounds());
			return this;
		};

		this.setLayerColours = function(id){
			if(layers[id]){
				if(!layers[id].colour) layers[id].colour = '#dddddd';
				layers[id].textcolor = setHexTextColor(layers[id].colour);
				if(this.layerlookup[id] && this.layerlookup[id].length > 0){
					// Set layer properties
					this.layerlookup[id].css({'background':layers[id].colour,'color':(this.layers[id].active ? layers[id].textcolor:'')});
					// Work out the text/icon colour
					var c = getComputedStyle(this.layerlookup[id][0])['color'];
					this.layerlookup[id].find('.toggle').html((this.layers[id].active ? getIcon("hide",c):getIcon("show",c)));
					this.layerlookup[id].find('.fit').html(getIcon("fit",c));
					this.layerlookup[id].find('.info').html(getIcon("info",c));
					this.layerlookup[id].find('.remove').html(getIcon("remove",c));
					this.target.find('.saver').css({'background':layers[id].colour,'color':layers[id].textcolor,'display':'block'});
					if(this.layers[id].leaflet) this.layers[id].leaflet.setStyle({color: layers[id].colour});
				}
			}
			return this;
		};

		// Load any necessary extra js/css for clustering
		this.loadClusterCode = function(id){
			var files = ['https://odileeds.org/resources/leaflet.markercluster-src.js','https://odileeds.org/resources/L.markercluster.css','https://odileeds.org/resources/L.markercluster.default.css'];
			if(!this.extraLoaded) this.extraLoaded = {};

			for(var i = 0; i < files.length; i++){
				loadCode(files[i],{"files":files,"this":this,"id":id},function(e){
					this.log.message('loaded',e.url,e);
					this.extraLoaded[e.url] = true;
					var got = 0;
					for(var i = 0; i < e.files.length; i++){
						if(this.extraLoaded[e.files[i]]) got++;
					}
					if(got==e.files.length){
						this.clustercodeloaded = true;
						this.addLayer(e.id);
						this.updateMap();
					}
				});
			}
			return this;
		};

		this.addLayer = function(id){
			if(layers[id]){

				if(this.layers[id].leaflet){
					this.layers[id].leaflet.remove();
					delete this.layers[id].leaflet;
				}

				// Should check if this layer is huge and only markers
				// If it is we should make a cluster layer
				var needscluster = false;
				var points = 0;
				var i,v,c,marker;
				if(layers[id].data){
					for(i = 0; i < layers[id].data.features.length; i++){
						if(layers[id].data.features[i].geometry.type=="Point") points++;
					}
					if(points > 50 && points==layers[id].data.features.length) needscluster = true;
					if(needscluster){
						if(!this.clustercodeloaded){
							this.loadClusterCode(id);
							return;
						}
					}
				}

				this.log.message('Check leaflet ',id,this.layers[id]);
				if(this.layers[id].leaflet) this.removeLayerData(id);
				this.layers[id].active = true;
				this.visible[id] = true;
				this.setLayerColours(id);

				// Set a default colour
				if(!layers[id].colour) layers[id].colour = "#F9BC26";

				layers[id].originalcolour = layers[id].colour;
				layers[id]._attr = (this.anchor.layers && this.anchor.layers[id] ? this.anchor.layers[id] : {});
				if(layers[id]._attr && layers[id]._attr.colour) layers[id].colour = '#'+layers[id]._attr.colour;
				if(layers[id]._attr && layers[id]._attr.color) layers[id].colour = '#'+layers[id]._attr.color;
				
				if(this.layers[id].leaflet) this.layers[id].leaflet.remove();

				var customicon = makeMarker(layers[id].colour);
				var _obj = this;
				
				var geoattrs = {
					'style': { "color": layers[id].colour, "weight": 2, "opacity": 0.65 },
					'pointToLayer': function(geoJsonPoint, latlng){ return L.marker(latlng,{icon: customicon}); },
					'onEachFeature': function(feature, layer){
						var popup = popuptext(feature,{'id':id,'this':_obj});
						if(popup) layer.bindPopup(popup);
						layer.on('mouseover',function(e){
							if(this.feature.geometry.type=="Polygon" || this.feature.geometry.type=="MultiPolygon"){
								this.setStyle({weight:4});
								if(!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) this.bringToFront();
							}else if(this.feature.geometry.type=="Point"){
								S(e.target._icon).addClass('highlighted');
							}
						});
						layer.on('mouseout',function(e){
							if(this.feature.geometry.type=="Polygon" || this.feature.geometry.type=="MultiPolygon"){
								_obj.layers[id].leaflet.resetStyle(e.target);
							}else if(this.feature.geometry.type=="Point"){
								S(e.target._icon).removeClass('highlighted');
							}
						});
					}
				};
				// Is this a choropleth layer?
				// If it is we work out the scale and then change the style to a function
				// so we can deal with each feature seperately
				if(!layers[id].format && layers[id].data.format) layers[id].format = layers[id].data.format;
				if(layers[id].format && (layers[id].format.type == "chloropleth" || layers[id].format.type == "choropleth")){
					var min = 1e100;
					var max = -1e100;
					var key =  'VALUE';

					// Do we have a bunch of keys?
					if(layers[id].format.keys){
						// Use the first key
						key = layers[id].format.keys[0];
						// If the URL string has defined a key to use, use that.
						if(this.anchor.layers && this.anchor.layers[id].key){
							for(var k in layers[id].format.keys){
								if(typeof layers[id].format.keys[k]==="string"){
									if(layers[id].format.keys[k]==this.anchor.layers[id].key) key = this.anchor.layers[id].key;
								}else if(typeof layers[id].format.keys[k].key==="string"){
									if(layers[id].format.keys[k].key==this.anchor.layers[id].key) key = this.anchor.layers[id].key;
								}
							}
						}
					}
					// If we have explicitly set the key, use that
					if(layers[id].format.key) key = layers[id].format.key;

					layers[id]._attr.key = key;

					for(i = 0; i < layers[id].data.features.length; i++){
						if(typeof key==="string"){
							if(layers[id].data.features[i].properties[key] == parseFloat(layers[id].data.features[i].properties[key])) layers[id].data.features[i].properties[key] = parseFloat(layers[id].data.features[i].properties[key]);
							v = layers[id].data.features[i].properties[key];
						}else if(typeof key.key==="string"){
							if(layers[id].data.features[i].properties[key.key] == parseFloat(layers[id].data.features[i].properties[key.key])) layers[id].data.features[i].properties[key.key] = parseFloat(layers[id].data.features[i].properties[key.key]);
							v = layers[id].data.features[i].properties[key.key];
						}

						if(typeof layers[id]._attr.key.convert==="object"){
							if(typeof layers[id]._attr.key.convert[v]==="number") v = layers[id]._attr.key.convert[v];
						}
						if(typeof v==="number"){
							min = Math.min(v,min);
							max = Math.max(v,max);
						}
					}
					var inverse = (layers[id].format.inverse ? true : false);
					geoattrs.style = function(feature){
						if(feature.geometry.type == "Polygon" || feature.geometry.type == "MultiPolygon"){
							var val = "";
							var k = "";
							if(typeof key==="string") k = key;
							else if(typeof key.key==="string") k = key.key;
							if(typeof feature.properties[k]==="number") val = feature.properties[k];
							if(typeof feature.properties[k]==="string" && layers[id]._attr.key.convert && layers[id]._attr.key.convert[feature.properties[k]] && typeof layers[id]._attr.key.convert[feature.properties[k]]==="number") val = layers[id]._attr.key.convert[feature.properties[k]];
							if(typeof val==="number"){
								var f = (val-min)/(max-min);
								if(inverse) f = 1-f;
								v = (f*0.6 + 0.2);
							}
							return { "color": layers[id].colour, "weight": 0.5, "opacity": 0.65,"fillOpacity": v };
						}else return { "color": layers[id].colour, "stroke": layers[id].colour };
					};
				}
				if(layers[id].data){
					if(!layers[id].data.crs && layers[id].data.features[0].geometry.coordinates[0] > 300000 && layers[id].data.features[0].geometry.coordinates[1] > 300000){
						// Fake the CRS if the coordinates look like Easting/Northings
						layers[id].data.crs = {'properties':{'name':'EPSG:27700'}};
					}
					if(layers[id].data.crs){
						if(layers[id].data.crs.properties && layers[id].data.crs.properties.name=="EPSG:27700"){
							geoattrs.coordsToLatLng = OSGridToLatLon;
							this.log.info('Add conversion from OSGrid');
						}
					}
				}
				if(needscluster){
					// Define a cluster layer
					this.layers[id].leaflet = L.markerClusterGroup({
						chunkedLoading: true,
						maxClusterRadius: 70,
						iconCreateFunction: function (cluster) {
							var markers = cluster.getAllChildMarkers();
							return L.divIcon({ html: '<div class="marker-group" style="background-color:'+layers[id].colour+';color:'+layers[id].textcolor+'">'+markers.length+'</div>', className: '',iconSize: L.point(40, 40) });
						},
						// Disable all of the defaults:
						spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true
					});
					// Build marker list
					var markerList = [];
					for(i = 0; i < layers[id].data.features.length; i++){
						c = layers[id].data.features[i].geometry.coordinates;
						marker = L.marker([c[1],c[0]],{icon: customicon});
						marker.bindPopup(popuptext(layers[id].data.features[i],{'zoom':this.zoom,'id':id,'this':this}));
						markerList.push(marker);
					}

					// Add marker list to layer
					this.layers[id].leaflet.addLayers(markerList);
				}else{
					this.layers[id].leaflet = L.geoJSON(layers[id].data,geoattrs);
				}
				this.layers[id].leaflet.addTo(this.map);

				this.updateTitle(id);
			}
			return this;
		}
		this.updateTitle = function(id){
			title = layers[id] ? layers[id].name||id : id;
			if(layers[id]._attr && layers[id]._attr.key) title += ': '+(typeof layers[id]._attr.key==="string" ? layers[id]._attr.key : (layers[id]._attr.key.title||layers[id]._attr.key.key));

			// Update layer properties
			this.layerlookup[id].find('.heading').html(title);

		}

		var tooltip = L.DomUtil.get('tooltip');
		function addTooltip (e) {
			L.DomEvent.on(document, 'mousemove', moveTooltip);
			var h = "Click on the map to start a "+_obj.drawingtype+".";
			if(_obj.drawingtype == "marker") h = "Click on the map to add a marker";
			tooltip.innerHTML = h;
			tooltip.style.display = 'block';
		}
		function removeTooltip (e) {
			tooltip.innerHTML = '';
			tooltip.style.display = 'none';
			L.DomEvent.off(document, 'mousemove', moveTooltip);
		}
		function moveTooltip (e) {
			tooltip.style.left = e.clientX + 20 + 'px';
			tooltip.style.top = e.clientY - 10 + 'px';
		}
		function updateTooltip (e) {
			tooltip.innerHTML = (_obj.drawingtype=="marker" ? "" : (e.layer.editor._drawnLatLngs.length < e.layer.editor.MIN_VERTEX ? 'Click on the map to continue '+_obj.drawingtype+'.': 'Click on last point to finish '+_obj.drawingtype+'.'));
		}

		this.changeLayerID = function(id,id2){
			this.log.message('changeLayerID',id,id2);
			if(id==id2){
				this.log.message('No need to change name');
				return this;
			}
			if(layers[id]){
				if(!layers[id2]){
					layers[id2] = layers[id];
					delete layers[id];
					this.layers[id2] = this.layers[id];
					delete this.layers[id];
					this.visible[id2] = this.visible[id];
					delete this.visible[id];
					// Update the ID of the layer in the list
					//BLAHthis.layerlookup[id].attr('id',id2);
				}else{
					this.log.warning('A layer with the ID '+id2+' already exists. Cowardly refusing to re-ID '+id);
				}
			}else{
				this.log.warning('No layer '+id+' to re-ID');
			}
			return this;
		};

		this.finishLoadingLayers = function(){
			this.log.message('finishLoadingLayers',this,this.layerstoload,this.src.length,this.srcloaded);
			if(this.src.length > 0 && this.srcloaded < this.src.length) return;
			if(layers){
				this.layersloaded = true;
				for(var i = this.layerstoload.length-1; i >= 0; i--){
					this.log.message('loadLayer',i,this.layerstoload[i]);
					this.loadLayer(this.layerstoload[i]);
					this.layerstoload.pop();
				}
			}
			return this;
		};

		function getCredit(l,t){
			var str = "";
			if(!t) t = "text";
			if(!l.credit) return "";
			if(typeof l.credit==="string"){
				if(t=="text") str = l.credit;
				else str = l.credit.replace(/\&copy; /,"");
			}else if(typeof l.credit==="object"){
				if(t=="text") str = l.credit.text;
				else str = l.credit.src;
			}
			return str;
		}
		
		function makeLicenceString(l){
			var str = "";
			if(typeof l.licence==="string") str = " (" + l.licence.replace(/\(([^\)]*)\)/,function(m,p1){ return " "+p1; }) + ")";
			else if(typeof l.licence==="object") str = " ("+(l.licence.url ? '<a href="'+l.licence.url+'">':'')+l.licence.text+(l.licence.url ? '</a>':'')+")";
			return str;
		}

		function deepExtend(out) {
			out = out || {};
			for (var i = 1; i < arguments.length; i++) {
				var obj = arguments[i];
				if (!obj) continue;
				for (var key in obj) {
					if (obj.hasOwnProperty(key)) {
						if (typeof obj[key] === 'object') out[key] = deepExtend(out[key], obj[key]);
						else out[key] = obj[key];
					}
				}
			}
			return out;
		}

		this.loadLayerData = function(id){
			this.log.message('loadLayerData',id);
			if(!layers[id]) return this;

			if(!layers[id].metadata) return this;

			// Store the metadata location in a different attribute
			// so we can know if we need to load it still
			layers[id]._metadata = layers[id].metadata;
			delete layers[id].metadata;

			S(document).ajax(layers[id]._metadata,{
				'dataType':'json',
				'this':this,
				'id':id,
				'cache': false,
				'success':function(d,attr){
					var layer = deepExtend({}, layers[attr.id], d);
					layers[attr.id] = layer;
					if(layers[attr.id].popup) layers[attr.id].popup = makePopup(layers[attr.id].popup);
					this.loadLayer(attr.id);
				}
			});
			return this;
		};

		this.loadLayer = function(id,attr){
			if(!this.layersloaded){ this.layerstoload.push(id); return; }
			if(!layers[id]){ layers[id] = {}; }
			if(!this.layers[id]){ this.layers[id] = {'active':false}; }
			if(layers[id].metadata) return this.loadLayerData(id);
			if(!this.layers[id].active){
				// Update color of layer
				this.setLayerColours(id);
				if(!this.layerlookup) this.layerlookup = {};
				this.log.message('loadLayer',id,this.layerlookup[id],layers,this.layers);
				if(!this.layerlookup[id]){
					var el = document.createElement('li');
					el.setAttribute('class','loading');
					el.setAttribute('data-id',id);
					el.innerHTML = '<a href="#" class="heading padding" tabindex="0">'+(layers[id] ? layers[id].name||id : id)+'<span class="loading">| loading...</span></a><div class="nav padding">'+(layers[id].edit ? '<a href="#" class="edit" title="Edit this layer">'+getIcon('edit',layers[id].textcolor)+'</a>':'')+'<a href="#" class="info" title="Show information about this layer">'+getIcon('info',layers[id].textcolor)+'</a><a href="#" class="fit" title="Change the map view to fit this layer">'+getIcon('fit',layers[id].textcolor)+'</a><a href="#" class="toggle" title="Toggle layer visibility">'+getIcon('hide',layers[id].textcolor)+'</a>'+'<a href="#" class="remove" title="Remove this layer">'+getIcon('remove',layers[id].textcolor)+'</a></div><div class="description"><div class="keys"></div><div class="padding">'+(layers[id].desc ? layers[id].desc:'')+'<p class="credit"><a href="'+layers[id].url+'">'+getCredit(layers[id])+'</a>'+makeLicenceString(layers[id])+'</p></div><div class="download"></div></div>';
					this.layerlookup[id] = S(this.target.find('.layers ul')[0].appendChild(el));

					this.log.message('layerlookup',JSON.parse(JSON.stringify(this.layerlookup)));
					//this.target.find('.layers ul').append('<li id="'+id+'" class="loading"><a href="#" class="heading padding" tabindex="0">'+(layers[id] ? layers[id].name||id : id)+'<span class="loading">| loading...</span></a><div class="nav padding">'+(layers[id].edit ? '<a href="#" class="edit" title="Edit this layer">'+getIcon('edit',layers[id].textcolor)+'</a>':'')+'<a href="#" class="info" title="Show information about this layer">'+getIcon('info',layers[id].textcolor)+'</a><a href="#" class="fit" title="Change the map view to fit this layer">'+getIcon('fit',layers[id].textcolor)+'</a><a href="#" class="toggle" title="Toggle layer visibility">'+getIcon('hide',layers[id].textcolor)+'</a>'+'<a href="#" class="remove" title="Remove this layer">'+getIcon('remove',layers[id].textcolor)+'</a></div><div class="description"><div class="padding">'+(layers[id].desc ? layers[id].desc:'')+'<p class="credit"><a href="'+layers[id].url+'">'+getCredit(layers[id])+'</a>'+makeLicenceString(layers[id])+'</p></div><div class="download"></div></div></li>');
					// Show/hide the layer menu
					this.layerlookup[id].find('.heading').on('focus',function(e){
						S('#layers .focus').removeClass('focus');
						S(e.currentTarget.parentElement).addClass('focus');
					}).on('mouseover',function(e){
						S('#layers .focus').removeClass('focus');
						S(e.currentTarget.parentElement).addClass('focus');
					}).on('click',{id:id},function(e){
						e.stopPropagation();
						e.preventDefault();
						if(_obj.editing == e.data.id) _obj.stopEditLayer();
						S(e.currentTarget.parentElement).toggleClass('open').removeClass('edit');
					});

					this.layerlookup[id].find('.info').on('click',{me:this,id:id},function(e){
						e.stopPropagation();
						e.preventDefault();
						e.data.me.layerlookup[e.data.id].find('.heading').trigger('click');
					});

					this.layerlookup[id].find('.nav').on('mouseover',{me:this},function(e){
						e.data.me.target.find('.layers .focus').removeClass('focus');
						S(e.currentTarget.parentElement).addClass('focus');
					});

					this.target.find('.layers').on('mouseout',{me:this},function(e){
						e.data.me.target.find('.layers .focus').removeClass('focus');
					});

					this.layerlookup[id].find('.remove').on('click',{id:id},function(e){
						e.stopPropagation();
						e.preventDefault();
						_obj.removeLayer(e.data.id);
					});
					this.layerlookup[id].find('.edit').on('click',{id:id},function(e){
						e.stopPropagation();
						e.preventDefault();
						_obj.startEditLayer(e.data.id);
					});
					this.layerlookup[id].find('.toggle').on('click',{id:id},function(e){
						e.stopPropagation();
						e.preventDefault();
						_obj.toggleLayer(e.data.id);
						_obj.updateMap();
					});
					this.layerlookup[id].find('.fit').on('click',{id:id},function(e){
						e.stopPropagation();
						e.preventDefault();
						_obj.fitLayer(e.data.id);
					});
				}
				this.log.message('loadLayer2',id,this.layerlookup);
				if(typeof layers[id].geojson==="object"){
					this.layerlookup[id].removeClass('loading').find('.loading').remove();
					if(layers[id]){
						layers[id].data = layers[id].geojson;
						this.addLayer(id);
						_obj.updateMap();
					}
				}else if(typeof layers[id].geojson === "string"){
					S(document).ajax(layers[id].geojson,{
						'id':id,
						'dataType':'json',
						'loader':this.layerlookup[id].find('.loading'),
						'beforeSend': function(XMLHttpRequest,attr){
							//Download progress
							XMLHttpRequest.addEventListener("progress", function(evt){
								if(evt.lengthComputable){
									var pc = (100 * evt.loaded / evt.total).toFixed(1);
									var a = layers[attr.id].colour || '#dddddd';
									_obj.layerlookup[attr.id].css({'background':'linear-gradient(90deg,'+a+' 0%, '+a+' '+pc+'%, white '+pc+'%)'});
									attr.loader.html(': '+pc+'%');
								}
							}, false);
							return XMLHttpRequest;
						},
						'success': function(data,attr){

							_obj.layerlookup[attr.id].removeClass('loading').find('.loading').remove();
							if(layers[attr.id]){
								layers[attr.id].data = data;
								_obj.addLayer(attr.id);
								_obj.updateMap();
							}
							// Once we have successfully got the GeoJSON we call the callback
							if(typeof _obj.callbacks.layerload==="function") _obj.callbacks.layerload.call(_obj,{'id':attr.id,'layer':layers[attr.id]});
						},
						'error': function(e){ _obj.layerlookup[id].find('.loading').html('(failed to load)'); }
					});
				}else{
					this.layerlookup[id].removeClass('loading').find('.loading').html('');
				}
			}
			return this;
		};

		this.addTopicSearch = function(){
			// Make topics
			if(typeof this.topics==="object" && this.target.find('.layer-search .topics').length < 1){
				this.target.find('.layer-search form').before('<ul class="topics"></ul>');
				var ul = "";
				var i;
				// Temporary hack while format changing
				if(typeof this.topics.length==="undefined"){
					var temp = JSON.parse(JSON.stringify(this.topics));
					this.topics = [];
					for(i in temp) this.topics.push({'title':i,'icon':temp[i]});
				}
				for(i = 0 ; i < this.topics.length; i++) ul += '<li data="'+i+'" class="" title="Topic: '+this.topics[i].title+'"><a href="#" style="'+(this.topics[i].colour ? 'color:'+setHexTextColor(this.topics[i].colour)+';' : '')+(this.topics[i].colour ? 'background-color:'+this.topics[i].colour+';' : '')+'"><img src="'+this.topics[i].icon+'" alt="Icon for '+this.topics[i].title+'" /><br />'+this.topics[i].title+'</a></li>';
				if(ul) this.target.find('.topics').html(ul);
				else this.target.find('.topics').remove();
				S('.topics li a').on('click',{me:this},function(e){
					var el = S(e.currentTarget);
					var inactive = e.data.me.target.find('.inactive').length;
					if(el.parent().hasClass('active')){
						// This topic is currently the only active one so we select all
						el.parent().removeClass('active');
						this.parent().removeClass('inactive');
						e.data.me.topic = -1;
					}else{
						// We want to select only this topic
						this.parent().addClass('inactive');
						el.parent().addClass('active').removeClass('inactive');
						e.data.me.topic = parseInt(S(e.currentTarget).parent().attr('data'));
					}
					e.data.me.layerSearchResults((e.data.me.searchstring||""));
				});
			}

			return this;
		};
		
		this.layerSearchResults = function(name){
			var html = "";
			var tmp = [];
			var i,k,idx,dist,n,ok,t;
			this.log.message('layerSearchResults',name,this.topic);
			this.searchstring = name;

			if(this.target.find('.layer-search .searchresults').length < 1) this.target.find('.layer-search form').after('<div class="searchresults"></div>');

			if(typeof name==="string"){
				name = name.toLowerCase();
				var lat = parseFloat(this.anchor.latitude);
				var lon = parseFloat(this.anchor.longitude);
				var p = L.latLng(lat,lon);

				// Loop over layers and work out a ranking
				for(i in layers){
					if(layers[i]){
						dist = 100000;
						ok = true;
						// Create an empty rank for this layer
						if(layers[i].name){

							this.layers[i].rank = 0;

							// Do we have a topic?
							if(this.topic >= 0){
								ok = false;
								if(typeof layers[i].topics!=="undefined"){
									for(t in layers[i].topics){
										if(layers[i].topics[t] == this.topics[this.topic].title){
											ok = true;
											this.layers[i].rank = 1;
										}
									}
								}
							}

							if(ok){
								this.layers[i].rank = 0;
								idx = layers[i].name.toLowerCase().indexOf(name);
								if(idx >= 0 && !this.layers[i].active){
									if(idx==0) this.layers[i].rank += 10;
									this.layers[i].rank += 1/(Math.abs(layers[i].name.length-name.length)+1);
								}
								if(layers[i].desc){
									idx = layers[i].desc.toLowerCase().indexOf(name);
									if(idx >= 0 && !this.layers[i].active) this.layers[i].rank++;
								}
								if(layers[i].credit && layers[i].credit.src){
									idx = layers[i].credit.src.toLowerCase().indexOf(name);
									if(idx >= 0 && !this.layers[i].active) this.layers[i].rank++;
								}
								if(layers[i].keywords){
									var kw = layers[i].keywords.split(/,/);
									for(k = 0; k < kw.length; k++){
										idx = kw[k].toLowerCase().indexOf(name);
										if(idx >= 0 && !this.layers[i].active) this.layers[i].rank++;
									}
								}
								this.layers[i].id = i;
							}
							if(ok){
								if(this.layers[i].rank > 0){
									if(layers[i].centre && layers[i].centre.length == 2){
										// Calculate the distance
										try {
											dist = p.distanceTo(layers[i].centre)/1000;
										}catch (err){

										}
										this.layers[i].rank += Math.min(10,10/dist);
									}
									tmp.push(this.layers[i]);
								}
							}
						}
					}
				}
				tmp = sortBy(tmp,'rank');
				n = tmp.length;
			}else{

				// Loop over layers and work out a ranking
				for(i in layers){
					if(layers[i].name && !this.layers[i].active){
						this.layers[i].id = i;
						this.layers[i].namelc = layers[i].name.toLowerCase();
						tmp.push(this.layers[i]);
					}
				}
				tmp = sortBy(tmp,'namelc',true);
				n = tmp.length;
			}
			if(tmp.length > 0){
				this.target.find('.layer-search .searchresults li').off('click');
				html = "<ol>";
				var l,tcredit;
				for(i = 0; i < n; i++){
					l = layers[tmp[i].id];
					tcredit = getCredit(l,"src");
					html += '<li data-id="'+tmp[i].id+'" '+(i==0 ? ' class="selected"':'')+'><a href="#" class="padding name">'+l.name+(tcredit ? ' ('+tcredit+(l.size ? '; '+niceSize(l.size):'')+')' : '')+'</a></li>';
				}
				html += "</ol>";
			}
			this.target.find('.layer-search .searchresults').html(html);
			var li = this.target.find('.layer-search .searchresults li a');
			for(i = 0 ; i < li.e.length ; i++){
				S(li.e[i]).on('click',{"callback":selectName,"me":this},function(e){
					e.preventDefault();
					e.data.callback.call(e.data.me,{'selected':this.parent()});
				});
			}

			return this;
		};

		function getIcon(icon,colour){
			var icons = {
				'hide':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>hide layer</title><path style="fill:%COLOUR%;" d="M16 6c-6.979 0-13.028 4.064-16 10 2.972 5.936 9.021 10 16 10s13.027-4.064 16-10c-2.972-5.936-9.021-10-16-10zM23.889 11.303c1.88 1.199 3.473 2.805 4.67 4.697-1.197 1.891-2.79 3.498-4.67 4.697-2.362 1.507-5.090 2.303-7.889 2.303s-5.527-0.796-7.889-2.303c-1.88-1.199-3.473-2.805-4.67-4.697 1.197-1.891 2.79-3.498 4.67-4.697 0.122-0.078 0.246-0.154 0.371-0.228-0.311 0.854-0.482 1.776-0.482 2.737 0 4.418 3.582 8 8 8s8-3.582 8-8c0-0.962-0.17-1.883-0.482-2.737 0.124 0.074 0.248 0.15 0.371 0.228v0zM16 13c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"></path></svg>',
				'show':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>show layer</title><path style="fill:%COLOUR%;" d="M29.561 0.439c-0.586-0.586-1.535-0.586-2.121 0l-6.318 6.318c-1.623-0.492-3.342-0.757-5.122-0.757-6.979 0-13.028 4.064-16 10 1.285 2.566 3.145 4.782 5.407 6.472l-4.968 4.968c-0.586 0.586-0.586 1.535 0 2.121 0.293 0.293 0.677 0.439 1.061 0.439s0.768-0.146 1.061-0.439l27-27c0.586-0.586 0.586-1.536 0-2.121zM13 10c1.32 0 2.44 0.853 2.841 2.037l-3.804 3.804c-1.184-0.401-2.037-1.521-2.037-2.841 0-1.657 1.343-3 3-3zM3.441 16c1.197-1.891 2.79-3.498 4.67-4.697 0.122-0.078 0.246-0.154 0.371-0.228-0.311 0.854-0.482 1.776-0.482 2.737 0 1.715 0.54 3.304 1.459 4.607l-1.904 1.904c-1.639-1.151-3.038-2.621-4.114-4.323z"></path><path style="fill:%COLOUR%;" d="M24 13.813c0-0.849-0.133-1.667-0.378-2.434l-10.056 10.056c0.768 0.245 1.586 0.378 2.435 0.378 4.418 0 8-3.582 8-8z"></path><path style="fill:%COLOUR%;" d="M25.938 9.062l-2.168 2.168c0.040 0.025 0.079 0.049 0.118 0.074 1.88 1.199 3.473 2.805 4.67 4.697-1.197 1.891-2.79 3.498-4.67 4.697-2.362 1.507-5.090 2.303-7.889 2.303-1.208 0-2.403-0.149-3.561-0.439l-2.403 2.403c1.866 0.671 3.873 1.036 5.964 1.036 6.978 0 13.027-4.064 16-10-1.407-2.81-3.504-5.2-6.062-6.938z"></path></svg>',
				'remove':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>remove layer</title><path style="fill:%COLOUR%;" d="M31.708 25.708c-0-0-0-0-0-0l-9.708-9.708 9.708-9.708c0-0 0-0 0-0 0.105-0.105 0.18-0.227 0.229-0.357 0.133-0.356 0.057-0.771-0.229-1.057l-4.586-4.586c-0.286-0.286-0.702-0.361-1.057-0.229-0.13 0.048-0.252 0.124-0.357 0.228 0 0-0 0-0 0l-9.708 9.708-9.708-9.708c-0-0-0-0-0-0-0.105-0.104-0.227-0.18-0.357-0.228-0.356-0.133-0.771-0.057-1.057 0.229l-4.586 4.586c-0.286 0.286-0.361 0.702-0.229 1.057 0.049 0.13 0.124 0.252 0.229 0.357 0 0 0 0 0 0l9.708 9.708-9.708 9.708c-0 0-0 0-0 0-0.104 0.105-0.18 0.227-0.229 0.357-0.133 0.355-0.057 0.771 0.229 1.057l4.586 4.586c0.286 0.286 0.702 0.361 1.057 0.229 0.13-0.049 0.252-0.124 0.357-0.229 0-0 0-0 0-0l9.708-9.708 9.708 9.708c0 0 0 0 0 0 0.105 0.105 0.227 0.18 0.357 0.229 0.356 0.133 0.771 0.057 1.057-0.229l4.586-4.586c0.286-0.286 0.362-0.702 0.229-1.057-0.049-0.13-0.124-0.252-0.229-0.357z"></path></svg>',
				'edit':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>edit layer</title><path style="fill:%COLOUR%;" d="M27 0c2.761 0 5 2.239 5 5 0 1.126-0.372 2.164-1 3l-2 2-7-7 2-2c0.836-0.628 1.874-1 3-1zM2 23l-2 9 9-2 18.5-18.5-7-7-18.5 18.5zM22.362 11.362l-14 14-1.724-1.724 14-14 1.724 1.724z"></path></svg>',
				'add':'<svg version="1.1" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="32" height="32" viewBox="0 0 32 32" sodipodi:docname="add.svg"><defs id="defs10" /><sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="1160" inkscape:window-height="719" id="namedview8" showgrid="false" inkscape:zoom="7.375" inkscape:cx="16" inkscape:cy="16" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="0" inkscape:current-layer="svg2" /><title id="title4">add layer</title><path style="fill:#000000" d="m 20.243,30.989 0,0 0,-10.746 10.746,0 0,0 c 0.148,0 0.288,-0.03 0.414,-0.09 0.346,-0.158 0.586,-0.505 0.586,-0.909 l 0,-6.486 c 0,-0.404 -0.241,-0.751 -0.586,-0.909 -0.126,-0.06 -0.266,-0.09 -0.413,-0.09 l 0,0 -10.747,0 0,-10.78035 0,0 c 0,-0.1478 -0.03,-0.2878 -0.09,-0.4137 -0.158,-0.3458 -0.505,-0.5855 -0.909,-0.5855 l -6.486,0 c -0.404,0 -0.751,0.2411 -0.909,0.5855 -0.06,0.1266 -0.09,0.2659 -0.09,0.4144 l 0,0 0,10.77965 -10.7457,0 0,0 c -0.14785,10e-4 -0.28785,0.03 -0.41445,0.09 -0.3451,0.157 -0.5855,0.505 -0.5855,0.909 l 0,6.486 c 0,0.404 0.2411,0.751 0.5855,0.909 0.1266,0.06 0.2659,0.09 0.41445,0.09 l 0,0 10.7457,0 0,10.746 0,0 c 0,0.148 0.03,0.288 0.09,0.414 0.158,0.346 0.505,0.586 0.909,0.586 l 6.486,0 c 0.404,0 0.752,-0.241 0.909,-0.586 0.06,-0.126 0.09,-0.266 0.09,-0.414 z" id="path6" inkscape:connector-curvature="0" sodipodi:nodetypes="ccccccsscccccccsscccccccsscccccccsscc" /></svg>',
				'info':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOUR%" d="M 16 0 A 16 16 0 0 0 0 16 A 16 16 0 0 0 16 32 A 16 16 0 0 0 32 16 A 16 16 0 0 0 16 0 z M 17.087891 5.4433594 C 17.405707 5.4433594 17.696853 5.483046 17.955078 5.5625 C 18.223235 5.641954 18.451922 5.7610139 18.640625 5.9199219 C 18.829328 6.0788298 18.970994 6.2715698 19.070312 6.5 C 19.179566 6.7284301 19.236328 6.9911102 19.236328 7.2890625 C 19.236328 7.6068785 19.179565 7.8960715 19.070312 8.1542969 C 18.961062 8.4025907 18.813703 8.6161505 18.625 8.7949219 C 18.436297 8.9637616 18.20761 9.0979486 17.939453 9.1972656 C 17.681227 9.2866511 17.395775 9.3300781 17.087891 9.3300781 C 16.809803 9.3300781 16.549076 9.2866516 16.300781 9.1972656 C 16.052488 9.1078798 15.833234 8.9831268 15.644531 8.8242188 C 15.455828 8.6553791 15.300822 8.4569458 15.181641 8.2285156 C 15.072389 7.9901537 15.019531 7.7217806 15.019531 7.4238281 C 15.019531 7.1060122 15.072387 6.8282057 15.181641 6.5898438 C 15.300822 6.3415501 15.455828 6.1336835 15.644531 5.9648438 C 15.833234 5.7960041 16.052488 5.6655579 16.300781 5.5761719 C 16.549076 5.4867855 16.809803 5.4433594 17.087891 5.4433594 z M 18.609375 9.9902344 L 16.402344 20.076172 C 16.392444 20.135762 16.367855 20.24913 16.328125 20.417969 C 16.298334 20.576877 16.258644 20.765876 16.208984 20.984375 C 16.169259 21.202874 16.123879 21.437253 16.074219 21.685547 C 16.024563 21.933841 15.979183 22.166268 15.939453 22.384766 C 15.899727 22.603265 15.865728 22.797958 15.835938 22.966797 C 15.806148 23.135637 15.791016 23.249004 15.791016 23.308594 C 15.791016 23.447639 15.815574 23.59695 15.865234 23.755859 C 15.914894 23.904834 15.994268 24.039022 16.103516 24.158203 C 16.222697 24.277385 16.377703 24.377581 16.566406 24.457031 C 16.765041 24.536491 17.012595 24.576172 17.310547 24.576172 C 17.399937 24.576172 17.515253 24.564812 17.654297 24.544922 C 17.793342 24.525052 17.940701 24.496761 18.099609 24.457031 C 18.258517 24.417305 18.428651 24.371926 18.607422 24.322266 C 18.786193 24.272606 18.960066 24.212098 19.128906 24.142578 L 19.619141 24.142578 L 19.619141 25.439453 C 19.241735 25.657953 18.844867 25.841259 18.427734 25.990234 C 18.020532 26.129279 17.617973 26.238909 17.220703 26.318359 C 16.833364 26.407753 16.466753 26.466294 16.119141 26.496094 C 15.77153 26.535824 15.469162 26.556641 15.210938 26.556641 C 14.764009 26.556641 14.380315 26.482959 14.0625 26.333984 C 13.744684 26.185009 13.482005 25.999749 13.273438 25.78125 C 13.074803 25.552821 12.925492 25.31096 12.826172 25.052734 C 12.726854 24.784577 12.677734 24.535071 12.677734 24.306641 C 12.677734 24.028553 12.71173 23.705366 12.78125 23.337891 C 12.86071 22.970416 12.945766 22.564115 13.035156 22.117188 L 14.912109 13.580078 C 14.961773 13.37151 14.942906 13.209025 14.853516 13.089844 C 14.764126 12.970663 14.631896 12.870466 14.453125 12.791016 L 12.380859 11.867188 L 12.380859 10.839844 L 18.609375 9.9902344 z " /></svg>',
				'fit':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOUR%" d="M 0,12 L0,0 12,0 12,4 6,4 12,10 10,12 4,6 4,12 M20,0 L 32,0 32,12 28,12 28,6 22,12 20,10 26,4 20,4 20,0 M 20,32 L20,28 26,28 20,22 22,20 28,26 28,20 32,20, 32,32 20,32 M 12,32 L 0,32 0,20 4,20 4,26 10,20 12,22 6,28 12,28 12,32" /></svg>'

			};
			return icons[icon].replace(/%COLOUR%/g,(colour||"black"));
		}
		
		// Sort the data
		function sortBy(arr,i,rev){
			var order = 1;
			if(typeof rev==="boolean") order = (rev ? -1 : 1); 
			return arr.sort(function (a, b) {
				return a[i] < b[i] ? order : -order;
			});
		}

		return this;
	}


	// adapted from http://www.dorcus.co.uk/carabus/ngr_ll.html
	function OSGridToLatLon(coo) {
		var coord = new GridRef(coo[0],coo[1]);
		var ll = coord.latlon();
		return L.latLng(ll[0],ll[1]);
	}
	function NEtoLL(coo) {
		var east = coo[0];
		var north = coo[1];
		// converts NGR easting and nothing to lat, lon.
		// input metres, output radians
		//var nX = Number(north);
		//var eX = Number(east);
		var a = 6377563.396; // OSGB semi-major
		var b = 6356256.91; // OSGB semi-minor
		var e0 = 400000; // OSGB easting of false origin
		var n0 = -100000; // OSGB northing of false origin
		var f0 = 0.9996012717; // OSGB scale factor on central meridian
		var e2 = 0.0066705397616; // OSGB eccentricity squared
		var lam0 = -0.034906585039886591; // OSGB false east
		var phi0 = 0.85521133347722145; // OSGB false north
		var af0 = a * f0;
		var bf0 = b * f0;
		var n = (af0 - bf0) / (af0 + bf0);
		var Et = east - e0;
		var phid = InitialLat(north, n0, af0, phi0, n, bf0);
		var nu = af0 / (Math.sqrt(1 - (e2 * (Math.sin(phid) * Math.sin(phid)))));
		var rho = (nu * (1 - e2)) / (1 - (e2 * (Math.sin(phid)) * (Math.sin(phid))));
		var eta2 = (nu / rho) - 1;
		var tlat2 = Math.tan(phid) * Math.tan(phid);
		var tlat4 = Math.pow(Math.tan(phid), 4);
		var tlat6 = Math.pow(Math.tan(phid), 6);
		var clatm1 = Math.pow(Math.cos(phid), -1);
		var VII = Math.tan(phid) / (2 * rho * nu);
		var VIII = (Math.tan(phid) / (24 * rho * (nu * nu * nu))) * (5 + (3 * tlat2) + eta2 - (9 * eta2 * tlat2));
		var IX = ((Math.tan(phid)) / (720 * rho * Math.pow(nu, 5))) * (61 + (90 * tlat2) + (45 * Math.pow(Math.tan(phid), 4)));
		var phip = (phid - ((Et * Et) * VII) + (Math.pow(Et, 4) * VIII) - (Math.pow(Et, 6) * IX));
		var X = Math.pow(Math.cos(phid), -1) / nu;
		var XI = (clatm1 / (6 * (nu * nu * nu))) * ((nu / rho) + (2 * (tlat2)));
		var XII = (clatm1 / (120 * Math.pow(nu, 5))) * (5 + (28 * tlat2) + (24 * tlat4));
		var XIIA = clatm1 / (5040 * Math.pow(nu, 7)) * (61 + (662 * tlat2) + (1320 * tlat4) + (720 * tlat6));
		var lambdap = (lam0 + (Et * X) - ((Et * Et * Et) * XI) + (Math.pow(Et, 5) * XII) - (Math.pow(Et, 7) * XIIA));
		return L.latLng(phip * 180 / Math.PI, lambdap * 180 / Math.PI);
	}

	function Marc(bf0, n, phi0, phi) {
		var Marc = bf0 * (((1 + n + ((5 / 4) * (n * n)) + ((5 / 4) * (n * n * n))) * (phi - phi0)) - (((3 * n) + (3 * (n * n)) + ((21 / 8) * (n * n * n))) * (Math.sin(phi - phi0)) * (Math.cos(phi + phi0))) + ((((15 / 8) * (n * n)) + ((15 / 8) * (n * n * n))) * (Math.sin(2 * (phi - phi0))) * (Math.cos(2 * (phi + phi0)))) - (((35 / 24) * (n * n * n)) * (Math.sin(3 * (phi - phi0))) * (Math.cos(3 * (phi + phi0)))));
		return (Marc);
	}

	function InitialLat(north, n0, af0, phi0, n, bf0) {
		var phi1 = ((north - n0) / af0) + phi0;
		var M = Marc(bf0, n, phi0, phi1);
		var phi2 = ((north - n0 - M) / af0) + phi1;
		var ind = 0;
		while ((Math.abs(north - n0 - M) > 0.00001) && (ind < 20)) // max 20 iterations in case of error
		{
			ind = ind + 1;
			phi2 = ((north - n0 - M) / af0) + phi1;
			M = Marc(bf0, n, phi0, phi2);
			phi1 = phi2;
		}
		return (phi2);
	}


	function niceSize(b){
		if(b > 1e12) return (b/1e12).toFixed(1)+" TB";
		if(b > 1e9) return (b/1e9).toFixed(1)+" GB";
		if(b > 1e6) return (b/1e6).toFixed(1)+" MB";
		if(b > 1e3) return (b/1e3).toFixed(1)+" kB";
		return (b)+" bytes";
	}
	
	function setHexTextColor(hex){
		var L1 = getL(hex);
		var Lb = getL('#000000');
		var Lw = getL('#ffffff');
		var rb = (Math.max(L1, Lb) + 0.05) / (Math.min(L1, Lb) + 0.05);
		var rw = (Math.max(L1, Lw) + 0.05) / (Math.min(L1, Lw) + 0.05);
		return (rb > rw ? '#000000':'#FFFFFF');
	}

	function getL(c) {
		return (0.2126 * getsRGB(c.substr(1, 2)) + 0.7152 * getsRGB(c.substr(3, 2)) + 0.0722 * getsRGB(c.substr(-2)));
	}

	function getRGB(c) {
		try { c = parseInt(c, 16); } catch (err) { c = false; }
		return c;
	}

	function getsRGB(c) {
		c = getRGB(c) / 255;
		c = (c <= 0.03928) ? c / 12.92 : Math.pow(((c + 0.055) / 1.055), 2.4);
		return c;
	}

	function makeMarker(colour){
		return L.divIcon({
			'className': '',
			'html':	'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="7.0556mm" height="11.571mm" viewBox="0 0 25 41.001" id="svg2" version="1.1"><g id="layer1" transform="translate(1195.4,216.71)"><path style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke:black;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g></svg>'.replace(/%COLOUR%/,colour||"#000000"),
			iconSize:	 [25, 41], // size of the icon
			shadowSize:	 [41, 41], // size of the shadow
			iconAnchor:	 [12.5, 41], // point of the icon which will correspond to marker's location
			shadowAnchor: [12.5, 41],	// the same for the shadow
			popupAnchor:	[0, -41] // point from which the popup should open relative to the iconAnchor
		});
	}

	function clearResults(me){
		// Zap search results
		me.target.find('.layer-search .searchresults').html('');
		return me;
	}


	// Select one of the options in the drop down list
	function selectName(attr){
		
		this.log.message('selectName',this,attr);
		// Get the ID from the DOM element's data-id attribute
		// Use that to find the index that corresponds to in the "db" hash
		var id = attr.selected.attr('data-id');
		clearResults(this);
		//this.log.message('Lookup',_obj.layerlookup,id,_obj.layerlookup[id]);
		if(!this.layerlookup[id] || this.layerlookup[id].length <= 0){
			this.target.find('.q')[0].value = '';
			clearResults(this);
			this.loadLayer(id);
		}
		this.target.find('.layer-search .close').trigger('click');
	}
	function popuptext(feature,attr){
		// does this feature have a property named popupContent?
		var popup = '';
		var tags,bits;
		var id = (attr.id||"");
		if(!id) attr['this'].error('No ID provided');
		if(feature.properties){
			// If this feature has a default popup
			// Convert "other_tags" e.g "\"ele:msl\"=>\"105.8\",\"ele:source\"=>\"GPS\",\"material\"=>\"stone\""
			if(feature.properties.other_tags){
				tags = feature.properties.other_tags.split(/,/);
				for(var t = 0; t < tags.length; t++){
					tags[t] = tags[t].replace(/\"/g,"");
					bits = tags[t].split(/\=\>/);
					if(bits.length == 2){
						if(!feature.properties[bits[0]]) feature.properties[bits[0]] = bits[1];
					}
				}
			}
			if(feature.properties.popup){
				popup = feature.properties.popup.replace(/\n/g,"<br />");
			}else{
				// If the layer has a default popup style
				if(layers[id].popup){
					popup = layers[id].popup;
					if(typeof popup==="function") popup = popup(feature);
				}else{
					var title = '';
					if(feature.properties.title || feature.properties.name || feature.properties.Name) title = (feature.properties.title || feature.properties.name || feature.properties.Name);
					//if(!title) title = "Unknown name";
					if(title) popup += '<h3>'+(title)+'</h3>';
					var added = 0;
					for(var f in feature.properties){
						if(f != "Name" && f!="name" && f!="title" && f!="other_tags" && (typeof feature.properties[f]==="number" || (typeof feature.properties[f]==="string" && feature.properties[f].length > 0))){
							popup += (added > 0 ? '<br />':'')+'<strong>'+f+':</strong> '+(typeof feature.properties[f]==="string" && feature.properties[f].indexOf("http")==0 ? '<a href="'+feature.properties[f]+'" target="_blank">'+feature.properties[f]+'</a>' : feature.properties[f])+'';
							added++;
						}
					}
				}
				if(layers[id].owner == "osm") popup += '<p class="edit">Something not quite right? <a href="http://www.openstreetmap.org/edit?pk_campaign=odileeds-edit'+(feature.geometry.type == "Point" ? '&node=%osm_id%':'')+(feature.geometry.type == "Polygon" ? '&way=%osm_way_id%' : '')+'#map=%Zoom%/%Latitude%/%Longitude%">Help improve the data on OpenStreetMap</a>.</p>';
			}
																																											  
			popup = popup.replace(/\%IF ([^\s]+) (.*?) ENDIF\%/g,function(str,p1,p2){ return (feature.properties[p1] && feature.properties[p1] != "N/a" ? p2 : ''); });
			// Loop over properties and replace anything
			for(var p in feature.properties){
				if(feature.properties[p]){
					while(popup.indexOf("%"+p+"%") >= 0){
						popup = popup.replace("%"+p+"%",feature.properties[p] || "?");
					}
					while(popup.indexOf("{{"+p+"}}") >= 0){
						popup = popup.replace("{{"+p+"}}",feature.properties[p] || "?");
					}
				}
			}
			popup = popup.replace(/%Latitude%/g,(feature.properties.centroid ? feature.properties.centroid.latitude : (feature.geometry.coordinates ? feature.geometry.coordinates[1] : '')));
			popup = popup.replace(/%Longitude%/g,(feature.properties.centroid ? feature.properties.centroid.longitude : (feature.geometry.coordinates ? feature.geometry.coordinates[0] : '')));
			popup = popup.replace(/%Zoom%/g,attr.zoom||18);
			popup = popup.replace(/%type%/g,feature.geometry.type.toLowerCase());
			// Replace any remaining unescaped parts
			//popup = popup.replace(/%[^\%]+%/g,"?");
		}
		return popup;
	}

	//--------------------------------------------------
	// GridRef by Stuart Lowe 2016
	// A basic function that converts Ordnance Survey 
	// eastings and northings to latitudes and longitudes
	//
	// Usage:
	//   var coord = new GridRef(434905.47, 428565.17);
	//   coord.latlon();          // to return WGS84 lat,lon
	//   coord.latlon('OSGB36');  // to return OSGB36 lat,lon
	//
	// Derived from JSCoord (c) 2005 Jonathan Stott

	var GridRef;

	(function() {

		function deg2rad(x){ return x * (Math.PI / 180); }
		function rad2deg(x) { return x * (180 / Math.PI); }

		function RefEll(maj, min) {
			this.maj = maj;
			this.min = min;
			this.ecc = ((maj * maj) - (min * min)) / (maj * maj);
			return this;
		}
		function sinSquared(x) { return Math.sin(x) * Math.sin(x); }
		function tanSquared(x) { return Math.tan(x) * Math.tan(x); }
		function sec(x) { return 1.0 / Math.cos(x); }
		var airy1830 = new RefEll(6377563.396, 6356256.909);
		var OSGB_F0	= 0.9996012717;
		var N0 = -100000.0;
		var E0 = 400000.0;
		var phi0 = deg2rad(49.0);
		var lambda0	= deg2rad(-2.0);
		var tx = 446.448;
		var ty = -124.157;
		var tz = 542.060;
		var s = -0.0000204894;
		var rx = deg2rad(0.00004172222);
		var ry = deg2rad(0.00006861111);
		var rz = deg2rad(0.00023391666);


		function LatLng(lat, lng) {
			this.lat = lat;
			this.lng = lng;
			return this;
		}

		// OSGB36 to WGS84
		LatLng.prototype.WGS84 = function() {
			var a = airy1830.maj;
			var b = airy1830.min;
			var eSquared = airy1830.ecc;
			var phi = deg2rad(this.lat);
			var lambda = deg2rad(this.lng);
			var v = a / (Math.sqrt(1 - eSquared * sinSquared(phi)));
			var H = 0; // height
			var x = (v + H) * Math.cos(phi) * Math.cos(lambda);
			var y = (v + H) * Math.cos(phi) * Math.sin(lambda);
			var z = ((1 - eSquared) * v + H) * Math.sin(phi);
			var xB = tx + (x * (1 + s)) + (-rx * y)		 + (ry * z);
			var yB = ty + (rz * x)			+ (y * (1 + s)) + (-rx * z);
			var zB = tz + (-ry * x)		 + (rx * y)			+ (z * (1 + s));
			var wgs84 = new RefEll(6378137.000, 6356752.3141);
			a = wgs84.maj;
			b = wgs84.min;
			eSquared = wgs84.ecc;

			var lambdaB = rad2deg(Math.atan(yB / xB));
			var p = Math.sqrt((xB * xB) + (yB * yB));
			var phiN = Math.atan(zB / (p * (1 - eSquared)));
			var i,phiN1;
			for(i = 1; i < 10; i++) {
				v = a / (Math.sqrt(1 - eSquared * sinSquared(phiN)));
				phiN1 = Math.atan((zB + (eSquared * v * Math.sin(phiN))) / p);
				phiN = phiN1;
			}

			var phiB = rad2deg(phiN);
		
			return [phiB,lambdaB];
		};
		GridRef = function(easting,northing){
			this.easting = easting;
			this.northing = northing;
			return this;
		};

		function toLatLon(easting,northing){
			var a = airy1830.maj;
			var b = airy1830.min;
			var eSquared = airy1830.ecc;
			var phi = 0.0;
			var lambda = 0.0;
			var E = easting;
			var N = northing;
			var n = (a - b) / (a + b);
			var M = 0.0;
			var phiPrime = ((N - N0) / (a * OSGB_F0)) + phi0;
			do {
				M = (b * OSGB_F0) * (((1 + n + ((5.0 / 4.0) * n * n) + ((5.0 / 4.0) * n * n * n)) * (phiPrime - phi0)) - (((3 * n) + (3 * n * n) + ((21.0 / 8.0) * n * n * n)) * Math.sin(phiPrime - phi0) * Math.cos(phiPrime + phi0)) + ((((15.0 / 8.0) * n * n) + ((15.0 / 8.0) * n * n * n)) * Math.sin(2.0 * (phiPrime - phi0)) * Math.cos(2.0 * (phiPrime + phi0))) - (((35.0 / 24.0) * n * n * n) * Math.sin(3.0 * (phiPrime - phi0)) * Math.cos(3.0 * (phiPrime + phi0))));
				phiPrime += (N - N0 - M) / (a * OSGB_F0);
			} while ((N - N0 - M) >= 0.001);

			var v = a * OSGB_F0 * Math.pow(1.0 - eSquared * sinSquared(phiPrime), -0.5);
			var rho = a * OSGB_F0 * (1.0 - eSquared) * Math.pow(1.0 - eSquared * sinSquared(phiPrime), -1.5);
			var etaSquared = (v / rho) - 1.0;
			var VII = Math.tan(phiPrime) / (2 * rho * v);
			var VIII = (Math.tan(phiPrime) / (24.0 * rho * Math.pow(v, 3.0))) * (5.0 + (3.0 * tanSquared(phiPrime)) + etaSquared - (9.0 * tanSquared(phiPrime) * etaSquared));
			var IX = (Math.tan(phiPrime) / (720.0 * rho * Math.pow(v, 5.0))) * (61.0 + (90.0 * tanSquared(phiPrime)) + (45.0 * tanSquared(phiPrime) * tanSquared(phiPrime)));
			var X = sec(phiPrime) / v;
			var XI = (sec(phiPrime) / (6.0 * v * v * v)) * ((v / rho) + (2 * tanSquared(phiPrime)));
			var XII = (sec(phiPrime) / (120.0 * Math.pow(v, 5.0))) * (5.0 + (28.0 * tanSquared(phiPrime)) + (24.0 * tanSquared(phiPrime) * tanSquared(phiPrime)));
			var XIIA = (sec(phiPrime) / (5040.0 * Math.pow(v, 7.0))) * (61.0 + (662.0 * tanSquared(phiPrime)) + (1320.0 * tanSquared(phiPrime) * tanSquared(phiPrime)) + (720.0 * tanSquared(phiPrime) * tanSquared(phiPrime) * tanSquared(phiPrime)));
			phi = phiPrime - (VII * Math.pow(E - E0, 2.0)) + (VIII * Math.pow(E - E0, 4.0)) - (IX * Math.pow(E - E0, 6.0));
			lambda = lambda0 + (X * (E - E0)) - (XI * Math.pow(E - E0, 3.0)) + (XII * Math.pow(E - E0, 5.0)) - (XIIA * Math.pow(E - E0, 7.0));

			return new LatLng(rad2deg(phi), rad2deg(lambda));
		}
		GridRef.prototype.latlon = function(SYS){
			// If we haven't already calculated the OSGB36 latitude & longitude, we do that now
			if(!this.osgb36) this.osgb36 = toLatLon(this.easting,this.northing);
			// Return the OSGB36 latitude and longitude
			if(SYS == "OSGB36" || SYS == "OS") return [this.osgb36.lat,this.osgb36.lng];
			// Return the WGS84 latitude and longitude by default
			return this.osgb36.WGS84();
		};

	})();	// Self-closing function


	function Logger(inp){
		if(!inp) inp = {};
		this.logging = (inp.logging||false);
		this.logtime = (inp.logtime||false);
		this.id = (inp.id||"JS");
		this.metrics = {};
		return this;
	}
	Logger.prototype.error = function(){ this.log('ERROR',arguments); };
	Logger.prototype.warning = function(){ this.log('WARNING',arguments); };
	Logger.prototype.info = function(){ this.log('INFO',arguments); };
	Logger.prototype.message = function(){ this.log('MESSAGE',arguments); };
	Logger.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR" || arguments[0]=="WARNING" || arguments[0]=="INFO"){
			var args,args2,bold;
			args = Array.prototype.slice.call(arguments[1], 0);
			args2 = (args.length > 1 ? args.splice(1):"");
			// Remove array if only 1 element
			if(args2.length == 1) args2 = args2[0];
			bold = 'font-weight:bold;';
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.error('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else if(arguments[0] == "WARNING") console.warn('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else if(arguments[0] == "INFO") console.info('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else console.log('%c'+this.id+'%c: '+args[0],bold,'',args2);
			}
		}
		return this;
	};

	// Add CommonGround as a global variable
	window.DataMapper = DataMapper;

})(S);	// Self-closing function
