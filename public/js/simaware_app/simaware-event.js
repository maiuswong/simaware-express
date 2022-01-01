async function loadEvent(id)
{
    response = await fetch(apiserver + 'api/event/'+id);
    eventdata = await response.json();

    $('#event-name').html(eventdata.name);
    $('#event-date').html(moment(eventdata.start).format('MMMM Do, YYYY'));

    let aps = '';
    $.each(eventdata.airports.split(','), (idx, airport) => {
        aps += '<div class="badge bg-secondary me-1 mb-1" style="border-radius: 0.2rem; font-family: \'JetBrains Mono\'">'+airport+'</div>';
    })
    $('#events-aps').html(aps);
    $('#events-table').html(returnEventsTable(eventdata.aarstore[0]))
    if(Object.keys(eventdata.aarstore).length == 1)
    {
        replaceAarData(0);
    }
    else
    {
        cycleEvents(0);
    }
    bounds = [];
    $.each(eventdata.aarstore, (idx, airport) => {
        var lat = Number(airport.ap.lat);
        var lon = Number(airport.ap.lon);

        bounds.push([lat, lon]);

        var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getEventTooltip(airport), iconSize: 'auto'});
        oloc = new L.marker([lat, lon],
        {
          icon: di,
        });
        map.addLayer(oloc);
    })
    map.fitBounds(bounds, [50, 50]);
    
    response = await fetch(apiserver + 'api/eventpaths/' + id);
    eventpaths = await response.json();

    polyline_array = [];
    polyline_featuregroup = new L.FeatureGroup();
    map.addLayer(polyline_featuregroup);

    $.each(eventpaths, (uid, latlon) => {
        if(latlon.length > 1)
        {
            console.log(uid);
            ll = [];
            $.each(latlon, (idx, obj) => {
                ll.push([obj[1], obj[0]]);
            })
            polyline = new L.Polyline(ll, {color:'#fff', opacity: 0.2, weight: 2});
            polyline.on('click', function() {
                zoomToFlight(uid);
            });
            polyline.on('mouseover', function() {
                this.setStyle({'weight': 3, 'color': '#ffcc33', 'opacity': 1});
            });
            polyline.on('mouseout', function() {
                this.setStyle({'weight': 2, 'color': '#ffffff', 'opacity': 0.2});
            })
            polyline_array[uid] = polyline;
            polyline_featuregroup.addLayer(polyline_array[uid]);
        }
    })
}

function getEventTooltip(data)
{
    let count = 0;
    $.each(data.aar, (idx, obj) => {
        count += obj[2];
    })
    let text = '<div style="padding: 0.2rem; border-radius: 0.2rem; background-color: rgba(80,80,80,0.9); display: flex; flex-direction: column; justify-content: center;"><table style="align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.6rem; overflow: hidden; font-weight: bold"><tr><td class="text-light" style="padding: 0px 5px">'+data.ap.icao+'</td></tr></table><table style="flex: 1; border-radius: 0.18rem; overflow: hidden; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.6rem; overflow: hidden; font-weight: bold"><tr><td class="text-white" style="background-color: #333; text-align: center; padding: 0px 5px">'+count+'</td></tr></table></div>';
    return text;
}

function cycleEvents(index)
{
    if(index >= Object.keys(eventdata.aarstore).length)
    {
        cycleEvents(0);
    }
    else
    {
        replaceAarData(index);
        $('.aarelement').each(function() { $(this).animate({opacity: 1}, 300); })
        $('#events-airport').animate({opacity: 1}, 300, function() {
            $('.aarelement').each(function() { $(this).delay(5000).animate({opacity: 0}, 150); })
            $(this).delay(5000).animate({opacity: 0}, 150, function() {
                cycleEvents(index + 1);
            })
        })
    }
}

function returnEventsTable(data)
{
    ct = Object.keys(data.aar).length;
    text = '<table class="m-2 text-white"><tr><td class="pb-2" colspan="'+(2 * ct + 1)+'"><div id="events-airport"><h6 class="mb-0"><b id="events-icao">&nbsp;</b> <span id="events-name"></span><br><small class="text-muted" id="events-city">&nbsp;</small></h6></div></td></tr><tr style="font-family: \'JetBrains Mono\'"><td><div style="width: 1px; height: 30px; background-color: #888; margin: 0 auto"></div></td>';
    for(element in data.aar)
    {
        text += '<td style="min-width: 30px; text-align: center"><h5 class="mb-0 aarelement" id="aar'+element+'"></h5></td><td><div style="width: 1px; height: 30px; background-color: #888; margin: 0 auto"></div></td>';
    }
    text += '</tr><tr style="font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem" class="text-muted" ><td style="text-align: center"><span><i class="fas fa-caret-up"></i></span><br>'+moment(data.aar[0][0].date).format('HHmm[Z]')+'</td>';
    for(element in data.aar)
    {
        console.log(data.aar[element][1]);
        text += '<td></td><td style="text-align: center"><span><i class="fas fa-caret-up"></i></span><br>'+moment(data.aar[element][1].date).format('HHmm[Z]')+'</td>';
    }
    text += '</tr></table>';
    return text;
}

function getCity(data)
{
    if(data.ap.city == data.ap.country)
    {
        city = data.ap.city;
    }
    else if(data.ap.state)
    {
        city = data.ap.city + ', ' + data.ap.state; 
    }
    else
    {
        city = data.ap.city + ', ' + data.ap.country;
    }
    return city;
}

function replaceAarData(index)
{
    $('#events-name').html(eventdata.aarstore[index].ap.name);
    $('#events-icao').html(eventdata.aarstore[index].ap.icao);
    $('#events-city').html(getCity(eventdata.aarstore[index]));
    $.each(eventdata.aarstore[index].aar, function(idx, aar)
    {
        $('#aar'+idx).html(aar[2]);
    });
}

async function loadUpcomingEvents()
{
    let response = await fetch(apiserver + 'api/events');
    let events_raw = await response.json();
    let eventsByAirport = [];

    $.each(events_raw, (idx, event) => {
        if(moment.duration(moment(event.start).diff(moment())).asDays() >= 0 && moment.duration(moment(event.start).diff(moment())).asDays() < 7)
        {
            let airports = event.airports.split(',');
            $.each(airports, (idx2, airport) => {
                if(typeof eventsByAirport[airport] != 'undefined')
                {
                    eventsByAirport[airport].push(event);
                }
                else
                {
                    eventsByAirport[airport] = [event];
                }
            });
        }
    })

    return eventsByAirport;
}