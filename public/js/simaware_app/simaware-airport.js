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
            getLocalATC();
        }

        el = document.getElementById('sidebar-container');
        L.DomEvent.disableScrollPropagation(el);
        L.DomEvent.disableClickPropagation(el);
        
    })();
    
}

function zoomToAirport(icao)
{

    if(!$('#map').length || manual)
    {
        window.location.href = '/?airport=' + icao;
    }

    $('#airport-sidebar').show();
    if(typeof ap_featuregroup !== 'undefined' && map.hasLayer(ap_featuregroup))
    {
        map.removeLayer(ap_featuregroup);
        delete ap_featuregroup;
    }
    ap_featuregroup = new L.FeatureGroup();
    
    initializeAirport(icao);
    updateAirportFlights(airports, flights, icao);

    map.removeLayer(plane_featuregroup);
    $.each(flights, (idx, flight) => {
        if(flight.dep == icao || flight.arr == icao)
        {
            ap_featuregroup.addLayer(plane_array[idx]);
        }
    })
    map.addLayer(ap_featuregroup);

    // If the searchbox is showing, hide it
    $('#search-wrapper').hide();
}

function returnFromAirport()
{
    map.removeLayer(ap_featuregroup);
    delete ap_featuregroup;
    map.addLayer(plane_featuregroup);
    $('#airport-sidebar').hide();
}

async function getLocalATC()
{

    if(typeof ap_oloc != 'undefined' && map.hasLayer(ap_oloc))
    {
        map.removeLayer(ap_oloc); delete ap_oloc;
    }

    response = response = await fetch(apiserver + 'api/livedata/locals');
    data = await response.json();

    if(typeof data[filterCriteria] != 'undefined')
    {
        ap_local = data[filterCriteria];
        var lat = ap_local.loc.lat
        var lon = ap_local.loc.lon
        var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getLocalTooltip(ap_local), iconSize: 'auto'});
        ap_oloc = new L.marker([lat, lon],
        {
            icon: di,
        })
        ap_oloc.bindTooltip(getLocalBlock(ap_local), {opacity: 1});
        map.addLayer(ap_oloc);
    }
    
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
        html = html + '<tr class="airport-list-item" onclick="zoomToFlight(\''+obj.uid+'\')"><td class="px-2 py-1">' + obj.callsign + '</td><td class="text-end pe-1"><small class="text-muted">to</small></td><td>' + airportcity + '</td></tr>';
        depscount++;
    });
    $.each(arrs, (idx, obj) => {
        [airportname, airportcity] = getAirportDetails(airports, obj.dep);
        html = html + '<tr class="airport-list-item" onclick="zoomToFlight(\''+obj.uid+'\')"><td class="px-2 py-1">' + obj.callsign + '</td><td class="text-end pe-1"><small class="text-muted">from</small></td><td>' + airportcity + '</td></tr>';
        arrscount++;
    });
    $('#airport-list').html(html);
    $('#depcount').html(depscount);
    $('#arrcount').html(arrscount);

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
    }
    return returnvalue;
}