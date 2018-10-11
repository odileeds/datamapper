/* PlaceSearch type-ahead place searching v 0.1 */
(function(S) {

	var scripts = document.getElementsByTagName('script');
	var path = scripts[scripts.length-1].src.split('?')[0];
	var idx = path.lastIndexOf("/");
	var basedir = (idx >= 0) ? path.substr(0,idx+1) : "";

	function PlaceSearch(attr){
		if(!attr) attr = {};
		if(!attr.selector) attr.selector = "header";
		if(!attr.mapper) return {};
		
		this.mapper = attr.mapper;

		var index;
		var centre = {};
		//var regions;
		var lookup = new Array();
		var types = {'h':{'name':'Hamlet','zoom':15},'v':{'name':'Village','zoom':15},'t':{'name':'Town','zoom':14},'c':{'name':'City','zoom':13},'r':{'name':'Road','zoom':18},'a':{'name':'Suburban area','zoom':15},'p':{'name':'Postcode','zoom':18}};

		var _obj = this;

		S(document).ready(function(){

			S(attr.selector).append('<div class="leaflet-control leaflet-bar"><div class="placesearch"><div class="submit" href="#" title="Search for a road or place" role="button" aria-label="Search for a road or place"></div><form class="placeform layersearch pop-left" action="search" method="GET" autocomplete="off"><input class="place" name="place" value="" placeholder="Search for a road or place" type="text" /><div class="searchresults"></div></div></form></div>');

			var el = attr.mapper.target.find('.placesearch');
			var focus = false;

			el.find('form').on('submit',function(e){
				e.preventDefault();
			})
			el.find('.submit').on('click',function(e){
				if(!focus) on();
				else off();
			});
			el.on('wheel',function(e){
				e.stopPropagation();
				e.preventDefault();
			}).on('drag',function(e){
				e.stopPropagation();
				e.preventDefault();
			})

			function on(){
				focus = true;
				el.addClass('typing');
				el.find('.place')[0].focus();
			}
			function off(){
				focus = false;
				el.removeClass('typing');
			}

			el.find('.place').on('focus',function(e){
				if(attr.mapper.map) centre = attr.mapper.map.getCenter();

				if(typeof index==="undefined"){
					S(document).ajax(basedir+"searchcompact.csv",{
						'dataType':'csv',
						'cache': false,
						'success':function(d){
							index = {};
							var d, i, b, j;
							if(typeof d=="string"){
								d = d.split(/[\n\r]/);
								for(i = 1; i < d.length; i++){
									// Split the line by the string length (set by the line number)
									b = d[i].match(new RegExp('.{'+i+'}','g'));
									if(b){
										for(j = 0; j < b.length; j++){
											if(b[j]) index[b[j]] = { loaded: false, loading: false };
										}
									}
								}
							}
						}
					});
				}
			}).on('keyup',function(e){

				e.preventDefault();

				if(e.originalEvent.keyCode==40 || e.originalEvent.keyCode==38){
					// Down=40
					// Up=38
					var li = el.find('.searchresults li');
					var s = -1;
					for(var i = 0; i < li.e.length; i++){
						if(S(li.e[i]).hasClass('selected')) s = i;
					}
					if(e.originalEvent.keyCode==40) s++;
					else s--;
					if(s < 0) s = li.e.length-1;
					if(s >= li.e.length) s = 0;
					el.find('.searchresults .selected').removeClass('selected');
					S(li.e[s]).addClass('selected');
				}else if(e.originalEvent.keyCode==13){
					selectName(el.find('.searchresults .selected'))
				}else{
					// Need to load the data file for the first letter
					var name = this.e[0].value.toLowerCase();
					var shortname = name.replace(/[^A-Za-z0-9]/g,"");

					var part;
					var oktoprocess = true;
					for(var s = 1; s <= shortname.length; s++){
						part = shortname.substr(0,s);
						if(part && index[part] && !index[part].loading && !index[part].loaded){
							index[part].loading = true;
							oktoprocess = false;
							S(document).ajax(basedir+"db/"+part+".csv",{
								'dataType':'csv',
								'cache': false,
								'part': part,
								'index': index,
								'success':function(d,attr){
									attr.index[attr.part].loading = false;
									attr.index[attr.part].loaded = true;
									if(typeof d=="string"){
										d = d.split(/\n/);
										for(var i = 0; i < d.length; i++){
											c = d[i].split(/\,/);
											if(c[0]) lookup.push({'fullname':c[0]+', '+c[1],'name':c[0],'region':c[1],'type':c[2],'lat':parseFloat(c[3]),'lon':parseFloat(c[4])});
										}
									}
									processResult(name);
								}
							});

						}
					}
					if(oktoprocess) processResult(name);
					if(name == "") clearResults();
				}
			});

			function clearResults(){
				// Zap search results
				el.find('.searchresults').html('');
				return this;
			}

			// Select one of the people in the drop down list
			function selectName(selected){
				// Get the ID from the DOM element's data-id attribute
				// Use that to find the index that corresponds to in the "db" hash
				var id = selected.attr('data-id');
				clearResults();
				z = "";
				// Set the zoom level by the type
				if(types[lookup[id].type] && types[lookup[id].type].zoom) z = types[lookup[id].type].zoom;
				if(typeof attr.callback==="function") attr.callback.call((attr.mapper || this),{'lat':lookup[id].lat,'lon':lookup[id].lon,'z':z});
				off();
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

			function greatCircle(lat1,lon1,lat2,lon2){
				var d2r = Math.PI/180;
				lat1 *= d2r;
				lon1 *= d2r;
				lat2 *= d2r;
				lon2 *= d2r;
				var dlat = lat1-lat2;
				var dlon = lon1-lon2;
				// Formula to find arc length in km (radius of Earth is 6378.1 km)
				return Math.acos(Math.abs(Math.sin(lon1) * Math.sin(lon2) + Math.cos(lon1) * Math.cos(lon2) * Math.cos(lat1-lat2)))*6378100;
			}

			function processResult(name){
				var html = "";
				var tmp = new Array();

				if(typeof name==="string" && name.length > 0){
					var words = name.split(/[\s\,]+/);

					// Work out a ranking
					for(var i = 0; i < lookup.length; i++){
						lookup[i].rank = 0;
						var idx = lookup[i].fullname.toLowerCase().indexOf(name);
						if(idx >= 0){
							if(idx==0) lookup[i].rank += 10;
							lookup[i].rank += 1/(Math.abs(lookup[i].fullname.length-name.length)+1);
						}
						lookup[i].id = i;
						for(var w = 0; w < words.length; w++){
							if(lookup[i].region.toLowerCase().indexOf(words[w]) == 0){
								// Add to the rank if it matches. More weighting if the word is near the end
								lookup[i].rank += 5/(words.length-w+1);
							}
							idx = lookup[i].name.toLowerCase().indexOf(words[w]);
							if(idx >= 0){
								if(idx==0) lookup[i].rank += 2;
								else lookup[i].rank += 1;
							}
						}
						// If there is some kind of match we'll work out the distance
						if(lookup[i].rank > 1 && attr.mapper.map){
							d = greatCircle(centre.lat,centre.lng,lookup[i].lat,lookup[i].lon);
							if(typeof d==="number"){
								lookup[i].rank += 1000/(d < 10 ? 10 : d);
								lookup[i].distance = d;
							}
						}else{ lookup[i].distance = -1; }
						if(lookup[i].rank > 0) tmp.push(lookup[i]);
					}

					var tmp = sortBy(tmp,'rank');
					var n = Math.min(tmp.length,10);

				}else{

					// Loop over layers and work out a ranking
					for(var i = 0; i < lookup.length; i++){
						if(lookup[i].name){
							lookup[i].id = i;
							lookup[i].namelc = lookup[i].name.toLowerCase();
							tmp.push(lookup[i]);
						}
					}
					var tmp = sortBy(tmp,'namelc',true);
					var n = tmp.length;
				}
				if(tmp.length > 0){
					el.find('.searchresults li').off('click');
					html = "<ol>";
					for(var i = 0; i < n; i++){
						t = _obj.getType(tmp[i].type);
						str = tmp[i].name+(tmp[i].name == tmp[i].region ? '' : ', '+tmp[i].region)+(tmp[i].type != "r" && tmp[i].type != "a" && tmp[i].type != "p" ? ' ('+t+')' : '');
						if(typeof attr.formatResult==="function") str = attr.formatResult.call((attr.this || _obj),tmp[i]);
						html += '<li data-id="'+tmp[i].id+'" '+(i==0 ? ' class="selected"':'')+'><a href="#" class="padding-small name">'+str+'</a></li>';
					}
					html += "</ol>";
				}
				el.find('.searchresults').html(html);
				var li = el.find('.searchresults li a');
				for(var i = 0 ; i < li.e.length ; i++){
					S(li.e[i]).on('click',function(e){
						e.preventDefault();
						selectName(this.parent());
					});
				}
				return;
			}
		});
		this.getType = function(t){
			if(types[t]) return (types[t].name||"");
			return "";
		}
	}
	
	DataMapper.prototype.addPlaceSearch = function(e){
		// Add PlaceSearch
		var _obj = this;
		this.places = new PlaceSearch({
			'selector': '.leaflet-top.leaflet-right',
			'mapper': this,
			'callback': function(rtn){
				_obj.setView([rtn.lat,rtn.lon],rtn.z);
			}
		});
	};

})(S);	// Self-closing function
