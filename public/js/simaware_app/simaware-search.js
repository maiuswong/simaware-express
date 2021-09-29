function runSearch(str)
{

    var return_array = {};
    return_array.flights = [];
    return_array.airports = [];

    // For each flight, search through the relevant properties and return a search result
    $.each(flights, (idx, obj) => {
        var interrogation = (obj.aircraft + '|' + obj.arr + '|' + obj.callsign + '|' + obj.dep + '|' + obj.cid + '|' + obj.route).toLowerCase();
        if(interrogation.includes(str))
        {
            var status = getStatus(obj);
            return_array['flights'].push({ callsign: obj.callsign, aircraft: obj.aircraft, arr: obj.arr, dep: obj.dep, route: obj.route, uid: obj.uid, status: status });
        }
    })
    if(str.length > 2)
    {
        $.each(airports, (idx, obj) => {
            var interrogation = (obj.icao + '|' + obj.name + '|').toLowerCase();
            if(interrogation.includes(str))
            {
                return_array['airports'].push({ icao: obj.icao, name: obj.name, iata: obj.iata, city: obj.city});
            }
        })
    }
    return return_array;
}

function compileSearchResults(str)
{
    var results = runSearch(str);
    if(str.length)
    {
        var flights_template = Handlebars.compile('<tr><td class="px-3" style="position: relative"><div style="position: absolute; top: 50%; left: 8; right: 8; height: 2; background-color: #ddd; z-index: -1"></div><small style="color: #bbb" class=" bg-white px-1">Flights ({{ results.length }})</small></td></tr>{{#if results.length}}{{#each results}}<tr class="search-item" onClick="zoomToFlight(\'{{ this.uid }}\')"><td class="px-3"><p class="mb-0">{{ this.callsign }}</p><small style="font-size: 0.8rem">{{ this.cid }} {{ this.dep }} - {{ this.arr }} - {{ this.aircraft }} - <span style="color: {{ this.status.color }}">{{ this.status.status }}</span></small></td></tr>{{/each}}{{else}}<tr><td class="px-3 text-muted">No results.</td></tr>{{/if}}');
        var airports_template = Handlebars.compile('<tr><td class="px-3" style="position: relative"><div style="position: absolute; top: 50%; left: 8; right: 8; height: 2; background-color: #ddd; z-index: -1"></div><small class="px-1 bg-white" style="color: #bbb">Airports ({{ results.length }})</small></td></tr>{{#if trigger}}{{#if results.length}}{{#each results}}<tr class="search-item" icao="{{ this.icao }}" onclick="location.href = \'/airport/{{this.icao}}\'"><td class="px-3"><p class="mb-0">{{ this.icao }} / {{ this.iata }}<br><small class="text-muted">{{ this.name }}</small></p></td></tr>{{/each}}{{else}}<tr><td class="px-3 text-muted">No results.</td></tr>{{/if}}{{else}}<tr><td class="px-3 text-muted">At least 3 characters required.</td></tr>{{/if}}');
        
        var flights_compiled = flights_template({ results: results.flights});
        var airports_compiled = airports_template({ results: results.airports, trigger: str.length > 2 });

    return airports_compiled + flights_compiled;
    }
    else
    {
        return '<tr><td class="px-3 text-muted">Begin typing to search</td></tr>';
    }
}

$(document).ready(() => {
    $('#search-field').on('input', () => {
        var str = $('#search-field').val().toLowerCase();
        if(str.length)
        {
            $('#search-results').html(compileSearchResults(str));
            $('#search-wrapper').show();
        }
        else
        {
            $('#search-results').html('');
            $('#search-wrapper').hide();
        }
    })
})
