function initializeAirport(icao)
{
    (async() => {
        
        while(!window.hasOwnProperty("airports") || !window.hasOwnProperty("flights"))
            await new Promise(resolve => setTimeout(resolve, 10));
        
        airport = airports[icao];
        if(airport != null)
        {
            $('#airport-icao').html(airport.icao);
            $('#airport-city').html(airport.city);
            $('#airport-name').html(airport.name);
        }

        el = document.getElementById('sidebar-container');
        L.DomEvent.disableScrollPropagation(el);
        L.DomEvent.disableClickPropagation(el);
        
    })();
    
}

function zoomToAirport(icao, inhibit_zoom = 0)
{
    
    if(!$('#map').length || manual)
    {
        window.location.href = '/?airport=' + icao;
    }

    // Get back from flight view
    returnToView();

    // If the airports view is hidden, show it
    returnSidebarToView('airport-sidebar', 'control-airport-pullout')
    $('#user-sidebar').hide(0);

    // Hide the user sidebar if it's showing
    $('#user-sidebar').hide(0);

    $('#airport-sidebar').show();
    if(typeof ap_featuregroup !== 'undefined' && map.hasLayer(ap_featuregroup))
    {
        map.removeLayer(ap_featuregroup);
        delete ap_featuregroup;
    }
    ap_featuregroup = new L.FeatureGroup();
    
    initializeAirport(icao);
    updateAirportFlights(airports, flights, icao);

    var bounds = [];

    map.removeLayer(plane_featuregroup);
    $.each(flights, (idx, flight) => {
        if(flight.dep == icao || flight.arr == icao)
        {
            ap_featuregroup.addLayer(plane_array[idx]);
            bounds.push([flight.lat, flight.lon]);
        }
    })
    console.log(bounds);
    map.addLayer(ap_featuregroup);
    if(!inhibit_zoom)
    {
        map.fitBounds(bounds);
    }

    // If the searchbox is showing, hide it
    $('#search-wrapper').hide();

    // Set the URL permalink
    window.history.pushState(icao, icao, '/?airport=' + icao);
}

function returnFromAirport()
{
    if(typeof(ap_featuregroup) != 'undefined')
    {
        map.removeLayer(ap_featuregroup);
        delete ap_featuregroup;
    }
    if(!map.hasLayer(plane_featuregroup))
    {
        map.addLayer(plane_featuregroup);
    }
    window.history.pushState('home', 'home', '/');
    $('#airport-sidebar').hide();
}

    

function updateAirportFlights(airports, flights, icao)
{
    console.log('Updating Airports');
    var deps = [];
    var arrs = [];
    $.each(flights, (idx, obj) => {
        console.log(obj.callsign + ' ' + obj.dep + ' ' + obj.arr)
        console.log(obj.arr == icao)
        console.log(icao)
        if(obj.arr == icao)
        {
            arrs.push(obj);
        }
        else if(obj.dep == icao)
        {
            deps.push(obj);
        }
    });

    html = '';
    depscount = 0;
    arrscount = 0;
    $.each(deps, (idx, obj) => {
        [airportname, airportcity] = getAirportDetails(airports, obj.arr);
        html = html + '<tr class="airport-list-item" onclick="zoomToFlight(\''+obj.uid+'\')"><td class="px-2 py-2">' + obj.callsign + '</td><td class="text-end pe-1"><small style="color: rgba(255,255,255,0.5)">to</small></td><td class="pe-1" style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif;">'+ obj.arr + '</td><td style="vertical-align: middle">' + airportcity + '</td></tr>';
        depscount++;
    });
    $.each(arrs, (idx, obj) => {
        [airportname, airportcity] = getAirportDetails(airports, obj.dep);
        html = html + '<tr class="airport-list-item" onclick="zoomToFlight(\''+obj.uid+'\')"><td class="px-2 py-2">' + obj.callsign + '</td><td class="text-end pe-1"><small style="color: rgba(255,255,255,0.5)">from</small></td><td class="pe-1" style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif;">'+ obj.dep + '</td><td style="vertical-align: middle">' + airportcity + '</td></tr>';
        arrscount++;
    });
    $('#airport-list').html(html);
    $('#depcount').html(depscount);
    $('#arrcount').html(arrscount);

}

function getAirportLoad(icao)
{
    var ct = 0;
    $.each(flights, (idx, obj) => {
        if(obj.dep == icao || obj.arr == icao)
        {
            ct++;
        }
    })
    return ct;
}

function getAirportDetails(airports, icao)
{
    if(airports[icao] != null)
    {
        returnvalue = [airports[icao].name, airports[icao].city];
    }
    else
    {
        returnvalue = ['Unknown Airport', 'Unknown City'];
        console.log('UNKNOWN: ' + icao);
    }
    return returnvalue;
}