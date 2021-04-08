function runSearch(str)
{
    var return_array = [];

    // For each flight, search through the relevant properties and return a search result
    $.each(flights, (idx, obj) => {
        interrogation = (obj.aircraft + '|' + obj.arr + '|' + obj.callsign + '|' + obj.dep + '|' + obj.cid + '|' + obj.route).toLowerCase();
        if(interrogation.includes(str))
        {
            return_array.push({ callsign: obj.callsign, aircraft: obj.aircraft, arr: obj.arr, dep: obj.dep, route: obj.route, uid: obj.uid });
        }
    })
    return return_array;
}

function compileSearchResults(str)
{
    var results = runSearch(str);
    var template = Handlebars.compile('{{#if results.length}}{{#each results}}<tr class="search-flight-item" onClick="zoomToFlight(\'{{ this.uid }}\')"><td class="px-3"><p class="mb-0">{{ this.callsign }}</p><small>{{ this.cid }} {{ this.dep }} - {{ this.arr }}</small></td></tr>{{/each}}{{else}}<tr><td class="px-3"><span class="text-muted">No results</span></td></tr>{{/if}}');
    return template({ results: results });
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
