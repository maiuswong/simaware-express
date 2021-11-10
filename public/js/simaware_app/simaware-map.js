const apiserver = 'https://simaware.ca/';
const warnings = {
    'NAT0': 'Oceanic clearance required for entry.  See ganderoceanic.ca for more information.',
    'CZQX1': 'Oceanic clearance required for entry.  See ganderoceanic.ca for more information.',
    'EGGX1': 'Oceanic clearance required for entry.  See ganderoceanic.ca for more information.',
}

// Initializes the map in the #map container
function initializeMap(manual = 0)
{
    // Set storage variables
    plane_array = [];
    active_uids = [];
    active_firs = [];
    icons_array = [];
    firs_array  = [];
    firmarkers_array = [];
    sigmets_array = [];
    active_flight = null; 

    // Initialize the icons that will be used
    initializeIcons();

    // Initialize map data
    initializeFirData();

    // Create the map if it exists.  If not, then it's just a stats page that doesn't need it.
    if($('#map').length)
    {
        map = L.map('map', { zoomControl: false, preferCanvas: true }).setView([30, 0], 3).setActiveArea('active-area');
        map.doubleClickZoom.disable();
        basemap = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}{r}.png', { attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a> | <a href="https://github.com/maiuswong/simaware-express"><i class="fab fa-github"></i> SimAware on GitHub</a> | <b>Not for real-world navigation.</b>', subdomains: 'abcd'}).addTo(map);
        map.attributionControl.setPosition('topright');

        // Make the search box clickable
        $.each(['controls', 'flights-sidebar', 'search-field'], (idx, obj) => {
            el = document.getElementById(obj);
            if(el)
            {
                L.DomEvent.disableClickPropagation(el);
            }
        })

        // Set onclick functions
        map.on('click', function() {
            if(map.hasLayer(active_featuregroup))
            {
                returnToView();
            }
            $('#search-wrapper').hide();
        })
        $('#search-field').click(() => {
            $('#search-wrapper').show();
            var str = $('#search-field').val().toLowerCase();
            $('#search-results').html(compileSearchResults(str));
        });
    }

    // Set FeatureGroups
        plane_featuregroup = new L.FeatureGroup();
        if(!manual) { map.addLayer(plane_featuregroup); }
        atc_featuregroup = new L.FeatureGroup();
        active_featuregroup = new L.FeatureGroup();
        tracons_featuregroup = new L.FeatureGroup();
        locals_featuregroup = new L.FeatureGroup();
        sigmets_featuregroup = new L.FeatureGroup();
        events_featuregroup = new L.FeatureGroup();
}

// Tells Leaflet what icons are available
function initializeIcons()
{
    var icons_list = ['B739'];
    $.each(icons_list, function(idx, icon) {
        icons_array[icon] = new L.divIcon({ className: icon, iconSize: [24, 24] , iconAnchor: [12, 12]});
    })
}

function getBadge(rating)
{
    var txt = '';
    switch(rating)
    {
        case 1:
            txt = 'PPL';
        case 2:
            txt = 'IFR';
        case 3:
            txt = 'CMEL';
        case 4:
            txt = 'ATPL';
    }
    if(txt.length)
    {
        return '<span class="badge bg-warning" style="padding-top: 0.1rem; padding-bottom: 0.1rem; border-radius: 1rem">'+txt+'</span>';
    }
    else
    {
        return '';
    }
}
// Initialize airports
function initializeAirports()
{
    $.getJSON('/livedata/airports.json', function(data){ 
        airports = data; 
    })
}

async function initializeFirData()
{
    let response = await fetch(apiserver + 'api/livedata/countries');
    countries = await response.json();

    response = await fetch(apiserver + 'api/livedata/firs');
    firs = await response.json();

    response = await fetch(apiserver + 'api/livedata/uirs');
    uirs = await response.json();
}

function getAirline(flight)
{
    if(flight.callsign.match(/[A-Z]+/) && typeof airlines[flight.callsign.match(/[A-Z]+/)[0]] !== 'undefined')
    {
        return airlines[flight.callsign.match(/[A-Z]+/)[0]];
    }
}

async function initializeNexrad()
{
    response = await fetch('https://tilecache.rainviewer.com/api/maps.json');
    data = await response.json();
    ts = data[0];
    nexrad = L.tileLayer('https://tilecache.rainviewer.com/v2/radar/'+ts+'/512/{z}/{x}/{y}/6/0_1.png', {
              tileSize: 256,
              opacity: 0.4,
          });
}

// Initialize the FIR Boundaries map
function initializeATC()
{
    // Load the GeoJSON file
    $.ajax({
        url: '/livedata/firboundaries.json',
        xhrFields: {withCredentials: false},
        success: function(data) {

        // Create the geoJSON layer
        firmap = new L.geoJSON(data, {style: {fillColor: '#fff', fillOpacity: 0, weight: 1, color: '#333'}});

        // Store the geoJSON by ICAO and if it is a FSS
        $.each(firmap._layers, function(index, obj) {
        
            // Get the layer
            var layer = firmap.getLayer(index);
            
            // Get the layer properties
            var is_fss = Number(layer.feature.properties.IsOceanic);
            var icao = layer.feature.properties.ICAO;
            
            // Add to the array
            if(typeof firs_array[icao + is_fss] === 'undefined')
                firs_array[icao + is_fss] = [layer];
            else
                firs_array[icao + is_fss].push(layer);
        })

        atc_featuregroup.addLayer(firmap);
    }})
}

// Updates the data based on the current version of live.json
async function refreshFlights(filterName = null, filterCriteria = null)
{
    response = await fetch(apiserver + 'api/livedata/live', { credentials: 'omit' });
    flights = await response.json();
    flights = applyFilter(flights, filterName, filterCriteria);
    newactive_uids = [];
    
    $.each(flights, function(idx, obj)
    {
        // Update current connections
        if(typeof plane_array[obj.uid] !== 'undefined')
        {   
            updateLocation(obj);
        }
        else
        {
            addAircraft(obj);
        }
    });

    // Delete flights if they are no longer present
    for(let uid in plane_array)
    {
        if(!newactive_uids.includes(uid))
        {
            plane_featuregroup.removeLayer(plane_array[uid]);
            delete plane_array[uid];
        }
    }

    // Update the active flight if there is one
    if(active_flight)
    {
        updateFlightsBox(flights[active_flight]);
    }
    active_uids = newactive_uids;
    return flights;

}

function interpolateLoc()
{

    for(uid in plane_array)
    {
        var intervaltime = 5;
        var latlon = plane_array[uid].getLatLng();
        var R = 6378.1;
        var hdg_rad = Math.PI * plane_array[uid].flight.hdg / 180;
        var dist = 1.852 * plane_array[uid].flight.gndspd / 3600 * intervaltime;

        var lat1 = Math.PI * latlon.lat / 180;
        var lon1 = Math.PI * latlon.lng / 180;

        var lat2 = 180 * (Math.asin(Math.sin(lat1) * Math.cos(dist / R) + Math.cos(lat1) * Math.sin(dist / R) * Math.cos(hdg_rad))) / Math.PI;
        var lon2 = 180 * (lon1 + Math.atan2(Math.sin(hdg_rad) * Math.sin(dist / R) * Math.cos(lat1), Math.cos(dist / R) - Math.sin(lat1) * Math.sin(lat2))) / Math.PI;

        plane_array[uid].setLatLng(new L.LatLng(lat2, lon2));
    }
}

// Filter for specific pages
function applyFilter(data, filterName = null, filterCriteria = null)
{
    var filteredData = {};
    if(filterName)
    {
        $.each(data, (idx, obj) => {
            switch(filterName)
            {
                case 'airport':
                    if(obj.dep == filterCriteria || obj.arr == filterCriteria)
                        filteredData[obj.uid] = obj;
                case 'fleet':
                    if(obj.callsign.indexOf(filterCriteria) == 0)
                        filteredData[obj.uid] = obj;
            }
        })
        return filteredData;
    }
    else
    {
        return data;
    }
}

// Adds aircraft to the plane_array
function addAircraft(obj)
{
    // Initialize and get variables
    var plane = L.canvasMarker(new L.LatLng(obj.lat, obj.lon), {
        radius: 16,
        img: {
            url: '/img/aircraft/'+getMarker(obj.aircraft)+'.png',    //image link
            size: [24, 24],     //image size ( default [40, 40] )
            rotate: obj.hdg,         //image base rotate ( default 0 )
            offset: { x: 0, y: 0 }, //image offset ( default { x: 0, y: 0 } )
        },
    });
    plane.uid = obj.uid;
    plane.flight = obj;
    [offset, dir] = getMarkerDirection(obj);
    
    // Set the tooltip
    plane.bindTooltip(getDatablock(obj), {
        offset: offset, 
        direction: dir, 
        permanent: false, 
        className: 'datablock' 
    });

    // Set the onclick action
    plane.on('click', function(e) { L.DomEvent.stopPropagation(e) ; zoomToFlight(this.uid); });

    // Add it to the feature group
    plane_array[plane.uid] = plane;
    plane_featuregroup.addLayer(plane_array[plane.uid]);

    markUID(obj);
}

function getDatablock(obj)
{
    return '<span class="datablock">'+obj.callsign+' '+obj.aircraft+'<br>'+Math.round(Number(obj.alt)/100)*100+' '+obj.gndspd+'<br>'+obj.dep+' '+obj.arr+'</span>';
}

function updateLocation(obj)
{
    // Update the location, heading, and tooltip content
    try{
        plane_array[obj.uid].setLatLng(new L.LatLng(Number(obj.lat), Number(obj.lon)));
        plane_array[obj.uid].options.img.rotate = obj.hdg;
        plane_array[obj.uid]._update();
    } catch(err)
    {
        console.log(obj.uid);
    }
    plane_array[obj.uid].setTooltipContent(getDatablock(obj));

    // Include the new flight object with the markers
    plane_array[obj.uid].flight = obj;

    // If the flight is active, then update the flightpath
    if(typeof flightpath != 'undefined' && active_featuregroup.hasLayer(flightpath) && plane.flight.uid == obj.uid)
    {
        flightpath.addLatLng([obj.lat, obj.lon]);
    }

    // Mark the UID as "handled", i.e. remove it from the active uids list
    markUID(obj);
}

function getMarkerDirection(obj)
{
    // If the plane is heading east, open the tooltip to the right
    if(Number(obj.hdg) < 180)
    {
        offset = L.point(5, 12);
        dir = 'right';
    }
    // Else open to the left
    else
    {
        offset = L.point(-5, 12);
        dir = 'left';
    }
    return [offset, dir];
}

function markUID(obj)
{
    if($.inArray(obj, active_uids) >= 0)
    {
        active_uids.splice(active_uids.indexOf(obj.uid), 1);
    }
    newactive_uids.push(obj.uid);
}

function markFIR(obj)
{
    if($.inArray(obj, active_firs) >= 0)
    {
        active_firs.splice(active_firs.indexOf(obj), 1);
    }
}

function getActiveFIRs()
{
    let active_firs = [];
    for(let id in firs_array)
    {
        if(firs_array[id][0].options.color == '#fff')
        {
            active_firs.push(id);
        }
    }
    return active_firs;
}

// Search for FIR based on callsign
function firSearch(str)
{
    // Brits add extra stuff for relief callsigns.  Remove CTR and FSS suffixes.
    if(str.search('_FSS') >= 0) { var type = 'FSS'; } else { var type = 'CTR' };
    var fstr = str.replace('__', '_').replace('_CTR', '').replace('_FSS', '');
    if(type == 'FSS') // Could be a UIR
    {
        if(typeof uirs[fstr] !== 'undefined')
        {
            return uirs[fstr];
        }
        if(typeof uirs[fstr.split('_')[0]] !== 'undefined')
        {
            return uirs[fstr.split('_')[0]];
        }
    }
    if(typeof firs[fstr] !== 'undefined')
    {
        return firs[fstr];
    }
    if(typeof firs[fstr.split('_')[0]] !== 'undefined')
    {
        return firs[fstr.split('_')[0]];
    }
    if(typeof uirs[fstr] !== 'undefined')
    {
        return uirs[fstr];
    }
    if(typeof uirs[fstr.split('_')[0]] !== 'undefined')
    {
        return uirs[fstr.split('_')[0]];
    }
}

function getCallsign(str)
{
    if(typeof uirs[str] !== 'undefined')
    {
        var fir = uirs[str];
    }
    else
    {
        var fir = firSearch(str);
    } 
    if(typeof fir !== 'undefined')
    {
        if(typeof fir.firs !== 'undefined') // UIRs already have the suffix added
        {
            return fir.name;
        }
        else
        {
            let country = getCountry(fir);
            if(!country || country.radar == '')
            {
                if(country && country.name == 'USA')
                {
                    return fir.name + ' Center';
                }
                else
                {   
                    if(str.search('_FSS'))
                    {
                        return fir.name + ' Radio';
                    }
                    else
                    {
                        return fir.name + ' Centre';
                    }
                }
            }
            else
            {
                return fir.name + ' ' + country.radar;
            }
        }
    }
    else
    {
        return null;
    }
}

function getCallsignByFir(fir, index)
{
    if(fir !== null && typeof fir !== 'undefined') 
    {
        if(fir.icao == 'CZUL')
        {
            return 'Centre de Montréal';
        }
        if(typeof fir.firs !== 'undefined' || fir.name.search('Oceanic') > 0 || fir.name.search('Radar') > 0 || fir.name.search('Control') > 0 || fir.name.search('Centre') > 0) // UIRs already have the suffix added
        {
            return fir.name;
        }
        else
        {
            let country = getCountry(fir);
            if(index[index.length - 1] == '1')
            {
                return fir.name + ' Radio';
            }
            if(!country || country.radar == '')
            {
                if(country && country.name == 'USA')
                {
                    return fir.name + ' Center';
                }
                else
                {   
                    return fir.name + ' Centre';
                }
            }
            else
            {
                return fir.name + ' ' + country.radar;
            }
        }
    }
    else
    {
        return 'Unknown Position';
    }
}

function getTimeOnline(atc)
{
    let start = moment.unix(atc.created_at_timestamp);
    let diff = Math.abs(moment().diff(start, 'minutes', false));

    let hr = Math.floor(diff / 60).toString();
    let min = diff % 60;
    min = min.toString();

    if(min.length < 2)
    {
        min = '0' + min;
    }

    return hr + ':' + min;
    
}

function getCountry(fir)
{
    if(typeof(countries[fir.icao.substring(0, 2)]) !== 'undefined')
    {
        return countries[fir.icao.substring(0, 2)];
    }
    else
    {
        return null;
    }
}

// Online ATC
async function refreshATC()
{
    active_firs = getActiveFIRs();
    newdata = {};
    response = await fetch(apiserver + 'api/livedata/onlinefirs');
    sectors = await response.json();
    // $.each(data, (idx, fir) => {
    //     index = getFirIndex(fir);
    //     firObj = firs_array[index];
    //     firname = fir.fir.name;
    //     firicao = fir.fir.icao;
    //     lightupFIR(firObj, fir.members, firname, firicao, index);
    //     markFIR(index);
    // })

    // $.each(active_firs, (idx, fir) => {
    //     firObj = firs_array[fir];
    //     turnOffFIR(firObj);
    // })
    $.each(sectors, (idx, atc) => {
        let fir = firSearch(atc.callsign)
        if(fir && typeof fir.firs === 'undefined') // fir is null if we can't find anything.  Do UIRs after.
        {
            let index = getFirIndexByCallsign(atc.callsign);
            atc.time_online = getTimeOnline(atc);
            if(typeof newdata[index] === 'undefined')
            {
                let row = {};
                row.firname = getCallsignByFir(fir, index);
                row.members = [atc];
                row.firicao = fir.icao;
                row.firObj = firs_array[index];
                newdata[index] = row;
            }
            else
            {
                newdata[index].members.push(atc);
            }
        }
    })
    $.each(sectors, (idx, atc) => {
        let fir = firSearch(atc.callsign)
        atc.time_online = getTimeOnline(atc);
        if(fir && typeof fir.firs !== 'undefined') // fir is null if we can't find anything.  Doing UIRs now.
        {
            atc.fssname = fir.name;
            $.each(fir.firs, (idx, firicao) => {
                console.log(firicao);
                let index = getFirIndexByCallsign(firicao);
                if(typeof newdata[index] === 'undefined')
                {
                    let row = {};
                    row.firname = getCallsignByFir(firSearch(firicao), index);
                    row.members = [atc];
                    row.firicao = firicao;
                    row.firObj = firs_array[index];
                    newdata[index] = row;
                }
                else
                {
                    newdata[index].members.push(atc);
                }
            })
        }
    })
    // Breaking it up into two since oceanics tend to overlap smaller facilities, rendering them un-hoverable
    $.each(newdata, (index, fir) => {
        if(fir.firname.search('Oceanic') > 1)
        {
            var firObj = fir.firObj;
            var firname = fir.firname;
            var firicao = fir.firicao;
            lightupFIR(firObj, fir.members, firname, firicao, index);
            markFIR(index);
        }
    })

    $.each(newdata, (index, fir) => {
        if(fir.firname.search('Oceanic') == -1)
        {
            var firObj = fir.firObj;
            var firname = fir.firname;
            var firicao = fir.firicao;
            lightupFIR(firObj, fir.members, firname, firicao, index);
            markFIR(index);
        }
    })

    $.each(active_firs, (idx, fir) => {
        firObj = firs_array[fir];
        turnOffFIR(firObj, fir);
    })

    response = await fetch(apiserver + 'api/livedata/tracons');
    tracons = await response.json();

    if(atc_featuregroup.hasLayer(tracons_featuregroup))
    {
        atc_featuregroup.removeLayer(tracons_featuregroup); tracons_featuregroup = new L.FeatureGroup();
    }

    $.each(tracons, (idx, trac) => {
        
        var newCircle = new L.circle([trac.loc.lat, trac.loc.lon],
        {
            radius: 60 * 1000,
            weight: 1.25,
            fillOpacity: 0,
            color: '#40e0d0'
        })
        newCircle.bindTooltip(getTraconBlock(trac), {opacity: 1});
        tracons_featuregroup.addLayer(newCircle);
    })
    atc_featuregroup.addLayer(tracons_featuregroup);

    response = await fetch(apiserver + 'api/livedata/locals');
    locals = await response.json();

    if(atc_featuregroup.hasLayer(locals_featuregroup))
    {
        atc_featuregroup.removeLayer(locals_featuregroup); locals_featuregroup = new L.FeatureGroup();
    }

    $.each(locals, (idx, local) => {
        
        var lat = local.loc.lat;
        var lon = local.loc.lon;
        var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getLocalTooltip(local.loc.icao), iconSize: 'auto'});
        oloc = new L.marker([lat, lon],
        {
          icon: di,
        })
        oloc.bindTooltip(getLocalBlock(local.loc.icao), {opacity: 1});
        locals_featuregroup.addLayer(oloc);
    })
    for(icao in eventsByAirport) 
    {
        if(typeof locals[icao] == 'undefined' && airports[icao])
        {
            var lat = airports[icao].lat;
            var lon = airports[icao].lon;
            var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getLocalTooltip(icao), iconSize: 'auto'});
            oloc = new L.marker([lat, lon],
            {
                icon: di,
            })
            oloc.bindTooltip(getLocalBlock(icao), {opacity: 1});
            locals_featuregroup.addLayer(oloc);
        }
    }
    atc_featuregroup.addLayer(locals_featuregroup);
    
}

// Update Convective Sigmets
async function updateSigmet()
{
    response = await fetch(apiserver + 'api/wxdata/sigmet');
    data = await response.json();
    
    for(let sigmet in sigmets_array)
    {
        sigmets_featuregroup.removeLayer(sigmets_array[sigmet]);
    }

    $.each(data.AIRSIGMET, (idx, sigmet) => {
        if(sigmet.hazard['@attributes'].type == 'CONVECTIVE')
        {
            let latlon = [];
            let code = getSigmetCode(sigmet);
            $.each(sigmet.area.point, (idx, point) => {
                latlon.push([point.latitude, point.longitude]);
            })
            if(code != '')
            {
                sigmets_array[code] = new L.Polygon(latlon, {color: '#ffcc33', weight: 1.5});
                sigmets_array[code].bindTooltip(getSigmetBlock(sigmet), {opacity: 0.9})
                sigmets_featuregroup.addLayer(sigmets_array[code]);
            }
        }
    })
}

function getSigmetBlock(sigmet)
{
    list = '<div class="card bg-dark text-white"><div class="card-header ps-2" style="background-color: #efa31d"><h5 class="mb-0" style="color: #fff">Convective SIGMET '+getSigmetCode(sigmet)+'</h5></div><div class="p-2"><small style="font-family: \'JetBrains Mono\', sans-serif; font-size: 0.65rem; color: #aaa">'+nl2br(sigmet.raw_text)+'</div></div>';
    return list;
}

function getSigmetCode(sigmet)
{
    var spl = sigmet.raw_text.split(/\r?\n/);
    return spl[2].split(' ')[2];
}

// Light up a FIR on the firmap
function lightupFIR(obj, firMembers, firname, firicao, index)
{
    if(typeof obj === 'object')
    {
        var firmarkers_array_temp = [];
        for(idx in obj)
        {
            obj[idx].setStyle({color: '#fff', weight: 1.5, fillColor: '#000', fillOpacity: 0});

            // Add a marker and tooltip
            latlng = obj[idx].getBounds().getCenter();
            var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getFirTooltip(firicao, index), iconAnchor: ['50%', '50%'], iconSize: 'auto'});

            // Add a marker if it doesn't exist
            if(firmarkers_array[index] === undefined)
            {
                firmarkers_array_temp[idx] = new L.marker(latlng, { icon: di });
                firmarkers_array_temp[idx].bindTooltip(getControllerBlock(obj[idx], firMembers, firname, firicao, index), {opacity: 1, sticky: true});
            }
            // If it does, just update the text of the marker.
            else
            {
                $.each(firmarkers_array[index], (idx2, obj) => {
                    firmarkers_array[index][idx2].bindTooltip(getControllerBlock(obj[idx], firMembers, firname, firicao, index), {opacity: 1, sticky: true});
                })
            }
            
            obj[idx].bringToFront();
        }
        if(firmarkers_array[index] === undefined)
        {
            firmarkers_array[index] = firmarkers_array_temp;
            for(idx in firmarkers_array[index])
            {
                atc_featuregroup.addLayer(firmarkers_array[index][idx]);
            }
        }
    }
}

// Disable a FIR on the firmap
function turnOffFIR(obj, index)
{
    if(typeof obj === 'object')
    {
        $.each(obj, function(idx, fir)
        {
            fir.setStyle({color: '#333', weight: 1}).bringToBack();
            for(idx in firmarkers_array[index])
            {
                atc_featuregroup.removeLayer(firmarkers_array[index][idx]);
            }
            firmarkers_array[index] = undefined;
        });
    }
}

function getFirIndex(fir)
{
    var index = fir.fir.icao + Number(fir.fir.is_fss);
    if(typeof firs_array[index] === 'undefined')
    {
        // Try is_fss = 0
        index = fir.fir.icao + '0';
    }
    return index;
}

function getFirIndexByCallsign(callsign)
{
    if(callsign.search('_FSS') > 0)
    {
        var type = 1;
    }
    else
    {
        var type = 0;
    }
    let fir = firSearch(callsign);
    if(fir !== null && typeof fir !== 'undefined')
    {
        if(typeof firs_array[fir.icao + type] !== 'undefined')
        {
            return fir.icao + type;
        }
        else if(typeof firs_array[fir.icao + '0'] !== 'undefined')
        {
            return fir.icao + '0';
        }
    }
    return null;
}

// Get the local colour
function getLocalColor(obj)
{
    if(obj.TWR)
    {
        return red;
    }
    else if(obj.GND)
    {
        return green;
    }
    else if(obj.DEL)
    {
        return blue;
    }
    else if(obj.ATIS)
    {
        return yellow;
    }
    else
    {
        return '#999';
    }
}

function getFirTooltip(icao, index)
{
    var tt = '<div onmouseenter="highlightFIR(\''+index+'\')" onmouseleave="dehighlightFIR(\''+index+'\')" style="top: -50%; left: -50%; position: relative; border-radius: 1rem; background-color: rgba(153,153,153,0.7); border: 1.5px solid #fff; display: flex; flex-direction: column; justify-content: center;"><table style="margin: 0.2rem; align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.6rem; overflow: hidden; font-weight: bold"><tr><td class="text-light" style="padding: 0px 5px; white-space: nowrap">'+icao+'</td></tr></table></div>';
    return tt;
}

function highlightFIR(index)
{
    $.each(firs_array[index], (idx, obj) => {
        obj.setStyle({fillColor: '#fff', fillOpacity: 0.3});
    })
}
function dehighlightFIR(index)
{
    $.each(firs_array[index], (idx, obj) => {
        obj.setStyle({fillOpacity: 0});
    })
}

// Get Local Tooltip
// function getLocalTooltip(obj)
// {
//     var tt = '<table class="bg-white" style="font-family: \'Jost\', sans-serif; font-size: 0.7rem; border-radius: 1rem; overflow: hidden;"><tr><td style="padding: 0px 5px;">'+obj.loc.icao+'</td>';
//     if(obj.DEL)
//     {
//         tt += '<td class="text-white bg-primary" style="padding: 0px 5px">D</td>';
//     }
//     if(obj.GND)
//     {
//         tt += '<td class="text-white bg-success" style="padding: 0px 5px">G</td>';
//     }
//     if(obj.TWR)
//     {
//         tt += '<td class="text-white bg-danger" style="padding: 0px 5px">T</td>';
//     }
//     if(obj.ATIS)
//     {
//         tt += '<td class="text-white bg-warning" style="padding: 0px 5px">A</td>';
//     }

//     tt += '</tr></table>';

//     return tt;
// }

function getLocalTooltip(icao)
{
    if(locals[icao])
    {
        var obj = locals[icao];
    }
    else
    {
        var obj = [];
        obj.loc = [];
        obj.loc.icao = icao;
    }
    ct = 0;
    tt = '';
    if(obj.DEL)
    {
        tt += '<td class="text-white" style="background-color: '+blue+'; text-align: center; padding: 0px 5px">D</td>';
        ct += 1;
    }
    if(obj.GND)
    {
        tt += '<td class="text-white" style="background-color: '+green+'; text-align: center; padding: 0px 5px">G</td>';
        ct += 1;
    }
    if(obj.TWR)
    {
        tt += '<td class="text-white" style="background-color: '+red+'; text-align: center; padding: 0px 5px">T</td>';
        ct += 1;
    }
    if(obj.ATIS)
    {
        tt += '<td class="text-white" style="background-color: '+yellow+'; text-align: center; padding: 0px 5px">A</td>';
        ct += 1;
    }
    if(tt != '')
    {
        tt = '<table style="margin: 0.2rem; margin-top: 0rem; flex: 1; border-radius: 0.18rem; overflow: hidden; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.6rem; overflow: hidden; font-weight: bold"><tr>'+tt+'</tr></table>';
    }    
    // If event, apply a border
    if(eventsByAirport[icao])
    {
        var event = '<div style="position: absolute; top: -5; right: -5; border-radius: 5px; width: 10; height: 10; background-color: '+red+'"></div>';
    }
    else
    {
        var event = '';
    }
    var tt = '<div style="position: relative; border-radius: 0.2rem; background-color: rgba(255,255,255,0.1); display: flex; flex-direction: column; justify-content: center;">'+event+'<table style="margin: 0.2rem; align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.6rem; overflow: hidden; font-weight: bold"><tr><td colspan="'+ct+'" class="text-light" style="padding: 0px 5px">'+obj.loc.icao+'</td></tr></table>'+tt+'</div>';



    return tt;
}

// Get the Local Block
function getLocalBlock(icao)
{
    if(locals[icao])
    {
        var obj = locals[icao];
        if(obj.loc.city == obj.loc.country)
        {
            city = obj.loc.city;
        }
        else if(obj.loc.state)
        {
            city = obj.loc.city + ', ' + obj.loc.state; 
        }
        else
        {
            city = obj.loc.city + ', ' + obj.loc.country;
        }
    }
    else
    {
        var obj = [];
        obj.loc = [];
        obj.loc.icao = icao;
        if(airports[icao])
        {
            city = airports[icao].city;
            obj.loc.name = airports[icao].name;
        }
    }
    ct = 0;
    tt = '';

    var list = '<table style="width: 100%; color: #eee; font-size: 0.9rem"><tr><td colspan="6" class="pb-1" style="font-size: 1rem; font-weight: 400; white-space: nowrap"><p class="mb-0">'+obj.loc.name+'</p><small class="text-muted mt-0" style="font-size: 0.8rem">'+city+'</small></td></tr>';
    if(obj.DEL)
    {
        $.each(obj.DEL, (idx, item) => {
            list += '<tr><td style="display: flex; flex-direction: column"><div class="badge" style="background-color: '+blue+'; border-radius: 0.18rem; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;">DEL</div></td><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+item.callsign+'</td><td class="px-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+item.name+'</td><td class="text-primary" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.time_online+'</td></tr>';
        })
    }
    if(obj.GND)
    {
        $.each(obj.GND, (idx, item) => {
            list += '<tr><td style="display: flex; flex-direction: column"><div class="badge" style="background-color: '+green+'; border-radius: 0.18rem; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;">GND</div></td><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+item.callsign+'</td><td class="px-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+item.name+'</td><td class="text-primary" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.time_online+'</td></tr>';
        })
    }
    if(obj.TWR)
    {
        $.each(obj.TWR, (idx, item) => {
            list += '<tr><td style="display: flex; flex-direction: column"><div class="badge" style="background-color: '+red+'; border-radius: 0.18rem; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;">TWR</div></td><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+item.callsign+'</td><td class="px-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+item.name+'</td><td class="text-primary" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.time_online+'</td></tr>';
        })
    }
    if(obj.ATIS)
    {
        $.each(obj.ATIS, (idx, item) => {
            list += '<tr><td rowspan="2" style="vertical-align:top"><div style="display: flex; flex-direction: column"><div class="badge" style="background-color: '+yellow+'; border-radius: 0.18rem; border-bottom-left-radius: 0; border-bottom-right-radius: 0; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;">ATIS</div><div class="badge" style="background-color: #181818;  border-radius: 0.18rem;border-top-left-radius: 0; border-top-right-radius: 0; font-size: 1.6rem; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;"">'+getAtisCode(item.atis, item.icao)+'</div></div></td><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+item.callsign+'</td><td class="px-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+item.name+'</td><td class="text-primary" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.time_online+'</td></tr><tr><td colspan="4" style="color: #ccc; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem">'+item.atis+'</td></tr>';
        })
    }

    eventslist = '';
    if(eventsByAirport[icao])
    {
        eventslist = '<tr><td colspan="2">Upcoming Events</td></tr>';
        for(id in eventsByAirport[icao])
        {
            eventslist += '<tr><td class="pe-3 py-1"><table style="overflow: hidden; border: 1px solid '+blue+'; font-family: \'JetBrains Mono\', sans-serif; background-color: #0d628c"><tr><td style="background-color: #105070; text-transform: uppercase; font-size: 0.6rem; text-align: center">'+moment(eventsByAirport[icao][id].start).format('MMM')+'</td></tr><tr><td style="min-width: 35px; text-align: center; font-size: 0.8rem">'+moment(eventsByAirport[icao][id].start).format('D')+'</td></tr></table></td><td style="font-size: 0.9rem; white-space: nowrap">'+eventsByAirport[icao][id].name+'<br><small class="text-muted" style="font-family: \'JetBrains Mono\', sans-serif">'+moment(eventsByAirport[icao][id].start).format('HHmm')+' - '+ moment(eventsByAirport[icao][id].end).format('HHmm') +'Z</small></td></tr>';
        }
    }
    

    list = '<div class="card border border-secondary" style="background-color: #282828; min-width: 300px; overflow: hidden"><div class="p-2">'+list+'</table></div>';
    if(eventsByAirport[icao])
    {
        list += '<div class="p-2" style="background-color: #333"><table>'+eventslist+'</table></div>';
    }
    list += '</div>';
    return list;
}

// Get the controller block
function getControllerBlock(firObj, firMembers, firname, firicao, index)
{
    var list = '<table style="width: 100%; color: #333; font-size: 0.9rem"><tr><td colspan="4" style="font-size: 1rem; font-weight: 600; white-space: nowrap"><span class="text-muted">'+firicao+'</span> '+firname+'</td></tr>';
    if(warnings[index])
    {
        list += '<tr><td colspan="3" class="small text-muted pt-0"><i class="fas fa-info-circle"></i> '+warnings[index]+'</td></tr>';
    }
    $.each(firMembers, function(idx, member) {
        if(member.fssname)
        {
            list = list+'<tr><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; color: #9370DB; white-space: nowrap">'+member.callsign+'<i style="display: inline; color: #9370db" class="ms-1 fas fa-caret-square-down"></i></td><td class="px-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+member.name+'</td><td class="text-primary" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+member.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+member.time_online+'</td></tr>';
            list = list+'<tr><td colspan="4" class="small text-muted pt-0" style="line-height: 0.9rem;"><b style="color: #9370db">'+member.fssname+'</b> covers '+firicao+' above FL245</td></tr>';
        }
        else
        {
            list = list+'<tr><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+member.callsign+'</td><td class="px-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+member.name+'</td><td class="text-primary" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+member.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+member.time_online+'</td></tr>';
        }
    })
    list = '<div class="card"><div class="p-2" style="color: #222; background-color: #eee">'+list+'</table></div></div>';
    return list;
}

function getTraconBlock(obj)
{
    tracon_name = obj.name;
    list = '<table style="width: 100%; color: #333; font-size: 0.9rem"><tr><td colspan="3" style="font-size: 1rem; font-weight: 600">'+tracon_name+'</td></tr>';
    $.each(obj.APP, function(idx, subobj) {
        list = list+'<tr><td style="font-family: \'JetBrains Mono\', sans-serif">'+subobj.callsign+'</td><td class="px-3" style="text-align: right; white-space: nowrap;">'+subobj.name+'</td><td class="pl-3 text-primary" style="font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+subobj.time_online+'</td></tr>';
    })
    $.each(obj.DEP, function(idx, subobj) {
        list = list+'<tr><td style="font-family: \'JetBrains Mono\', sans-serif">'+subobj.callsign+'</td><td class="px-3" style="text-align: right; white-space: nowrap;">'+subobj.name+'</td><td class="pl-3 text-primary" style="font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+subobj.time_online+'</td></tr>';
    })
    list = '<div class="card"><div class="p-2" style="color: #222; background-color: #eee">'+list+'</table></div></div>';
    return list;
}

async function loadAirlines()
{
    response = await fetch('/livedata/airlines.json');
    airlines = await response.json();
    airlinesByIcao = {};
    $.each(airlines, (idx, airline) => {
        airlinesByIcao[airline.icao] = airline;
    })
    return airlinesByIcao;
}

// Zoom to a flight
async function zoomToFlight(uid)
{

    // If the map isn't available, will need to redirect to a page that does.
    if(!$('#map').length)
    {
        window.location.href = '/?uid='+uid;
    }

    if(typeof plane != 'undefined')
    {
        active_featuregroup.removeLayer(plane); delete plane;
    }
    if(typeof dep_point != 'undefined')
    {
        active_featuregroup.removeLayer(dep_point); delete dep_point;
    }
    if(typeof arr_point != 'undefined')
    {
        active_featuregroup.removeLayer(arr_point); delete arr_point;
    }
    if(typeof flightpath != 'undefined')
    {
        active_featuregroup.removeLayer(flightpath); delete flightpath;
    }

    plane = plane_array[uid];
    active_flight = uid;
    bounds = []; bounds.push(plane.getLatLng());

    // Refresh the flights before showing
    refreshFlights(filterName, filterCriteria);

    // If the searchbox is showing, hide it
    $('#search-wrapper').hide();

    // If currently in the airports view, hide ap appropriately
    if(typeof ap_featuregroup !== 'undefined')
    {
        $('#airport-sidebar').hide();
    }

    // Handle departure/arrival airports
    [dep_airport, dep_point, dep_name, dep_city] = processAirport(plane.flight.dep);
    [arr_airport, arr_point, arr_name, arr_city] = processAirport(plane.flight.arr);
    if(dep_point && arr_point)
    {   
        [dep_point, arr_point] = processAirportForAntimeridian(plane.flight, airports[dep_airport], airports[arr_airport], dep_point, arr_point);
    }

    if(dep_point && dep_point != null)
    {
        active_featuregroup.addLayer(dep_point); bounds.push(dep_point.getLatLng());
    }
    if(arr_point && arr_point != null)
    {
        active_featuregroup.addLayer(arr_point); bounds.push(arr_point.getLatLng());
    }

    map.fitBounds(bounds);

    // Swap the layers
    map.addLayer(active_featuregroup);

    // If it's the ap layer, hide that; else hide plane_featuregroup
    if(typeof ap_featuregroup !== 'undefined' && map.hasLayer(ap_featuregroup))
    {
        map.removeLayer(ap_featuregroup);
    }
    else
    {
        map.removeLayer(plane_featuregroup);
    }
    

    if(typeof polyline_featuregroup != 'undefined' && map.hasLayer(polyline_featuregroup))
    {
        map.removeLayer(polyline_featuregroup);
    }
    
    // Add the plane
    active_featuregroup.addLayer(plane);

    // Make the tooltip permanent
    togglePlaneTooltip(plane, true);

    // Show the flights box
    $('#flights-sidebar').show().addClass('d-flex');

    // Update the flights box
    updateFlightsBox(plane.flight);

    // Hide the sidebar
    $('#sidebar').hide();

    addedFlightPathPromise = addFlightPath('https://simaware.ca/api/logs/' + uid, airports[dep_airport], airports[arr_airport], plane.flight);
    await addedFlightPathPromise;
}

async function addFlightPath(url, dep, arr, flight)
{
    var response = await fetch(url);
    var latlons = await response.json();
    flightpath = await new L.Polyline(adjustLogsForAntimeridian(flight, dep, arr, latlons), {color: '#00D300', weight: 1.5, nowrap: true});
    await active_featuregroup.addLayer(flightpath);
}

// Toggles the plane tooltip's <permanent> property
function togglePlaneTooltip(plane, tf)
{
    plane.unbindTooltip();
    [offset, dir] = getMarkerDirection(plane.flight);
    plane.bindTooltip(getDatablock(plane.flight), {permanent: tf, direction: dir, offset: offset});
}

// Get airports
function processAirport(icao)
{
    if(airports[icao])
    {
        var return_point = L.circleMarker(new L.LatLng(airports[icao].lat, airports[icao].lon), {
            radius: 2,
            stroke: false,
            fillColor: '#00d300',
            fillOpacity: 1,
        });
        return_point.bindTooltip(airports[icao].iata, {permanent: true, className: 'tooltip-airport'})
        var return_array = [icao, return_point, airports[icao].name, airports[icao].city];
    }
    else
    {
        return_array = [icao, null, 'Unknown Airport', 'Unknown City'];
    }
    return return_array;
}

async function returnToView()
{
    // Wait for the map to finish loading
    if(map.hasLayer(active_featuregroup))
    {
        // Get the plane object ready to be placed back
        togglePlaneTooltip(plane, false);
        plane_featuregroup.addLayer(plane);

        // Switch the layers
        map.removeLayer(active_featuregroup);
        if(!manual) {
            if(typeof ap_featuregroup !== 'undefined')
            {
                map.addLayer(ap_featuregroup);
                $('#airport-sidebar').show();
            }
            else
            {
                map.addLayer(plane_featuregroup); 
            }
        }

        // Delete the active featuregroup
        delete active_featuregroup;
        active_featuregroup = new L.FeatureGroup();

        // Hide the flight information box
        $('#flights-sidebar').hide().removeClass('d-flex');

        // Return the sidebar if it exists on the page
        $('#sidebar').show();

        // Remove active flight tag
        active_flight = null;
    }
    if(typeof polyline_featuregroup != 'undefined')
    {
        map.addLayer(polyline_featuregroup);
    }
}

// Update the flights box
function updateFlightsBox(flight)
{

    // Update the callsign
    $('#flights-callsign').html(flight.callsign);

    // Get status of the flight
    flight_status = getStatus(flight);

    // Update the live stats
    $('.flights-liveitem#spd').html(flight.gndspd+' kt');
    $('.flights-liveitem#alt').html(flight.alt+' ft');
    $('.flights-liveitem#togo').html(Math.round(getDtg(flight))+' nm');

    // Update status text and colors
    $('#flights-status').html(flight_status.status);
    $('#flights-status').css({ 'background-color': flight_status.color });
    $('#flights-progressbar-plane').css({ 'color': flight_status.color });
    $('#flights-progressbar-elapsed').css({ 'background-color': flight_status.color });
    if(flight_status.blink)
    {
        $('#flights-progressbar-plane').addClass('blinking');
    }
    else
    {
        $('#flights-progressbar-plane').removeClass('blinking');
    }

    // Update the airports
    [dep_airport, dep_point_, dep_name, dep_city] = processAirport(plane.flight.dep);
    [arr_airport, arr_point_, arr_name, arr_city] = processAirport(plane.flight.arr);

    $('#flights-dep-icao').html(dep_airport); $('#flights-airport-dep').html(dep_name+'<br><span class="text-muted">'+dep_city+'</span>');
    $('#flights-arr-icao').html(arr_airport); $('#flights-airport-arr').html(arr_name+'<br><span class="text-muted">'+arr_city+'</span>');

    // Set the progress bar correctly
    $('#flights-progressbar-elapsed').css({ width: getElapsedWidth(flight) + '%' });

    // Route
    $('#flights-route').html(flight.route);

    // Equipment
    $('#flights-equipment').html(flight.aircraft);

    // Name
    $('#flights-name').html('<span class="me-2">'+flight.name+'</span>'+getBadge(flight.rating));

}

function processAirportForAntimeridian(flight, dep, arr, dep_point, arr_point)
{
    if(crossesAntimeridian(dep, arr))
    {

        dep_latlon = dep_point.getLatLng();
        arr_latlon = arr_point.getLatLng();
        if(Number(flight.lon) > 0)
        {
            if(Number(arr_latlon.lng) < 0) { arr_latlon.lng += 360; }
            if(Number(dep_latlon.lng) < 0) { dep_latlon.lng += 360; }
        }
        if(Number(flight.lon) < 0)
        {
            if(Number(arr_latlon.lng) > 0) { arr_latlon.lng -= 360; }
            if(Number(dep_latlon.lng) > 0) { dep_latlon.lng -= 360; }
        }

        dep_point.setLatLng(dep_latlon);
        arr_point.setLatLng(arr_latlon);

    }

    return [dep_point, arr_point];
}

function crossesAntimeridian(dep, arr)
{
  flag = 0;
  if(dep == null || arr == null)
  {
    return 0;
  }
  if(Number(arr.lon) < Number(dep.lon) && getRhumbLineBearing(Number(dep.lat), Number(dep.lon), Number(arr.lat), Number(arr.lon)) < 180)
  {
    // Probably crossing antimeridian eastbound
    flag = 1;
  }
  else if(Number(arr.lon) > Number(dep.lon) && getRhumbLineBearing(Number(dep.lat), Number(dep.lon), Number(arr.lat), Number(arr.lon)) >= 180)
  {
    // Probably crossing antimeridian westbound
    flag = -1;
  }
  return flag;
}

function adjustLogsForAntimeridian(flight, dep, arr, logs)
{
    newLogs = [];
    if(crossesAntimeridian(dep, arr))
    {
        newLogs = [];
        $.each(logs, function(idx, obj) {
            lat = Number(obj[0]);
            if(Number(flight.lon) < 0 && Number(obj[1]) > 0)
            {
                lon = Number(obj[1]) - 360;
            }
            else if(Number(flight.lon) > 0 && Number(obj[1]) < 0)
            {
                lon = Number(obj[1]) + 360;
            }
            else
            {
                lon = Number(obj[1]);
            }
            newLogs.push([lat, lon]);
        })
    }
    else
    {
        newLogs = logs;
    }
    return newLogs;
}

async function toggleATC()
{
    if(!map.hasLayer(atc_featuregroup))
    {
        map.addLayer(atc_featuregroup);
        await refreshATC();
        setLayerOrder();
        $('.map-button#atc').addClass('map-button-active');
    }
    else
    {
        map.removeLayer(atc_featuregroup);
        $('.map-button#atc').removeClass('map-button-active');
    }
}

function setLayerOrder()
{
    // Don't do anything unless the map is loaded
    if($('#map').length)
    {
        if(map.hasLayer(sigmets_featuregroup))
        {
            sigmets_featuregroup.bringToFront();
        }
        if(map.hasLayer(plane_featuregroup))
        {
            plane_featuregroup.bringToFront();
        }
        else if(map.hasLayer(active_featuregroup))
        {
            active_featuregroup.bringToFront();
        }
    }
}

function toggleNexrad()
{
    if(!map.hasLayer(nexrad))
    {
        map.addLayer(nexrad);
        $('.map-button#wx').addClass('map-button-active');
    }
    else
    {
        map.removeLayer(nexrad);
        $('.map-button#wx').removeClass('map-button-active');
    }
}

function toggleSigmet()
{
    if(!map.hasLayer(sigmets_featuregroup))
    {
        map.addLayer(sigmets_featuregroup);
        $('.map-button#sigmet').addClass('map-button-active');
        setLayerOrder();
    }
    else
    {
        map.removeLayer(sigmets_featuregroup);
        $('.map-button#sigmet').removeClass('map-button-active');
        setLayerOrder();
    }
}

function getAircraftIcao(str)
{
  ac = str.split('/');
  if(ac.length >= 3)
  {
    return ac[1];
  }
  else
  {
    return ac[0];
  }
}

function getMarker(str)
{
  ac = getAircraftIcao(str);
  switch(ac)
  {
    case 'A318':
    case 'A319':
    case 'A320':
    case 'A321':
      return 'A320';
    case 'B731':
    case 'B732':
    case 'B733':
    case 'B734':
    case 'B735':
    case 'B736':
    case 'B737':
    case 'B738':
      return 'B738';
    case 'B739':
      return 'B739';
    case 'B741':
    case 'B742':
    case 'B743':
    case 'B744':
    case 'B748':
      return 'A340';
    case 'B752':
    case 'B753':
      return 'B752';
    case 'B762':
    case 'B763':
    case 'B772':
    case 'B77L':
    case 'B773':
    case 'B77W':
      return 'B777';
    case 'MD82':
    case 'MD83':
    case 'MD88':
    case 'B712':
    case 'MD90':
    case 'CRJ2':
    case 'CRJ7':
    case 'CRJ9':
      return 'CRJ9';
    default:
      return 'A320';
  }

}

// Helper functions
function nl2br (str, is_xhtml) {   
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';    
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
}