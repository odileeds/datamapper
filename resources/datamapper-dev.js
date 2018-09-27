(function(S) {

	// Put us on the https version
	if(location.protocol != 'https:') location.href = 'https:' + window.location.href.substring(window.location.protocol.length);


	var lat,lon,d;
	var mapid,map,mapel;
	var layers = {};

	function setupMap(){

		baseMaps['Default']= L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
			attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
			subdomains: 'abcd',
			maxZoom: 19
		})

		mapel = S('#map');
		lat = 53.79659;
		lon = -1.53385;
		d = 0.03;
		mapid = mapel.attr('id');
		map = L.map(mapid,{'layers':[baseMaps['Default']],'scrollWheelZoom':true,'zoomControl':false,'editable': true}).fitBounds([
			[lat-d, lon-d],
			[lat+d, lon+d]
		]);

		new L.Control.Zoom({ position: 'topright' }).addTo(map);
		if(Object.keys(baseMaps).length > 1){ var control = L.control.layers(baseMaps); control.addTo(map); }
		else baseMaps['Default'].addTo(map);

		map.on('baselayerchange',function(layer){
			if(layer.name == "National Library of Scotland"){
				S('#map').addClass('nls');
			}else{
				S('#map').removeClass('nls');
			}
		});

		// Add events for added layers
		var deleteShape = function (e) {
			if ((e.originalEvent.ctrlKey || e.originalEvent.metaKey) && this.editEnabled()) this.editor.deleteShapeAt(e.latlng);
		};
		map.on('layeradd', function (e) {
			if (e.layer instanceof L.Path) e.layer.on('click', L.DomEvent.stop).on('click', deleteShape, e.layer);
		});


/*
		L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
			attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
			subdomains: 'abcd',
			maxZoom: 19
		}).addTo(map);
*/
		

	};

	var odicolours = {
		'c1':'#2254F4',
		'c2':'#178CFF',
		'c3':'#00B6FF',
		'c4':'#08DEF9',
		'c5':'#1DD3A7',
		'c6':'#0DBC37',
		'c7':'#67E767',
		'c8':'#722EA5',
		'c9':'#E6007C',
		'c10':'#EF3AAB',
		'c11':'#D73058',
		'c12':'#D60303',
		'c13':'#FF6700',
		'c14':'#F9BC26'
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
		try { var c = parseInt(c, 16); } catch (err) { var c = false; }
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
			'html':	'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="7.0556mm" height="11.571mm" viewBox="0 0 25 41.001" id="svg2" version="1.1"><g id="layer1" transform="translate(1195.4,216.71)"><path style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g></svg>'.replace(/%COLOUR%/,colour||"#000000"),
			iconSize:	 [25, 41], // size of the icon
			shadowSize:	 [41, 41], // size of the shadow
			iconAnchor:	 [12.5, 41], // point of the icon which will correspond to marker's location
			shadowAnchor: [12.5, 41],	// the same for the shadow
			popupAnchor:	[0, -41] // point from which the popup should open relative to the iconAnchor
		});
	}

	function DataMapper(attr){
		if(!attr) attr = {};

		this.src = ['https://www.imactivate.com/urbancommons/getLayers.php']
		if(attr.src) this.src = attr.src;

		var db = new Array();
		var ids = {};
		var active = new Array();
		var visible = {};
		var editing = "";
		this.editing = "";
		this.layersloaded = false;
		this.layerstoload = new Array();
		this.srcloaded = 0;
		//if(layers) this.layersloaded = true;


		// Do we update the address bar?
		this.pushstate = !!(window.history && history.pushState);

		var _obj = this;

		setupMap();

		if(typeof PlaceSearch==="function"){
			this.places = new PlaceSearch({
				'selector': '.leaflet-top.leaflet-right',
				'map': map,
				'callback': function(rtn){
					_obj.setView([rtn.lat,rtn.lon],rtn.z);
				}
			});
		}

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
			this.getAnchor();
			this.lat = (this.anchor && this.anchor.latitude) ? this.anchor.latitude : 53.79661;
			this.lon = (this.anchor && this.anchor.longitude) ? this.anchor.longitude : -1.53362;
			this.zoom = (this.anchor && this.anchor.zoom) ? this.anchor.zoom : 15;
			this.temporaryhide = [];

			window[(this.pushstate) ? 'onpopstate' : 'onhashchange'] = function(e){ if(e.state){ visible = e.state.visible; active = e.state.active; } _obj.moveMap(e); };
			map.setView([this.lat, this.lon], this.zoom);

			map.on('moveend',function(){
				if(_obj.trackmove) updateMap();
				_obj.trackmove = true;
			});
			
			if(!this.layersloaded){
				for(var s = 0; s < this.src.length; s++){
					url = this.src[s];
					S(document).ajax(url,{
						'dataType':'json',
						'this':this,
						'cache': false,
						'url': this.src[s],
						'success':function(d,attr){
							if(typeof d=="object"){
								for(var l in d){
									if(d[l].popup) d[l].popup = makePopup(d[l].popup);
								}
								for(var l in d){
									layers[l] = d[l];
								}

								// Increment source file loading counter
								this.srcloaded++;

								// Load any layers that now can be loaded
								this.finishLoadingLayers();
							}
						}
					});
				}
			}
		}

		this.setView = function(coord,z){
			this.lat = coord[0];
			this.lon = coord[1];
			if(z) this.zoom = z;
			map.setView([this.lat, this.lon], this.zoom);
			return this;
		}

		this.getAnchor = function(str){
			if(!str) str = location.href.split("#")[1];
			if(str && str.indexOf("\/") < 0 && S('#'+str).length == 1){
				S('#'+str).addClass('open').find('button').focus();
				return this;
			}
			var a = (str) ? str.split('/') : [15,53.79659,-1.53385];
			if(a[3]){
				var l = a[3].split(';');
				for(var i = 0; i < l.length; i++) _obj.loadLayer(l[i]);
			}
			this.anchor = {'latitude':a[1],'zoom':a[0],'longitude':a[2],'str':str};
			return this;
		}

		// Work out where we are based on the anchor tag
		this.moveMap = function(e,a){
			_obj.getAnchor(a);
			if(!a){
				_obj.trackmove = false;
				map.setView({lon:_obj.anchor.longitude,lat:_obj.anchor.latitude},_obj.anchor.zoom);
			}else{
				if(_obj.pushstate) history.pushState({active:active,visible:visible},"Map","#"+_obj.anchor.str);
			}
			this.updateLayers();
			return this;
		}

		this.updateLayers = function(){
			var ls = S('#layers li');
			var el;
			var credits = {};
			var attrib = "";
			for(var i = 0; i < ls.length; i++){
				el = S(ls[i]);
				id = el.attr('id');
				if(layers[id]){
					layers[id].active = false;
					for(var a in visible){
						if(a==id) layers[id].active = true;
					}
					if(el.hasClass('deactivated') == layers[id].active){
						layers[id].active = !layers[id].active;
						this.toggleLayer(id);
					}
					if(layers[id].active) credits[getCredit(layers[id],"text")] = true;

					// Update layer properties
					S('#'+id+' .heading').html(layers[id] ? layers[id].name||id : id);

					S('#'+id+' .description .padding').html((layers[id].desc || '')+(layers[id].owner == "osm" ? '<br /><br />This data set comes from Open Street Map - a map built by citizens. If something is not quite right you can help <a href="https://openstreetmap.org/edit?pk_campaign=odileeds-edit">improve the map</a>.':'')+'<p class="credit"><a href="'+(layers[id].url || "")+'">'+getCredit(layers[id])+'</a>'+makeLicenceString(layers[id])+'</p>'+(layers[id].date ? '<p>Last updated: '+layers[id].date+'</p>':''));
					S('#'+id+' .description .download').html((typeof layers[id].geojson === "string" ? '<a href="'+layers[id].geojson+'" class="button">Download (GeoJSON'+(layers[id].size ? ' '+niceSize(layers[id].size) : '')+')</a>' : ''));
					// Update color of layer
					this.setLayerColours(id);
				}
			}
			for(var c in credits){
				if(attrib) attrib += "; ";
				attrib += c;
			}
			if(attrib) attrib = "<strong>Data:</strong> "+attrib;
			map.attributionControl.setPrefix(attrib ? '<span class="AttributionClass">'+attrib+'</span>':'');


			return this;
		}

		function updateMap(){
			var centre = map.getCenter();
			var s = "";
			var i = 0;
			for(var a in visible){
				if(s) s += ';';
				s += a;
				i++;
			}
			_obj.moveMap({},map.getZoom()+'/'+centre.lat.toFixed(5)+'/'+centre.lng.toFixed(5)+'/'+s);
			if(i > 0) S('#nolayers').remove();
			/*
			if(typeof Sortable!=="undefined"){
				console.log('sortable')
				var list = document.getElementById("#layers-list");
				if(_obj.sortlist) _obj.sortlist.destroy();
				_obj.sortlist = Sortable.create(list);
			}*/
		}



		S('#signin').on('click',{me:this},function(e){
			e.preventDefault();
			e.stopPropagation();
			var a = e.data.me.signin();
			return false;
		});

		S('#signout').on('click',{me:this},function(e){
			e.preventDefault();
			e.stopPropagation();
			var a = e.data.me.signout();
			return false;
		});

		S('#layersearch').on('submit',function(e){
			e.preventDefault();
		});
		setTimeout(function(){ S('#splash').trigger('click'); },5000);
		S('h1').on('click',function(){ S('#splash').addClass('open').find('button').focus(); });
		S('#splash button').on('click',function(e){ S('#splash').removeClass('open'); });
		S('#privacy button').on('click',function(e){ S('#privacy').removeClass('open'); window.history.back(); });

		S('#add-layer').on('click',function(e){
			S('#add').addClass('open').find('.close').focus();
			processResult();
		});

		S('#add .close').html(getIcon('remove')).on('click',function(e){
			S('#add').removeClass('open');
			S('#layers').focus();
		});
		S('#create-layer').on('click',function(e){
			S('#add').removeClass('open');
			S('#newLayer').addClass('open').find('.close').focus();
		});
		S('#newLayer .close').html(getIcon('remove')).on('click',function(e){
			S('#newLayer').removeClass('open');
			S('#layers .add').focus();
		});
	
		// Create a new layer
		S('#newLayer input[type="submit"]').on('click',function(e){
		
			e.preventDefault();

			var k = 0;
			var key = "temporary-layer";
			while(layers[key+(k > 0 ? '-'+k:'')]) k++;
			key = key+(k > 0 ? '-'+k:'');

			var obj = {'name':S('#name')[0].value,'desc':S('#desc')[0].value,'url':S('#url')[0].value,'owner':'stuart','credit':'&copy; Stuart Lowe','licence':'ODbL','odbl':true,'colour':S('#color')[0].value,'edit':true};

			// Do things here to create a new layer
			layers[key] = obj;
			_obj.loadLayer(key);
			_obj.toggleLayer(key);
			_obj.updateLayers();
			_obj.startEditLayer(key);
			
			
			S('#newLayer').removeClass('open');
		});
	
		S('#q').on('focus',function(e){

			if(S('#searchresults').length <= 0){
				S('#layersearch').after('<div id="searchresults"></div>');
			}

		}).on('keyup',function(e){

			e.preventDefault();

			if(e.originalEvent.keyCode==40 || e.originalEvent.keyCode==38){
				// Down=40
				// Up=38
				var li = S('#searchresults li');
				var s = -1;
				for(var i = 0; i < li.e.length; i++){
					if(S(li.e[i]).hasClass('selected')) s = i;
				}
				if(e.originalEvent.keyCode==40) s++;
				else s--;
				if(s < 0) s = li.e.length-1;
				if(s >= li.e.length) s = 0;
				S('#searchresults .selected').removeClass('selected');
				S(li.e[s]).addClass('selected');
			}else if(e.originalEvent.keyCode==13){
				selectName(S('#searchresults .selected'))
			}else{
				// Need to load the data file for the first letter
				var name = this.e[0].value.toLowerCase();
				//var fl = name[0];
				processResult(name);
				//if(name == "") clearResults();
			}
		});
		
		function clearResults(){
			// Zap search results
			S('#searchresults').html('');
			return this;			
		}

		function loadCode(url,callback){
			var el;
			console.log('loadCode',url,url.indexOf(".js"));
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
				el.onload = function(){ callback.call(this,{'url':url}); };
				document.getElementsByTagName('head')[0].appendChild(el);
			}
		}


		// Select one of the people in the drop down list
		function selectName(selected){
			// Get the ID from the DOM element's data-id attribute
			// Use that to find the index that corresponds to in the "db" hash
			var id = selected.attr('data-id');
			clearResults();
			S('#add .close').trigger('click');
		
			if(S('#'+id).length <= 0){
				S('#q')[0].value = '';
				clearResults();
				_obj.loadLayer(id);
			}
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

		this.getUser();
		

		this.setUser = function(user){
			this.user = user;
			if(user){
				S('.needs-user').css({'display':'inline-block'});
				S('#signin').css({'display':'none'});
				S('#signout').css({'display':'inline-block'});
				S('#createaccount').css({'display':'none'});
				S('#user').css({'display':'inline-block'}).html(user);
			}else{
				S('.needs-user').css({'display':'none'});
				S('#signin').css({'display':'inline-block'});
				S('#signout').css({'display':'none'});
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
	
		this.removeLayerData = function(id){
			if(layers[id]){
				// Set this layer to inactive
				layers[id].active = false;
				delete visible[id];
				if(layers[id].leaflet){
					// Remove the data
					layers[id].leaflet.remove();
					delete layers[id].leaflet;
				}
			}
			return this;
		}

		this.removeLayer = function(id){
			S('#'+id).remove();
			this.removeLayerData(id);
			updateMap();
			return this;
		}

		this.updateLayerState = function(id){
			if(layers[id]){
				if(layers[id].active) S('#'+id).removeClass('deactivated').css({'color':layers[id].textcolor});
				else S('#'+id).addClass('deactivated').css({'color':''});
				this.setLayerColours(id);
			}
			return this;
		}

		this.showLayer = function(id){
			if(layers[id]){
				this.addLayer(id);
				this.updateLayerState(id);
			}
			return this;
		}
		this.hideLayer = function(id){
			if(layers[id]){
				this.removeLayerData(id);
				this.updateLayerState(id);
			}
			return this;
		}
		this.toggleLayer = function(id){
			if(layers[id]){
				layers[id].active = !layers[id].active;
				if(layers[id].active) this.showLayer(id);
				else this.hideLayer(id);
			}
			return this;
		}
		this.fitLayer = function(id){
			if(layers[id]) map.fitBounds(layers[id].leaflet.getBounds());
			return this;
		}

		this.setLayerColours = function(id){
			if(layers[id]){
				if(!layers[id].colour) layers[id].colour = '#dddddd';
				layers[id].textcolor = setHexTextColor(layers[id].colour);
				if(S('#'+id).length > 0){
					c = getComputedStyle(S('#'+id)[0])['color'];
					S('#'+id+' .toggle').html((layers[id].active ? getIcon("hide",c):getIcon("show",c)));
					S('#'+id+' .fit').html(getIcon("fit",c));
					S('#'+id+' .info').html(getIcon("info",c));
					S('#'+id+' .remove').html(getIcon("remove",c));
					S('#'+id+' .edit').html(getIcon("edit",c));
					S('#'+id).css({'background':layers[id].colour,'color':(layers[id].active ? layers[id].textcolor:'')});
					S('#saver').css({'background':layers[id].colour,'color':layers[id].textcolor,'display':'block'});
					if(layers[id].leaflet) layers[id].leaflet.setStyle({color: layers[id].colour});

				}
			}
			return this;
		}

		// Load any necessary extra js/css for clustering
		this.loadClusterCode = function(id){
			var files = ['https://odileeds.org/resources/leaflet.markercluster-src.js','https://odileeds.org/resources/L.markercluster.css','https://odileeds.org/resources/L.markercluster.default.css'];
			var _obj = this;
			if(!this.extraLoaded) this.extraLoaded = {};

			for(var i = 0; i < files.length; i++){
				loadCode(files[i],function(e){
					_obj.extraLoaded[e.url] = true;
					var got = 0;
					for(var i = 0; i < files.length; i++){
						if(_obj.extraLoaded[files[i]]) got++;
					}
					if(got==files.length){
						_obj.clustercodeloaded = true;
						_obj.addLayer(id);
						updateMap();
					}
				})
			}
			return this;
		}

		this.addLayer = function(id){
			if(layers[id]){

				// Should check if this layer is huge and only markers
				// If it is we should make a cluster layer
				var needscluster = false;
				var points = 0;
				if(layers[id].data){
					for(var i = 0; i < layers[id].data.features.length; i++){
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

				if(layers[id].leaflet) this.removeLayerData(id);
				layers[id].active = true;
				visible[id] = true;
				this.setLayerColours(id);
				function popuptext(feature){
					// does this feature have a property named popupContent?
					popup = '';
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
								title = '';
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
						//popup = popup.replace(new RegExp(/\%IF ([^\s]+) (.*) ENDIF\%/,"g"),function(str,p1,p2){ return (feature.properties[p1] && feature.properties[p1] != "N/a" ? p2 : ''); });
						popup = popup.replace(/\%IF ([^\s]+) (.*) ENDIF\%/g,function(str,p1,p2){ return (feature.properties[p1] && feature.properties[p1] != "N/a" ? p2 : ''); });
						// Loop over properties and replace anything
						for(p in feature.properties){
							while(popup.indexOf("%"+p+"%") >= 0){
								popup = popup.replace("%"+p+"%",feature.properties[p] || "?");
							}
						}
						popup = popup.replace(/%Latitude%/g,(feature.properties.centroid ? feature.properties.centroid.latitude : (feature.geometry.coordinates ? feature.geometry.coordinates[1] : '')));
						popup = popup.replace(/%Longitude%/g,(feature.properties.centroid ? feature.properties.centroid.longitude : (feature.geometry.coordinates ? feature.geometry.coordinates[0] : '')));
						popup = popup.replace(/%Zoom%/g,_obj.zoom||18);
						popup = popup.replace(/%type%/g,feature.geometry.type.toLowerCase());
						// Replace any remaining unescaped parts
						popup = popup.replace(/%[^\%]+%/g,"?");
					}
					return popup;
				}
				function onEachFeature(feature, layer) {
					popup = popuptext(feature);
					if(popup) layer.bindPopup(popup);
				}
				var customicon = makeMarker(layers[id].colour);
				// Set a default colour
				if(!layers[id].colour) layers[id].colour = "#F9BC26";
				var geoattrs = {
					'style': { "color": layers[id].colour, "weight": 2, "opacity": 0.65 },
					'pointToLayer': function(geoJsonPoint, latlng) { return L.marker(latlng,{icon: customicon}); },
					'onEachFeature': onEachFeature
				};
				// Is this a chloropleth layer?
				// If it is we work out the scale and then change the style to a function
				// so we can deal with each feature seperately
				if(!layers[id].format && layers[id].data.format) layers[id].format = layers[id].data.format;
				if(layers[id].format && layers[id].format.type == "chloropleth"){
					var min = 1e100;
					var max = -1e100;
					var key =  layers[id].format.key || 'VALUE';
					for(var i = 0; i < layers[id].data.features.length; i++){
						v = layers[id].data.features[i].properties[key];
						if(typeof v==="number"){
							min = Math.min(v,min);
							max = Math.max(v,max);
						}
					}
					var inverse = (layers[id].format.inverse ? true : false);
					geoattrs.style = function(feature){
						if(feature.geometry.type == "Polygon" || feature.geometry.type == "MultiPolygon"){
							var v = 0;
							if(typeof feature.properties[key]==="number"){
								var f = (feature.properties[key]-min)/(max-min);
								if(inverse) f = 1-f;
								v = (f*0.6 + 0.2);
							}
							return { "color": layers[id].colour, "weight": 0.5, "opacity": 0.65,"fillOpacity": v };
						}else return { "color": layers[id].colour }
					}
				}
				if(layers[id].data){
					if(!layers[id].data.crs && layers[id].data.features[0].geometry.coordinates[0] > 300000 && layers[id].data.features[0].geometry.coordinates[1] > 300000){
						// Fake the CRS if the coordinates look like Easting/Northings
						layers[id].data.crs = {'properties':{'name':'EPSG:27700'}};
					}
					if(layers[id].data.crs){
						if(layers[id].data.crs.properties && layers[id].data.crs.properties.name=="EPSG:27700"){
							geoattrs.coordsToLatLng = OSGridToLatLon;
							console.log('Add conversion from OSGrid')
						}
					}
				}
				if(needscluster){
					// Define a cluster layer
					layers[id].leaflet = L.markerClusterGroup({
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
					for(var i = 0; i < layers[id].data.features.length; i++){
						c = layers[id].data.features[i].geometry.coordinates;
						marker = L.marker([c[1],c[0]],{icon: customicon});
						marker.bindPopup(popuptext(layers[id].data.features[i]));
						markerList.push(marker);
					}

					// Add marker list to layer
					layers[id].leaflet.addLayers(markerList);
				}else{
					layers[id].leaflet = L.geoJSON(layers[id].data,geoattrs);
				}
				layers[id].leaflet.addTo(map);
				//updateMap();
			}
			return this;
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


		function stopDrawing(e){
			_obj.drawing = false;
			S('.leaflet-draw-toolbar .active').removeClass('active');
			map.editTools.stopDrawing();
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
				map.editTools.featuresLayer = layers[id].leaflet;
				if(typ=="polyline") window.LAYER = map.editTools.startPolyline.call(map.editTools);
				if(typ=="polygon") window.LAYER = map.editTools.startPolygon.call(map.editTools);
				if(typ=="marker") window.LAYER = map.editTools.startMarker.call(map.editTools,map.editTools,{'icon':makeMarker(layers[id].colour)});
			}
			return;
		}

		this.startEditLayer = function(id){
			if(this.editing) this.stopEditLayer();
			if(layers[id]){
				this.editing = id;
				S('#layers li.edit').removeClass('edit');
				S('.editor').remove();
				S('#'+id).addClass('edit').removeClass('open');
				// If the Leaflet layer doesn't exist, create a layerGroup
				if(!layers[id].leaflet) layers[id].leaflet = new L.layerGroup();
				// Add the layer to the map
				layers[id].leaflet.addTo(map);
				// If we have any features we need to make them editable
				layers[id].leaflet.eachLayer(function(layer) { layer.enableEdit(); });
				map.on('editable:drawing:start', function(e){
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
				S('#'+id).append('<div class="editor"><div><div class="left padded"><form><div class="row"><label for="edit-name">Title:</label><input type="text" id="edit-name" name="edit-name" value="'+layers[id].name+'" /></div><div class="row"><label for="edit-desc">Description:</label><textarea id="edit-desc">'+(layers[id].desc ? layers[id].desc:'')+'</textarea></div><div class="row"><label for="edit-url">Website:</label><input type="url" id="edit-url" name="edit-url" value="'+layers[id].url+'" /></div><div class="row"><label for="edit-color">Colour:</label><input type="color" id="edit-color" name="edit-color" value="'+layers[id].colour+'" /></div></form></div><div class="right"><div class="leaflet-draw-toolbar leaflet-bar leaflet-draw-toolbar-top"><a class="leaflet-draw-draw-polyline" href="#" title="Draw a polyline"><span class="sr-only">Draw a polyline</span></a><a class="leaflet-draw-draw-polygon" href="#" title="Draw a polygon"><span class="sr-only">Draw a polygon</span></a><a class="leaflet-draw-draw-marker" href="#" title="Draw a marker"><span class="sr-only">Draw a marker</span></a></div><input id="editor-save" type="submit" value="Save" /></div></div></div>');
//				S('#saver').html('<input id="editor-save" type="submit" value="Save" />').css({'display':''});


				// Add events to elements we've just added
				S('#editor-save').on('click',{me:this},function(e){
					S('#'+id+' form').trigger('submit');
				});
				S('#edit-color').on('change',{me:this},function(e){
					layers[id].colour = S('#edit-color')[0].value;
					e.data.me.setLayerColours(id);
				});
				S('#'+id+' form').on('submit',function(e){
					e.preventDefault();
					e.stopPropagation();
					_obj.stopEditLayer();
				});
				S('.leaflet-draw-draw-polyline').on('click',{me:this},function(e){
					e.stopPropagation();
					e.preventDefault();
					drawItem(this,e.data.me,'polyline',id);
				});
				S('.leaflet-draw-draw-polygon').on('click',{me:this},function(e){
					e.stopPropagation();
					e.preventDefault();
					drawItem(this,e.data.me,'polygon',id);
				});
				S('.leaflet-draw-draw-marker').on('click',{me:this},function(e){
					e.stopPropagation();
					e.preventDefault();
					drawItem(this,e.data.me,'marker',id);
				});

				// Loop over visible layers and find out if we need to hide any
				var showmessage = false;
				for(var k in layers){
					if(layers[k].active && k != id && layers[k].odbl){
						//(typeof layers[k].licence==="object" ? layers[k].licence.text || layers[k].licence).toLowerCase() != "odbl"){
						showmessage = true;
						if(layers[k].active){
							this.hideLayer(k);
							this.temporaryhide.push(k);
						}
					}
				}
			
				if(S('.message').length > 0 && showmessage){
					S('.message').html("<button class='close'>"+getIcon('remove')+"</button>We've temporarily hidden some layers because of copyright. They'll reappear once you stop editing.");
					S('#message .close').on('click',function(e){ S('#message').remove(); });
					S('body').addClass('hasmessage');
				}
			}
			return this;
		}

		this.changeLayerID = function(id,id2){
			console.log('changeLayerID',id,id2)
			if(id==id2){
				console.log('No need to change name')
				return this;
			}
			if(layers[id]){
				if(!layers[id2]){
					layers[id2] = layers[id];
					delete layers[id];
					visible[id2] = visible[id];
					delete visible[id];
					// Update the ID of the layer in the list
					S('#'+id).attr('id',id2);
				}else{
					console.log('A layer with the ID '+id2+' already exists. Cowardly refusing to re-ID '+id);
				}
			}else{
				console.log('No layer '+id+' to re-ID');
			}
			return this;
		}

		this.saveUserLayer = function(id){

			if(!id && this.editing) id = this.editing;

			console.log('saveLayer',id)
			if(!layers[id]) return this;


			// Now we need to load the layers
			// If the ID starts with "temporary-layer" we don't send that ID
			url = "https://www.imactivate.com/urbancommons/saveUserLayer.php?id="+(id.indexOf("temporary-layer")==0 ? "" : id)+"&name="+layers[id].name+"&desc="+(layers[id].desc ? layers[id].desc:'')+"&url="+layers[id].url+"&colour="+layers[id].colour.substr(1)+"&data="+JSON.stringify(layers[id].data);

			console.log('Saving to '+url);
			S(document).ajax(url,{
				'dataType':'jsonp',
				'this':this,
				'success':function(d){
					console.log('return is ',d);
					if(d.msg=="success"){
						// We need to re-ID the layer
						this.changeLayerID(id,d.key);
					}else{
						console.log('saveUserLayer went wrong in some way')
					}
				}
			});

			return this;
		}

		this.stopEditLayer = function(){
			if(this.editing) id = this.editing;
			console.log('stopEditLayer',id,this.editing)
			if(layers[id]){
				// Need to save
				layers[id].name = S('#edit-name')[0].value;
				layers[id].desc = S('#edit-desc')[0].value || "";
				layers[id].url = S('#edit-url')[0].value;
				layers[id].colour = S('#edit-color')[0].value;
				// Disable edit on feature
				layers[id].leaflet.eachLayer(function(layer) { layer.disableEdit(); });
				// Store the layer as data
				layers[id].data = layers[id].leaflet.toGeoJSON();
				_obj.setLayerColours(id);
				_obj.updateLayers();
				this.saveUserLayer();
				S('#layers li.edit').removeClass('edit');
				S('.editor').remove();
				S('.message').html("");
				S('#saver').html("").css({'display':'none'});
				S('body').removeClass('hasmessage');
				for(var i = 0; i < this.temporaryhide.length; i++){
					this.showLayer(this.temporaryhide[i]);
				}
				this.temporaryhide = [];
			}
			this.editing = "";
			return this;
		}

		this.finishLoadingLayers = function(){
			console.log('finishLoadingLayers',this,this.layerstoload,this.src.length,this.srcloaded)
			if(this.src.length > 0 && this.srcloaded < this.src.length) return;
			if(layers){
console.log('Processing',this,this.layerstoload)
				this.layersloaded = true;
				for(var i = this.layerstoload.length-1; i >= 0; i--){
					console.log('loadLayer',i,this.layerstoload[i])
					this.loadLayer(this.layerstoload[i]);
					this.layerstoload.pop();
				}
			}
			return this;
		}

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
			if(typeof l.licence==="text") str = " (" + l.licence.replace(/\(([^\)]*)\)/,function(m,p1){ return " "+p1; }) + ")";
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
		};

		this.loadLayerData = function(id){
console.log('loadLayerData',id)
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
		}

		this.loadLayer = function(id){
			if(!this.layersloaded){ this.layerstoload.push(id); return; }
			if(!layers[id]){ layers[id] = {'active':false}; }
			if(layers[id].metadata) return this.loadLayerData(id);
			if(!layers[id].active){
				// Update color of layer
				this.setLayerColours(id);

				if(S('#'+id).length == 0){
					S('#layers ul').append('<li id="'+id+'" class="loading"><a href="#" class="heading padding" tabindex="0">'+(layers[id] ? layers[id].name||id : id)+'<span class="loading">| loading...</span></a><div class="nav padding">'+(layers[id].edit ? '<a href="#" class="edit" title="Edit this layer">'+getIcon('edit',layers[id].textcolor)+'</a>':'')+'<a href="#" class="info" title="Show information about this layer">'+getIcon('info',layers[id].textcolor)+'</a><a href="#" class="fit" title="Change the map view to fit this layer">'+getIcon('fit',layers[id].textcolor)+'</a><a href="#" class="toggle" title="Toggle layer visibility">'+getIcon('hide',layers[id].textcolor)+'</a>'+'<a href="#" class="remove" title="Remove this layer">'+getIcon('remove',layers[id].textcolor)+'</a></div><div class="description"><div class="padding">'+(layers[id].desc ? layers[id].desc:'')+'<p class="credit"><a href="'+layers[id].url+'">'+getCredit(layers[id])+'</a>'+makeLicenceString(layers[id])+'</p></div><div class="download"></div></div></li>');
					// Show/hide the layer menu
					S('#'+id+' .heading').on('focus',function(e){
						S('#layers .focus').removeClass('focus');
						S(e.currentTarget.parentElement).addClass('focus');
					}).on('mouseover',function(e){
						S('#layers .focus').removeClass('focus');
						S(e.currentTarget.parentElement).addClass('focus');
					}).on('click',function(e){
						e.stopPropagation();
						e.preventDefault();
						if(_obj.editing == id) _obj.stopEditLayer();
						S(e.currentTarget.parentElement).toggleClass('open').removeClass('edit');
					});
					S('#'+id+' .info').on('click',function(e){
						e.stopPropagation();
						e.preventDefault();
						S('#'+id+' .heading').trigger('click');
					});
					S('#'+id+' .nav').on('mouseover',function(e){
						S('#layers .focus').removeClass('focus');
						S(e.currentTarget.parentElement).addClass('focus');
					});
					S('#layers').on('mouseout',function(e){
						S('#layers .focus').removeClass('focus');
					});
					S('#'+id+' .remove').on('click',function(e){
						e.stopPropagation();
						e.preventDefault();
						// Get the ID of the layer (don't rely on the value we can see from outside)
						id = S(this[0]).parent().parent().attr('id');
						_obj.removeLayer(id);
					});
					S('#'+id+' .edit').on('click',function(e){
						e.stopPropagation();
						e.preventDefault();
						// Get the ID of the layer (don't rely on the value we can see from outside)
						id = S(this[0]).parent().parent().attr('id');
						_obj.startEditLayer(id);
					});
					S('#'+id+' .toggle').on('click',function(e){
						e.stopPropagation();
						e.preventDefault();
						// Get the ID of the layer (don't rely on the value we can see from outside)
						id = S(this[0]).parent().parent().attr('id');
						_obj.toggleLayer(id);
						updateMap();
					});
					S('#'+id+' .fit').on('click',function(e){
						e.stopPropagation();
						e.preventDefault();
						// Get the ID of the layer (don't rely on the value we can see from outside)
						id = S(this[0]).parent().parent().attr('id');
						_obj.fitLayer(id);
						//updateMap();
					});

				}
				if(typeof layers[id].geojson==="object"){
					S('#'+id).removeClass('loading').find('.loading').remove();
					if(layers[id]){
						layers[id].data = layers[id].geojson;
						this.addLayer(id);
						updateMap();
					}
				}else if(typeof layers[id].geojson === "string"){
					S(document).ajax(layers[id].geojson,{
						'id':id,
						'dataType':'json',
						'loader':S('#'+id).find('.loading'),
						'beforeSend': function(XMLHttpRequest,attr){
							//Download progress
							XMLHttpRequest.addEventListener("progress", function(evt){
								if(evt.lengthComputable){
									var pc = (100 * evt.loaded / evt.total).toFixed(1);
									var a = layers[attr.id].colour || '#dddddd';
									S('#'+attr.id).css({'background':'linear-gradient(90deg,'+a+' 0%, '+a+' '+pc+'%, white '+pc+'%)'});
									attr.loader.html(': '+pc+'%');
								}
							}, false);
							return XMLHttpRequest;
						},
						'success': function(data,attr){
							S('#'+attr.id).removeClass('loading').find('.loading').remove();
							if(layers[attr.id]){
								layers[attr.id].data = data;
								_obj.addLayer(attr.id);
								updateMap();
							}
						},
						'error': function(e){ S('#'+id).find('.loading').html('(failed to load)'); }
					});
				}else{
					S('#'+id).removeClass('loading').find('.loading').html('');
				}
			}
			return this;
		}

		function niceSize(b){
			if(b > 1e12) return (b/1e12).toFixed(1)+" TB";
			if(b > 1e9) return (b/1e9).toFixed(1)+" GB";
			if(b > 1e6) return (b/1e6).toFixed(1)+" MB";
			if(b > 1e3) return (b/1e3).toFixed(1)+" kB";
			return (b)+" bytes";
		}


		function processResult(name){
			var html = "";
			var tmp = new Array();

			if(S('#searchresults').length <= 0) S('#layersearch').after('<div id="searchresults"></div>');

			if(typeof name==="string" && name.length > 0){
				name = name.toLowerCase();
				var lat = parseFloat(_obj.anchor.latitude);
				var lon = parseFloat(_obj.anchor.longitude);
				var p = L.latLng(lat,lon);

				// Loop over layers and work out a ranking
				for(var i in layers){
					var dist = 100000;
					if(layers[i].name){
						layers[i].rank = 0;
						var idx = layers[i].name.toLowerCase().indexOf(name);
						if(idx >= 0 && !layers[i].active){
							if(idx==0) layers[i].rank += 10;
							layers[i].rank += 1/(Math.abs(layers[i].name.length-name.length)+1);
						}
						if(layers[i].desc){
							var idx = layers[i].desc.toLowerCase().indexOf(name);
							if(idx >= 0 && !layers[i].active) layers[i].rank++;
						}
						if(layers[i].credit && layers[i].credit.src){
							var idx = layers[i].credit.src.toLowerCase().indexOf(name);
							if(idx >= 0 && !layers[i].active) layers[i].rank++;
						}
						if(layers[i].keywords){
							var kw = layers[i].keywords.split(/,/);
							var idx;
							for(var k = 0; k < kw.length; k++){
								idx = kw[k].toLowerCase().indexOf(name);
								if(idx >= 0 && !layers[i].active) layers[i].rank++;
							}
						}
						layers[i].id = i;
						if(layers[i].rank > 0){
							if(layers[i].centre && layers[i].centre.length == 2){
								// Calculate the distance
								try {
									dist = p.distanceTo(layers[i].centre);
								}catch (err){
			
								}
								layers[i].rank += Math.min(10,(1000/dist));
							}
							tmp.push(layers[i]);
						}
					}
				}
				var tmp = sortBy(tmp,'rank');
				//var n = Math.min(tmp.length,8);
				var n = tmp.length;
			}else{

				// Loop over layers and work out a ranking
				for(var i in layers){
					if(layers[i].name && !layers[i].active){
						layers[i].id = i;
						layers[i].namelc = layers[i].name.toLowerCase();
						tmp.push(layers[i]);
					}
				}
				var tmp = sortBy(tmp,'namelc',true);
				var n = tmp.length;
			}
			if(tmp.length > 0){
				S('#searchresults li').off('click');
				html = "<ol>";
				for(var i = 0; i < n; i++){
					tcredit = getCredit(tmp[i],"src");
					html += '<li data-id="'+tmp[i].id+'" '+(i==0 ? ' class="selected"':'')+'><a href="#" class="padding name">'+tmp[i].name+(tcredit ? ' ('+tcredit+(tmp[i].size ? '; '+niceSize(tmp[i].size):'')+')' : '')+'</a></li>';
				}
				html += "</ol>";
			}
			S('#searchresults').html(html);
			var li = S('#searchresults li a');
			for(var i = 0 ; i < li.e.length ; i++) S(li.e[i]).on('click',function(e){ e.preventDefault(); console.log('here'); selectName(this.parent()); });

			return;
		}

		function getIcon(icon,colour){
			var icons = {
				'hide':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>hide layer</title><path style="fill:%COLOUR%;" d="M16 6c-6.979 0-13.028 4.064-16 10 2.972 5.936 9.021 10 16 10s13.027-4.064 16-10c-2.972-5.936-9.021-10-16-10zM23.889 11.303c1.88 1.199 3.473 2.805 4.67 4.697-1.197 1.891-2.79 3.498-4.67 4.697-2.362 1.507-5.090 2.303-7.889 2.303s-5.527-0.796-7.889-2.303c-1.88-1.199-3.473-2.805-4.67-4.697 1.197-1.891 2.79-3.498 4.67-4.697 0.122-0.078 0.246-0.154 0.371-0.228-0.311 0.854-0.482 1.776-0.482 2.737 0 4.418 3.582 8 8 8s8-3.582 8-8c0-0.962-0.17-1.883-0.482-2.737 0.124 0.074 0.248 0.15 0.371 0.228v0zM16 13c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"></path></svg>',
				'show':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>show layer</title><path style="fill:%COLOUR%;" d="M29.561 0.439c-0.586-0.586-1.535-0.586-2.121 0l-6.318 6.318c-1.623-0.492-3.342-0.757-5.122-0.757-6.979 0-13.028 4.064-16 10 1.285 2.566 3.145 4.782 5.407 6.472l-4.968 4.968c-0.586 0.586-0.586 1.535 0 2.121 0.293 0.293 0.677 0.439 1.061 0.439s0.768-0.146 1.061-0.439l27-27c0.586-0.586 0.586-1.536 0-2.121zM13 10c1.32 0 2.44 0.853 2.841 2.037l-3.804 3.804c-1.184-0.401-2.037-1.521-2.037-2.841 0-1.657 1.343-3 3-3zM3.441 16c1.197-1.891 2.79-3.498 4.67-4.697 0.122-0.078 0.246-0.154 0.371-0.228-0.311 0.854-0.482 1.776-0.482 2.737 0 1.715 0.54 3.304 1.459 4.607l-1.904 1.904c-1.639-1.151-3.038-2.621-4.114-4.323z"></path><path style="fill:%COLOUR%;" d="M24 13.813c0-0.849-0.133-1.667-0.378-2.434l-10.056 10.056c0.768 0.245 1.586 0.378 2.435 0.378 4.418 0 8-3.582 8-8z"></path><path style="fill:%COLOUR%;" d="M25.938 9.062l-2.168 2.168c0.040 0.025 0.079 0.049 0.118 0.074 1.88 1.199 3.473 2.805 4.67 4.697-1.197 1.891-2.79 3.498-4.67 4.697-2.362 1.507-5.090 2.303-7.889 2.303-1.208 0-2.403-0.149-3.561-0.439l-2.403 2.403c1.866 0.671 3.873 1.036 5.964 1.036 6.978 0 13.027-4.064 16-10-1.407-2.81-3.504-5.2-6.062-6.938z"></path></svg>',
				'remove':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>remove layer</title><path style="fill:%COLOUR%;" d="M31.708 25.708c-0-0-0-0-0-0l-9.708-9.708 9.708-9.708c0-0 0-0 0-0 0.105-0.105 0.18-0.227 0.229-0.357 0.133-0.356 0.057-0.771-0.229-1.057l-4.586-4.586c-0.286-0.286-0.702-0.361-1.057-0.229-0.13 0.048-0.252 0.124-0.357 0.228 0 0-0 0-0 0l-9.708 9.708-9.708-9.708c-0-0-0-0-0-0-0.105-0.104-0.227-0.18-0.357-0.228-0.356-0.133-0.771-0.057-1.057 0.229l-4.586 4.586c-0.286 0.286-0.361 0.702-0.229 1.057 0.049 0.13 0.124 0.252 0.229 0.357 0 0 0 0 0 0l9.708 9.708-9.708 9.708c-0 0-0 0-0 0-0.104 0.105-0.18 0.227-0.229 0.357-0.133 0.355-0.057 0.771 0.229 1.057l4.586 4.586c0.286 0.286 0.702 0.361 1.057 0.229 0.13-0.049 0.252-0.124 0.357-0.229 0-0 0-0 0-0l9.708-9.708 9.708 9.708c0 0 0 0 0 0 0.105 0.105 0.227 0.18 0.357 0.229 0.356 0.133 0.771 0.057 1.057-0.229l4.586-4.586c0.286-0.286 0.362-0.702 0.229-1.057-0.049-0.13-0.124-0.252-0.229-0.357z"></path></svg>',
				'edit':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>edit layer</title><path style="fill:%COLOUR%;" d="M27 0c2.761 0 5 2.239 5 5 0 1.126-0.372 2.164-1 3l-2 2-7-7 2-2c0.836-0.628 1.874-1 3-1zM2 23l-2 9 9-2 18.5-18.5-7-7-18.5 18.5zM22.362 11.362l-14 14-1.724-1.724 14-14 1.724 1.724z"></path></svg>',
				'add':'<svg version="1.1" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="32" height="32" viewBox="0 0 32 32" sodipodi:docname="add.svg"><defs id="defs10" /><sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="1160" inkscape:window-height="719" id="namedview8" showgrid="false" inkscape:zoom="7.375" inkscape:cx="16" inkscape:cy="16" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="0" inkscape:current-layer="svg2" /><title id="title4">add layer</title><path style="fill:#000000" d="m 20.243,30.989 0,0 0,-10.746 10.746,0 0,0 c 0.148,0 0.288,-0.03 0.414,-0.09 0.346,-0.158 0.586,-0.505 0.586,-0.909 l 0,-6.486 c 0,-0.404 -0.241,-0.751 -0.586,-0.909 -0.126,-0.06 -0.266,-0.09 -0.413,-0.09 l 0,0 -10.747,0 0,-10.78035 0,0 c 0,-0.1478 -0.03,-0.2878 -0.09,-0.4137 -0.158,-0.3458 -0.505,-0.5855 -0.909,-0.5855 l -6.486,0 c -0.404,0 -0.751,0.2411 -0.909,0.5855 -0.06,0.1266 -0.09,0.2659 -0.09,0.4144 l 0,0 0,10.77965 -10.7457,0 0,0 c -0.14785,10e-4 -0.28785,0.03 -0.41445,0.09 -0.3451,0.157 -0.5855,0.505 -0.5855,0.909 l 0,6.486 c 0,0.404 0.2411,0.751 0.5855,0.909 0.1266,0.06 0.2659,0.09 0.41445,0.09 l 0,0 10.7457,0 0,10.746 0,0 c 0,0.148 0.03,0.288 0.09,0.414 0.158,0.346 0.505,0.586 0.909,0.586 l 6.486,0 c 0.404,0 0.752,-0.241 0.909,-0.586 0.06,-0.126 0.09,-0.266 0.09,-0.414 z" id="path6" inkscape:connector-curvature="0" sodipodi:nodetypes="ccccccsscccccccsscccccccsscccccccsscc" /></svg>',
				'info':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOUR%" d="M 16 0 A 16 16 0 0 0 0 16 A 16 16 0 0 0 16 32 A 16 16 0 0 0 32 16 A 16 16 0 0 0 16 0 z M 17.087891 5.4433594 C 17.405707 5.4433594 17.696853 5.483046 17.955078 5.5625 C 18.223235 5.641954 18.451922 5.7610139 18.640625 5.9199219 C 18.829328 6.0788298 18.970994 6.2715698 19.070312 6.5 C 19.179566 6.7284301 19.236328 6.9911102 19.236328 7.2890625 C 19.236328 7.6068785 19.179565 7.8960715 19.070312 8.1542969 C 18.961062 8.4025907 18.813703 8.6161505 18.625 8.7949219 C 18.436297 8.9637616 18.20761 9.0979486 17.939453 9.1972656 C 17.681227 9.2866511 17.395775 9.3300781 17.087891 9.3300781 C 16.809803 9.3300781 16.549076 9.2866516 16.300781 9.1972656 C 16.052488 9.1078798 15.833234 8.9831268 15.644531 8.8242188 C 15.455828 8.6553791 15.300822 8.4569458 15.181641 8.2285156 C 15.072389 7.9901537 15.019531 7.7217806 15.019531 7.4238281 C 15.019531 7.1060122 15.072387 6.8282057 15.181641 6.5898438 C 15.300822 6.3415501 15.455828 6.1336835 15.644531 5.9648438 C 15.833234 5.7960041 16.052488 5.6655579 16.300781 5.5761719 C 16.549076 5.4867855 16.809803 5.4433594 17.087891 5.4433594 z M 18.609375 9.9902344 L 16.402344 20.076172 C 16.392444 20.135762 16.367855 20.24913 16.328125 20.417969 C 16.298334 20.576877 16.258644 20.765876 16.208984 20.984375 C 16.169259 21.202874 16.123879 21.437253 16.074219 21.685547 C 16.024563 21.933841 15.979183 22.166268 15.939453 22.384766 C 15.899727 22.603265 15.865728 22.797958 15.835938 22.966797 C 15.806148 23.135637 15.791016 23.249004 15.791016 23.308594 C 15.791016 23.447639 15.815574 23.59695 15.865234 23.755859 C 15.914894 23.904834 15.994268 24.039022 16.103516 24.158203 C 16.222697 24.277385 16.377703 24.377581 16.566406 24.457031 C 16.765041 24.536491 17.012595 24.576172 17.310547 24.576172 C 17.399937 24.576172 17.515253 24.564812 17.654297 24.544922 C 17.793342 24.525052 17.940701 24.496761 18.099609 24.457031 C 18.258517 24.417305 18.428651 24.371926 18.607422 24.322266 C 18.786193 24.272606 18.960066 24.212098 19.128906 24.142578 L 19.619141 24.142578 L 19.619141 25.439453 C 19.241735 25.657953 18.844867 25.841259 18.427734 25.990234 C 18.020532 26.129279 17.617973 26.238909 17.220703 26.318359 C 16.833364 26.407753 16.466753 26.466294 16.119141 26.496094 C 15.77153 26.535824 15.469162 26.556641 15.210938 26.556641 C 14.764009 26.556641 14.380315 26.482959 14.0625 26.333984 C 13.744684 26.185009 13.482005 25.999749 13.273438 25.78125 C 13.074803 25.552821 12.925492 25.31096 12.826172 25.052734 C 12.726854 24.784577 12.677734 24.535071 12.677734 24.306641 C 12.677734 24.028553 12.71173 23.705366 12.78125 23.337891 C 12.86071 22.970416 12.945766 22.564115 13.035156 22.117188 L 14.912109 13.580078 C 14.961773 13.37151 14.942906 13.209025 14.853516 13.089844 C 14.764126 12.970663 14.631896 12.870466 14.453125 12.791016 L 12.380859 11.867188 L 12.380859 10.839844 L 18.609375 9.9902344 z " /></svg>',
				'fit':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOUR%" d="M 0,12 L0,0 12,0 12,4 6,4 12,10 10,12 4,6 4,12 M20,0 L 32,0 32,12 28,12 28,6 22,12 20,10 26,4 20,4 20,0 M 20,32 L20,28 26,28 20,22 22,20 28,26 28,20 32,20, 32,32 20,32 M 12,32 L 0,32 0,20 4,20 4,26 10,20 12,22 6,28 12,28 12,32" /></svg>'

			}
			return icons[icon].replace(/%COLOUR%/g,(colour||"black"));
		}
		
		// Sort the data
		function sortBy(arr,i,rev){
			yaxis = i;
			order = 1;
			if(typeof rev==="boolean") order = (rev ? -1 : 1); 
			return arr.sort(function (a, b) {
				return a[i] < b[i] ? order : -order;
			});
		}

		this.init();

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
		var nX = Number(north);
		var eX = Number(east);
		a = 6377563.396; // OSGB semi-major
		b = 6356256.91; // OSGB semi-minor
		e0 = 400000; // OSGB easting of false origin
		n0 = -100000; // OSGB northing of false origin
		f0 = 0.9996012717; // OSGB scale factor on central meridian
		e2 = 0.0066705397616; // OSGB eccentricity squared
		lam0 = -0.034906585039886591; // OSGB false east
		phi0 = 0.85521133347722145; // OSGB false north
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
		return L.latLng(phip * 180 / Math.PI, lambdap * 180 / Math.PI)
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



	// Add CommonGround as a global variable
	window.DataMapper = DataMapper;

})(S);	// Self-closing function
