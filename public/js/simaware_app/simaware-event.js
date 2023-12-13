async function loadEvent(id)
{
    response = await fetch(dataserver + 'api/livedata/events/event' + id + '.json');
    eventdata = await response.json();

    polyline_array = [];
    polyline_featuregroup = new L.FeatureGroup();
    map.addLayer(polyline_featuregroup);

    $('#event-name').html(eventdata.event.name);
    $('#event-date').html(moment(eventdata.event.start).format('MMMM Do, YYYY'));

    var aps = '';
    var eventairports = {};
    aar = {};
    $.each(eventdata.event.airports, (idx, airport) => {
        eventairports[airport.icao] = airportSearch(airport.icao);
        aar[airport.icao] = {
            deps: [],
            arrs: []
        }
        aps += '<div class="badge bg-secondary me-1 mb-1" style="border-radius: 0.2rem; font-family: \'JetBrains Mono\'">'+airport.icao+'</div>';
    })
    $('#events-aps').html(aps);

    $.each(eventdata.departures, (uid, flight) => {
        if(flight.logs.length > 1)
        {
            ll = [];
            $.each(flight.logs, (idx, obj) => {
                ll.push([obj[0], obj[1]]);
            })
            polyline = new L.Wrapped.Polyline(ll, {color:'#00cc66', opacity: 0.4, weight: 2});
            polyline_array[uid] = polyline;
            polyline_featuregroup.addLayer(polyline_array[uid]);
        }

        if(flight.accel && flight.dep && didDepart(flight, eventairports))
        {
            aar[flight.dep].deps.push([flight]);
        }
        
    })

    $.each(eventdata.arrivals, (uid, flight) => {
        if(flight.logs.length > 1)
        {
            ll = [];
            $.each(flight.logs, (idx, obj) => {
                ll.push([obj[0], obj[1]]);
            })
            polyline = new L.Wrapped.Polyline(ll, {color:'#3366ff', opacity: 0.4, weight: 2});
            polyline_array[uid] = polyline;
            polyline_featuregroup.addLayer(polyline_array[uid]);
        }

        if(flight.decel && flight.arr && didArrive(flight, eventairports))
        {
            aar[flight.arr].arrs.push([flight]);
        }
        
    })

    aarbins = [];
    var html = '';
    start = moment(eventdata.event.start);
    end = moment(eventdata.event.end);
    if(start.minutes() == 0)
    {
        start.add(-60, 'minutes');
    }
    else
    {
        start.startOf('hour');
    }
    if(end.minutes == 0)
    {
        end.add(60, 'minutes');
    }
    else
    {
        end.add(60, 'minutes').startOf('hour');
    }
    for(var i = start.unix() * 1000; i < end.unix() * 1000; i += 1800000)
    {
        s = {};
        s.start = i;
        s.stop = i + 1799999;
        aarbins.push(s);
    }

    var max = 0;
    for(var icao in aar)
    {
        html += '<table class="events-e m-3" id="'+ icao +'"style="display: none; height: 100px"><tr>';
        var apaars = aar[icao];
        var deps = [];
        var arrs = [];
        for(var idx in aarbins)
        {
            var aarbin = aarbins[idx];
            var dct = [];
            var act = [];
            for(var id2 in apaars.deps)
            {
                var flight = apaars.deps[id2][0];
                if(flight.accel > aarbin.start && flight.accel < aarbin.stop)
                {
                    dct.push(flight);
                }
            }
            for(var id2 in apaars.arrs)
            {
                var flight = apaars.arrs[id2][0];
                if(flight.decel > aarbin.start && flight.decel < aarbin.stop)
                {
                    act.push(flight);
                }
            }
            deps.push(dct);
            arrs.push(act);
        }
        aar[icao].deps = deps;
        aar[icao].arrs = arrs;
        
        for(var idx in aar[icao].deps)
        {
            var dct = aar[icao].deps[idx].length;
            var act = aar[icao].arrs[idx].length;
            if(dct + act > max) { max = dct + act; }
        }
        for(var idx in aar[icao].deps)
        {
            var dct = aar[icao].deps[idx].length;
            var act = aar[icao].arrs[idx].length;

            if(idx == 0) { html += '<td style="height: 100; min-width: 10px; position: relative; border-left: 1px dashed #999">' }
            else if((idx) % 2 == 1) {html += '<td style="height: 100; min-width: 10px; position: relative; border-right: 1px dashed #999">' }
            else { html += '<td style="height: 100; min-width: 10px; position: relative; border-right: 1px solid transparent">' }
            if(act > 0)
            {
                html += '<div style="border: 1px solid #3366ff; position: absolute; left: 0; width: 100%; bottom: 0; height: '+ act / max * 100 +'%"></div>';
            }
            if(dct > 0)
            {
                html += '<div style="border: 1px solid #00cc66; position: absolute; left: 0; width: 100%; bottom: '+ act / max * 100 +'%; height: ' + dct / max * 100 + '%"></div>'
            }
            html += '</td>';
        }
        html += '</tr><tr style="border-top: 1px solid #999">'
        for(var idx in aar[icao].deps)
        {
            var dct = aar[icao].deps[idx].length;
            var act = aar[icao].arrs[idx].length;

            if(idx == 0) { html += '<td style="font-family: \'JetBrains Mono\', monospace;text-align: center; font-size: 0.7rem; min-width: 16px; position: relative; border-left: 1px dashed #999">' }
            else if((idx) % 2 == 1) {html += '<td style="font-family: \'JetBrains Mono\', monospace; text-align: center; font-size: 0.7rem; min-width: 16px; position: relative; border-right: 1px dashed #999">' }
            else { html += '<td style="font-family: \'JetBrains Mono\', monospace;text-align: center; font-size: 0.7rem; min-width: 16px; position: relative; border-right: 1px solid transparent">' }
            html += '<span style="color: #00cc66">' + dct + '</span><br><span style="color: #3366ff;">' + act + '</span></td>';
        }
        html += '</tr><tr>';
        for(var idx in aarbins)
        {
            if(idx % 2 == 0)
            {
                if(idx == 0)
                {
                    html += '<td colspan="2" style="color: #777; border-left: 1px dashed #999; border-right: 1px dashed #999; font-size: 0.8rem; font-family: \'JetBrains Mono\'; text-align: center">';
                }
                else
                {
                    html += '<td colspan="2" style="color: #777; border-right: 1px dashed #999; font-size: 0.8rem; font-family: \'JetBrains Mono\'; text-align: center">';
                }
                if(moment(aarbins[idx].start).hour() < 10)
                {
                    html += '0' + moment(aarbins[idx].start).hour() + 'Z</td>'
                }
                else
                {
                    html += moment(aarbins[idx].start).hour() + 'Z</td>'
                }
                
            }
        }
        html += '</tr></table>';
    }
    $('#events-table').html(html);
    var bounds = [];
    for(var i in aar)
    {
        var airport = airportSearch(i);
        var lat = Number(airport.lat);
        var lon = Number(airport.lon);

        bounds.push([lat, lon]);

        var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getEventTooltipNew(airport, aar), iconSize: 'auto'});
        oloc = new L.marker([lat, lon],
        {
          icon: di,
        });
        map.addLayer(oloc);
    }
    map.fitBounds(bounds, [50, 50]);

    // Now do analysis
    var selbar = '';
    var html = '';
    for(var icao in aar)
    {
        var a = aar[icao];
        if(Object.keys(aar)[0] == icao)
        {
            selbar += '<a id="'+icao+'" onclick="loadAnalysis(0)" class="analysis_chooser rounded-0 btn btn-outline-secondary bg-secondary text-white" style="border: 1px solid #393939; border-bottom: none;">'+icao+'</a>';
        }

        html += '<table class="aar" id="'+icao+'">';

        for(var idx in a.arrs)
        {
            var bin = a.arrs[idx];
            for(id2 in bin)
            {
                var flight = bin[id2];
                if(didArrive(flight, eventairports))
                {
                    var offstv = getEventOffset(flight, eventairports[icao], eventdata, start);
                    var offstpct = 100 * ((offstv - start.unix() * 1000) / (1000 * end.unix() - 1000 * start.unix()))
                    var lenpct = 100 * ((flight.decel - offstv) / (1000 * end.unix() - 1000 * start.unix()))
                    console.log((flight.decel - (start.unix() * 100 + offstv) ) / 60000);
                }
            }
        }
    }

    cycleEvents(0);
}

function getEventOffset(flight, ap, eventdata, start)
{
    for(var i in flight.logs)
    {
        var ll = flight.logs[i];
        if(distance(ap.lat, ap.lon, ll[0], ll[1]) < 80)
        {
            return i * 15 * 1000;
        }
    }
}

async function loadLegacyEvent(id)
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
        cycleLegacyEvents(0);
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

    if(bounds.length == 1)
    {
        map.setZoom(8);
    }
    
    response = await fetch(apiserver + 'api/eventpaths/' + id);
    eventpaths = await response.json();

    polyline_array = [];
    polyline_featuregroup = new L.FeatureGroup();
    map.addLayer(polyline_featuregroup);

    $.each(eventpaths, (uid, latlon) => {
        if(latlon.length > 1)
        {
            ll = [];
            $.each(latlon, (idx, obj) => {
                ll.push([obj[1], obj[0]]);
            })
            polyline = new L.Wrapped.Polyline(ll, {color:'#fff', opacity: 0.2, weight: 2});
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
    let text = '<div style="padding: 0.2rem; border-radius: 0.2rem; background-color: rgba(80,80,80,0.9); display: flex; flex-direction: column; justify-content: center;"><table style="align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold"><tr><td class="text-light" style="padding: 0px 5px">'+data.ap.icao+'</td></tr></table><table style="flex: 1; border-radius: 0.18rem; overflow: hidden; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold"><tr><td class="text-white" style="background-color: #333; text-align: center; padding: 0px 5px">'+count+'</td></tr></table></div>';
    return text;
}

function getEventTooltipNew(data)
{
    let count = 0;
    for(var i in aar[data.icao].deps)
    {
        count += aar[data.icao].deps[i].length;
    }
    for(var i in aar[data.icao].arrs)
    {
        count += aar[data.icao].arrs[i].length;
    }

    let text = '<div style="padding: 0.2rem; border-radius: 0.2rem; background-color: rgba(80,80,80,0.9); display: flex; flex-direction: column; justify-content: center;"><table style="align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold"><tr><td class="text-light" style="padding: 0px 5px">'+data.icao+'</td></tr></table><table style="flex: 1; border-radius: 0.18rem; overflow: hidden; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold"><tr><td class="text-white" style="background-color: #333; text-align: center; padding: 0px 5px">'+count+'</td></tr></table></div>';
    return text;
}

function getWfTooltip(data)
{
    let text = '<div style="padding: 0.2rem; border-radius: 0.2rem; background-color: rgba(80,80,80,0.9); display: flex; flex-direction: column; justify-content: center;"><table style="align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold"><tr><td class="text-light" style="padding: 0px 5px">'+data.icao+'</td></tr></table><table style="flex: 1; border-radius: 0.18rem; overflow: hidden; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold"><tr><td class="text-white" style="background-color: #333; text-align: center; padding: 0px 5px">'+getAirportLoad(data.icao)+'</td></tr></table></div>';
    return text;
}

function cycleEvents(index)
{
    if(index >= Object.keys(aar).length)
    {
        cycleEvents(0);
    }
    else
    {
        var sel = Object.keys(aar)[index];
        var ap = airportSearch(sel);
        $('#event-ap').html('<b>' + ap.icao + '</b> ' + ap.name + '<br /><span class="small text-muted">' + ap.city + '</span>' );
        $('.events-e#'+sel).fadeIn(300, function() {
            if(Object.keys(aar).length > 1)
            {
                $(this).delay(5000).fadeOut(150, function() {
                    cycleEvents(index + 1);
                })
            }
        })
    }
}

function cycleLegacyEvents(index)
{
    if(index >= Object.keys(eventdata.aarstore).length)
    {
        cycleLegacyEvents(0);
    }
    else
    {
        replaceAarData(index);
        $('.aarelement').each(function() { $(this).animate({opacity: 1}, 300); })
        $('#events-airport').animate({opacity: 1}, 300, function() {
            $('.aarelement').each(function() { $(this).delay(5000).animate({opacity: 0}, 150); })
            $(this).delay(5000).animate({opacity: 0}, 150, function() {
                cycleLegacyEvents(index + 1);
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
        $('#aar'+idx).html('<span style="color: '+getFlightColor(aar[2])+'">'+aar[2]+'</span>');
    });
}

async function loadUpcomingEvents()
{
    let response = await fetch(dataserver + 'api/livedata/events.json');
    let events_raw = await response.json();
    let eventsByAirport = [];

    $.each(events_raw.future, (idx, event) => {
        if(moment.duration(moment(event.start).diff(moment())).asDays() >= 0 && moment.duration(moment(event.start).diff(moment())).asDays() < 14)
        {
            let eventairports = event.airports;
            $.each(eventairports, (idx2, airport) => {
                if(typeof eventsByAirport[airport.icao] != 'undefined')
                {
                    eventsByAirport[airport.icao].push(event);
                }
                else
                {
                    eventsByAirport[airport.icao] = [event];
                }
            });
        }
    })

    return eventsByAirport;
}

function didDepart(flight, eventairport)
{
    for(var i in flight.logs)
    {
        var ll = flight.logs[i];
        if(distance(ll[0], ll[1], eventairport[flight.dep].lat, eventairport[flight.dep].lon) < 5)
        {
            return true;
        }
    }
    return false;
}

function didArrive(flight, eventairport)
{
    for(var i in flight.logs)
    {
        var ll = flight.logs[i];
        if(distance(ll[0], ll[1], eventairport[flight.arr].lat, eventairport[flight.arr].lon) < 5)
        {
            return true;
        }
    }
    return false;
}