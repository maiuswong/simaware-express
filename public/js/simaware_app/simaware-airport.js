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

        setInterval(updateAirportFlights(flights, icao), 60 * 1000);

        el = document.getElementById('sidebar');
        L.DomEvent.disableScrollPropagation(el);
        L.DomEvent.disableClickPropagation(el);
        
    })();
    
}

function updateAirportFlights(flights, icao)
{
    var deps = [];
    var arrs = [];
    $.each(flights, (idx, obj) => {
        if(obj.arr == icao)
        {
            arrs.push(obj);
        }
        else
        {
            deps.push(obj);
        }
    });

    html = '';
    depscount = 0;
    arrscount = 0;
    $.each(deps, (idx, obj) => {
        [airportname, airportcity] = getAirportDetails(obj.arr);
        html = html + '<tr onclick="zoomToFlight(\''+obj.uid+'\')"><td class="px-2 py-1">' + obj.callsign + '</td><td class="text-end pe-1"><small class="text-muted">to</small></td><td>' + airportcity + '</td></tr>';
        depscount++;
    });
    $.each(arrs, (idx, obj) => {
        [airportname, airportcity] = getAirportDetails(obj.dep);
        html = html + '<tr onclick="zoomToFlight(\''+obj.uid+'\')"><td class="px-2 py-1">' + obj.callsign + '</td><td class="text-end pe-1"><small class="text-muted">from</small></td><td>' + airportcity + '</td></tr>';
        arrscount++;
    });
    $('#airport-list').html(html);
    $('#depcount').html(depscount);
    $('#arrcount').html(arrscount);

}

function getAirportDetails(icao)
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