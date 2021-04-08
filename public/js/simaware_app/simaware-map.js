const apiserver = 'https://simaware.ca/';

// Initializes the map in the #map container
function initializeMap(filterName = null, filterCriteria = null)
{
    // Set storage variables
    plane_array = [];
    active_uids = [];
    icons_array = [];
    firs_array  = [];

    // Initialize the icons that will be sued
    initializeIcons();

    // Load the flights once
    refreshFlights(filterName, filterCriteria);

    // Create the map
    map = L.map('map', {zoomControl: false}).setView([30, 0], 3).setActiveArea('active-area');
    map.doubleClickZoom.disable();
    basemap = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}{r}.png', { attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a> <b>Not for real-world navigation.</b>', subdomains: 'abcd'}).addTo(map);
    map.attributionControl.setPosition('topright');

    // Make the search box clickable
    el = document.getElementById('search-field');
    L.DomEvent.disableClickPropagation(el);
    
    // Set FeatureGroups
    plane_featuregroup = new L.MarkerClusterGroup({
        disableClusteringAtZoom: 5,
        spiderfyOnMaxZoom: false,
    }).addTo(map);
    atc_featuregroup = new L.FeatureGroup();
    active_featuregroup = new L.FeatureGroup();
    tracons_featuregroup = new L.FeatureGroup();

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
        $('#search-results').html('<tr><td class="px-3 text-muted">Begin typing to search</td></tr>');
    });

    // Set timer to auto-update
    setInterval(refreshFlights(filterName, filterCriteria), 60 * 1000);
}

// Tells Leaflet what icons are available
function initializeIcons()
{
    var icons_list = ['B739'];
    $.each(icons_list, function(idx, icon) {
        icons_array[icon] = new L.divIcon({ className: icon, iconSize: [24, 24] , iconAnchor: [12, 12]});
    })
}

// Initialize airports
function initializeAirports()
{
    $.getJSON('/livedata/airports.json', function(data){ 
        airports = data; 
    })
}

function initializeNexrad()
{
    $.ajax({
        url: 'https://tilecache.rainviewer.com/api/maps.json',
        success: function(data)
        {
          ts = data[0];
          nexrad = L.tileLayer('https://tilecache.rainviewer.com/v2/radar/'+ts+'/512/{z}/{x}/{y}/6/0_1.png', {
              tileSize: 256,
              opacity: 0.4,
          });
        }
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
        firmap = new L.geoJSON(data, {style: {fillColor: 'none', weight: 1, color: '#333'}});

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
function refreshFlights(filterName = null, filterCriteria = null)
{
    $.ajax({
        url: apiserver + 'api/livedata/live', 
        xhrFields: {withCredentials: false},
        success: function(data)
        {
            // If a filter exists, apply it
            flights = applyFilter(data, filterName, filterCriteria);
            uids = [];
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
        }
    });
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
    var plane = new L.marker(new L.LatLng(Number(obj.lat), Number(obj.lon)), {
        icon: icons_array['B739'],
        rotationAngle: Number(obj.hdg),
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
    plane.on('click', function() { zoomToFlight(this.uid); });

    // Add it to the feature group
    plane_array[plane.uid] = plane;
    plane_featuregroup.addLayer(plane_array[plane.uid]);
}

function getDatablock(obj)
{
    return '<span class="datablock">'+obj.callsign+' '+obj.aircraft+'<br>'+Math.round(Number(obj.alt)/100)*100+' '+obj.gndspd+'<br>'+obj.dep+' '+obj.arr+'</span>';
}

function updateLocation(obj)
{
    // Update the location, heading, and tooltip content
    plane_array[obj.uid].slideTo(new L.LatLng(Number(obj.lat), Number(obj.lon)), {duration: 1000});
    plane_array[obj.uid].setRotationAngle(obj.hdg);
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
    active_uids.splice(active_uids.indexOf(obj.uid), 1);
}

// Online ATC
function refreshATC()
{
    $.getJSON(apiserver + 'api/livedata/onlineatc', function(data) {

        $.each(data, function(idx, fir)
        {
            index = fir.fir.icao + Number(fir.fir.is_fss);
            firObj = firs_array[index];
            firname = fir.fir.name;
            lightupFIR(firObj, fir.members, firname);
        });
    });
    $.getJSON('/livedata/tracons.json', (data) => {
        
        if(atc_featuregroup.hasLayer(tracons_featuregroup))
            atc_featuregroup.removeLayer(tracons_featuregroup); tracons_featuregroup = new L.FeatureGroup();
        
        $.each(data, function(idx, obj) 
        {
            var newCircle = new L.circle([this.loc.lat, this.loc.lon],
            {
                radius: 100 * 1000,
                weight: 2,
                fillOpacity: 0.05,
                color: '#40e0d0'
            })
            newCircle.bindTooltip(getTraconBlock(obj), {sticky: true, opacity: 1});
            tracons_featuregroup.addLayer(newCircle);
        });

        atc_featuregroup.addLayer(tracons_featuregroup);
    })
}

// Light up a FIR on the firmap
function lightupFIR(obj, firMembers, firname)
{
    if(typeof obj === 'object')
    {
        $.each(obj.reverse(), function(idx, fir)
        {
            fir.setStyle({color: '#fff', weight: 2, fillColor: '#fff', fillOpacity: 0.001});
            fir.bindTooltip(getControllerBlock(obj, firMembers, firname), {sticky: true, opacity: 1});
            fir.bringToFront();
        });
    }
}

// Disable a FIR on the firmap
function turnOffFIR(fir)
{
    if(typeof obj === 'object')
    {
        $.each(obj, function(idx, fir)
        {
            fir.setStyle({color: '#333', weight: 1}).bringToBack();
        });
    }
}

// Get the controller block
function getControllerBlock(firObj, firMembers, firname)
{
    var list = '<table style="width: 200px; color: #333">';
    $.each(firMembers, function(idx, member) {
        list = list+'<tr><td style="vertical-align: middle; font-family: \'Roboto Mono\', sans-serif">'+member.callsign+'</td><td class="px-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+member.name+'</td><td class="pl-3 text-primary" style="vertical-align: middle; font-family: \'Roboto Mono\', monospace; letter-spacing: -0.05rem">'+member.time_online+'</td></tr>';
    })
    list = '<div class="card" style="border: 1px solid #eee; color: #333; background-color: #eee; border-radius: 0.4rem; overflow: hidden; min-width: 240px; line-height: 1.2rem;font-size: 1rem"><div class="card-body px-2 py-3" style="background-color: #333; color: #eee; font-size: 1.1rem">'+firname+'</div><div class="p-2" style="color: #222; background-color: #eee">'+list+'</div></div>';
    return list;
}

function getTraconBlock(obj)
{
    list = '<table style="width: 100%; color: #333">';
    tracon_name = obj.name;
    $.each(obj.APP, function(idx, subobj) {
        list = list+'<tr><td style="font-family: \'Roboto Mono\', sans-serif">'+subobj.callsign+'</td><td class="px-3" style="text-align: right; white-space: nowrap;">'+subobj.name+'</td><td class="pl-3 text-primary" style="font-family: \'Roboto Mono\', monospace; letter-spacing: -0.05rem">'+subobj.time_online+'</td></tr>';
    })
    $.each(obj.DEP, function(idx, subobj) {
        list = list+'<tr><td style="font-family: \'Roboto Mono\', sans-serif">'+subobj.callsign+'</td><td class="px-3" style="text-align: right; white-space: nowrap;">'+subobj.name+'</td><td class="pl-3 text-primary" style="font-family: \'Roboto Mono\', monospace; letter-spacing: -0.05rem">'+subobj.time_online+'</td></tr>';
    })
    list = list+'</table>';
    return '<div class="card" style="border: 1px solid #eee; color: #333; background-color: #eee; border-radius: 0.4rem; overflow: hidden; min-width: 200px; line-height: 1.2rem;font-size: 1rem"><div class="card-body px-2 py-3" style="background-color: #333; color: #eee; font-size: 1.1rem">'+tracon_name+'</div><div class="p-2" style="color: #222; background-color: #eee">'+list+'</div></div>';
}

// Zoom to a flight
function zoomToFlight(uid)
{

    if(!map.hasLayer(active_featuregroup))
    {
        plane = plane_array[uid];
        bounds = []; bounds.push(plane.getLatLng());

        // If the searchbox is showing, hide it
        $('#search-wrapper').hide();

        // Handle departure/arrival airports
        [dep_airport, dep_point, dep_name, dep_city] = processAirport(plane.flight.dep);
        [arr_airport, arr_point, arr_name, arr_city] = processAirport(plane.flight.arr);

        if(dep_point && dep_point != null)
        {
            active_featuregroup.addLayer(dep_point); bounds.push(dep_point.getLatLng());
        }
        if(arr_point && arr_point != null)
        {
            active_featuregroup.addLayer(arr_point); bounds.push(arr_point.getLatLng());
        }

        $.getJSON('https://simaware.ca/api/logs/' + uid, (logs) => {
            flightpath = new L.Polyline(logs, {color: '#00D300', weight: 1.5, nowrap: true});
            active_featuregroup.addLayer(flightpath);
        });

        map.fitBounds(bounds);

        // Swap the layers
        map.addLayer(active_featuregroup);
        map.removeLayer(plane_featuregroup);
        
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
    }
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

function returnToView()
{
    if(map.hasLayer(active_featuregroup))
    {
        // Get the plane object ready to be placed back
        togglePlaneTooltip(plane, false);
        plane_featuregroup.addLayer(plane);

        // Delete the instances
        if(plane)
        {
            active_featuregroup.removeLayer(plane); delete plane;
        }
        if(dep_point)
        {
            active_featuregroup.removeLayer(dep_point); delete dep_point;
        }
        if(arr_point)
        {
            active_featuregroup.removeLayer(arr_point); delete arr_point;
        }
        if(flightpath)
        {
            active_featuregroup.removeLayer(flightpath); delete flightpath;
        }

        // Switch the layers
        map.removeLayer(active_featuregroup);
        map.addLayer(plane_featuregroup);

        // Hide the flight information box
        $('#flights-sidebar').hide().removeClass('d-flex');

        // Return the sidebar if it exists on the page
        $('#sidebar').show();
    }
}

// Update the flights box
function updateFlightsBox(flight)
{

    // Update the callsign
    $('#flights-callsign').html(flight.callsign);

    // Update the live stats
    $('.flights-liveitem#spd').html(flight.gndspd+' kt');
    $('.flights-liveitem#alt').html(flight.alt+' ft');
    $('.flights-liveitem#togo').html(Math.round(getDtg(flight))+' nm');

    // Update the airports
    [dep_airport, dep_point_, dep_name, dep_city] = processAirport(plane.flight.dep);
    [arr_airport, arr_point_, arr_name, arr_city] = processAirport(plane.flight.arr);

    $('#flights-dep-icao').html(dep_airport); $('#flights-airport-dep').html(dep_name+'<br>'+dep_city);
    $('#flights-arr-icao').html(arr_airport); $('#flights-airport-arr').html(arr_name+'<br>'+arr_city);

    // Set the progress bar correctly
    $('#flights-progressbar-elapsed').width(getElapsedWidth(flight));

    // Route
    $('#flights-route').html(flight.route);

    // Route
    $('#flights-equipment').html(flight.aircraft);

}