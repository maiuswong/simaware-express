$(document).ready(() => {
    $('#ap-toggle').on('click', () => {
        $('#ap-wrapper').toggle();
        $('#streamers-wrapper').hide();
        $('#events-wrapper').hide();
    })
    $('#streamers-toggle').on('click', () => {
        $('#streamers-wrapper').toggle();
        $('#ap-wrapper').hide();
        $('#events-wrapper').hide();
    })
    $('#events-toggle').on('click', () => {
        $('#events-wrapper').toggle();
        $('#ap-wrapper').hide();
        $('#streamers-wrapper').hide();
    })
})

async function initializeInfobar()
{
    await initializePatrons();
    await updateInfobar();
    infobar_streamers();
}

async function updateInfobar()
{
    // Get VATSIM data for streamers
    let response = await fetch(dataserver + 'api/livedata/vatsimdata.json');
    let infobardata = await response.json();

    // Horrible spaghetti code to get the most popular airports
    al = {}
    $.each(bnfoairports, (icao) => {
        al[icao] = bnfoairports[icao].departures + bnfoairports[icao].arrivals;
    });

    let sort = [];
    for (var ap in al) {
        sort.push([ap, al[ap]]);
    }

    sort.sort(function(a, b) {
        return b[1] - a[1];
    });

    infoairports = [];

    var html = '<h5 class="mb-3">Popular Airports</h5><table>';
    for(let i = 0; i < 10; i++)
    {
        let airport = airportSearch(bnfoairports[sort[i][0]].icao);
        infoairports.push(bnfoairports[sort[i][0]]);
        html += '<tr onclick="zoomToAirport(\''+bnfoairports[sort[i][0]].icao+'\')" ><td class="py-2"><span class="badge" style="color: #fff; border: 1px solid #fff; border-radius: 1rem; font-family: \'JetBrains Mono\', monospace">#'+(i + 1)+'</span></td><td class="ps-3" style="font-family: \'JetBrains mono\', sans-serif">'+getLocalTooltip(bnfoairports[sort[i][0]].icao)+'</td><td class="ps-3" style="font-size: 0.9rem; line-height: 0.9rem">'+airport.name+'<br><small class="text-muted">'+airport.city+'</small></td><td class="ps-3"><i class="fas fa-plane-departure"></i> '+bnfoairports[sort[i][0]].departures+'</td><td class="ps-2"><i class="fas fa-plane-arrival"></i> '+bnfoairports[sort[i][0]].arrivals+'</td></tr>';
    }
    html += '</table>'
    $('#ap-wrapper').html(html);

    html = '<h5 class="mb-3">Upcoming Events</h5><table style="font-size: 0.9rem">';
    prevdate = null;
    let i = 0;
    let ij = 0;
    while(ij < 10)
    {
        if(events.future[i].end > moment.now())
        {
            html += '<tr><td class="py-1 pe-2"><div>';
            if(prevdate != moment.utc(events.future[i].start).format('MMMD'))
            {
                html += '<table style="flex: 1; overflow: hidden; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.6rem; overflow: hidden; font-weight: bold"><tr><td style="text-transform: uppercase; padding: 0 0.4rem; color: #c2737e; margin: 0.2rem">'+moment.utc(events.future[i].start).format('MMM')+'</td></tr><tr><td style="font-size: 0.9rem; color: #eee; text-align: center">'+moment.utc(events.future[i].start).format('D')+'</td></tr></table>';
            }

            html += '</div></td>';
            if(moment.now() > events.future[i].start && moment.now() < events.future[i].end)
            {
                html += '<td class="ps-2 py-1 border-success" style="border-left: 2px solid;">';
            }
            else
            {
                html += '<td class="ps-2 py-1">';
            }

            html += events.future[i].name + '<br><span style="color: rgba(255,255,255,0.8); font-size: 0.7rem; font-family: \'JetBrains Mono\', monospace">' + moment.utc(events.future[i].start).format('HHmm') + '-'+ moment.utc(events.future[i].end).format('HHmm') +'Z ';
            for(var j in events.future[i].airports)
            {
                html += '<span class="text-muted">'+events.future[i].airports[j].icao + '</span> '
            }
            html += '</span></td></tr>';
            prevdate = moment.utc(events.future[i].start).format('MMMD');
            ij++;
        }
        i++;
    }
    html += '</table>';
    $('#events-wrapper').html(html);

    // Now some horrible spaghetti code for patrons
    infostreamers = {};
    infostreamers['pilots'] = [];
    infostreamers['controllers'] = [];
    html = '<table style="font-size: 0.9rem"><h5 class="mb-3">Active Streamers</h5>';
    $.each(flights, (idx, obj) => {
        
        if(patrons[obj.cid] && (patrons[obj.cid].tier >= 2 || !patrons[obj.cid].tier) && streamers[patrons[obj.cid].twitch])
        {
            let s = {};
            s.uid = idx;
            s.dep = obj.dep;
            s.arr = obj.arr;
            if(!s.dep) { s.dep = 'NONE' }
            if(!s.arr) { s.arr = 'NONE' }
            s.streamername = patrons[obj.cid].twitch;
            s.callsign = obj.callsign;
            infostreamers.pilots.push(s);
            let infoflight = plane_array[s.uid].flight;
            let flight_status = getStatus(infoflight);
            html += '<tr><td class="py-2"><a class="footer-infobar-item text-white"><i class="fab fa-twitch"></i> '+s.streamername+'</a></td><td class="ps-3">'+s.callsign+'</td><td class="ps-3">'+s.dep+'</td><td class="ps-2"><div class="d-flex flex-row align-items-center" style="width: 140px"><div id="infobar-flights-progressbar" class="d-flex flex-row align-items-center" style="flex-grow: 1"><div class="toggle-flights-progressbar-elapsed" id="'+s.uid+'" style="background-color: '+flight_status.color+'; width: '+getInfoElapsedWidth(infoflight)+'%"></div><i class="toggle-flights-progressbar-plane fas fa-plane" id="'+s.uid+'" style="color: '+flight_status.color+'"></i><div class="toggle-flights-progressbar-remaining" id="'+s.uid+'"></div></td><td class="ps-2" style="text-align: right">'+s.arr+'</td></tr>';
        }
    })

    $.each(tracons, (idx, obj) => {
        if(patrons[obj.cid] && (patrons[obj.cid].tier >= 2 || !patrons[obj.cid].tier) && streamers[patrons[obj.cid].twitch])
        {
            let s = {};
            s.cid = obj.cid;
            s.name = obj.name;
            s.streamername = patrons[obj.cid].twitch;
            s.position = obj.callsign;
            infostreamers.controllers.push(s);
            html += '<tr><td class="py-2"><i class="fab fa-twitch"></i> '+s.streamername+'</a></td><td colspan="4" class="ps-3">'+s.position+'</td></tr>';
        }
    })
    $.each(sectors, (idx, obj) => {
        if(patrons[obj.cid] && (patrons[obj.cid].tier >= 2 || !patrons[obj.cid].tier) && streamers[patrons[obj.cid].twitch])
        {
            let s = {};
            s.cid = obj.cid;
            s.name = obj.name;
            s.streamername = patrons[obj.cid].twitch;
            s.position = obj.callsign;
            infostreamers.controllers.push(s);
            html += '<tr><td class="py-2"><i class="fab fa-twitch"></i> '+s.streamername+'</a></td><td colspan="4" class="ps-3">'+s.position+'</td></tr>';
        }
    })
    $.each(localsraw, (idx, obj) => {
        if(patrons[obj.cid] && (patrons[obj.cid].tier >= 2 || !patrons[obj.cid].tier) && streamers[patrons[obj.cid].twitch] && !obj.callsign.includes('_ATIS'))
        {
            let s = {};
            s.cid = obj.cid;
            s.name = obj.name;
            s.streamername = patrons[obj.cid].twitch;
            s.position = obj.callsign;
            infostreamers.controllers.push(s);
            html += '<tr><td class="py-2"><i class="fab fa-twitch"></i> '+s.streamername+'</a></td><td colspan="4" class="ps-3">'+s.position+'</td></tr>';
        }
    })

    html += '</table>';
    $('#streamers-wrapper').html(html);
}

function infobar_airports()
{
    $('#infobar-title').html('<span class="badge bg-primary" style="font-size: 0.8rem; font-weight: normal; border-radius: 5rem; ">Popular Airports</span>');
    $('#infobar-title').delay(500).fadeIn(250, () => {
        infobar_airports_scroll(0);
    })
}

function infobar_airports_scroll(idx, limit = 10)
{
    if(idx >= limit)
    {
        $('#infobar-title').fadeOut(250, function() {
            infobar_streamers();
        })
    }
    else
    {
        airport = airports[infoairports[idx].icao];
        $('#infobar-content').html('<div onclick="zoomToAirport(\''+infoairports[idx].icao+'\')" class="px-3 footer-infobar-item d-flex align-items-center" style="min-height: 100%"><table class="text-white"><tr><td><span class="badge" style="color: #fff; border: 1px solid #fff; border-radius: 1rem; font-family: \'JetBrains Mono\', monospace">#'+(idx + 1)+'</span></td><td class="ps-3" style="font-family: \'JetBrains mono\', sans-serif">'+getLocalTooltip(infoairports[idx].icao)+'</td><td class="ps-3" style="font-size: 0.9rem; line-height: 0.9rem">'+airport.name+'<br><small class="text-muted">'+airport.city+'</small></td><td class="ps-3"><i class="fas fa-plane-departure"></i> '+infoairports[idx].departures+'</td><td class="ps-2"><i class="fas fa-plane-arrival"></i> '+infoairports[idx].arrivals+'</td></tr></table></div>');
        $('#infobar-content').delay(300).animate({left: '0px', opacity: 1}, 250, 'easeOutSine', () => {
            $('#infobar-content').delay(5000).animate({opacity: 0}, 250, 'easeOutSine',function() {
                $('#infobar-content').css({left: '-20px'});
                infobar_airports_scroll(idx + 1);
            })
        })
    }
}

function infobar_streamers()
{
    if(infostreamers['pilots'].length == 0 && infostreamers['controllers'].length == 0)
    {
        infobar_airports();
    }
    else
    {
        $('#infobar-title').html('<span class="badge bg-purple" style="font-size: 0.8rem; font-weight: normal; border-radius: 5rem">Streamers</span>')
        $('#infobar-title').delay(500).fadeIn(250, () => {
        infobar_streamers_scroll(0, 'pilots');
    })
    }
}
function infobar_streamers_scroll(idx, type)
{
    if(typeof infostreamers[type] == 'undefined' || typeof infostreamers[type][idx] == 'undefined')
    {
        if(type == 'pilots')
        {
            infobar_streamers_scroll(0, 'controllers');
        }
        if(type == 'controllers')
        {
            $('#infobar-title').fadeOut(500, function() {
                infobar_airports();
            })
        }
    }
    else
    {
        if(type == 'pilots' && typeof plane_array[infostreamers[type][idx].uid] != 'undefined')
        {
            let infoflight = plane_array[infostreamers[type][idx].uid].flight;
            let flight_status = getStatus(infoflight);
            let dep = infostreamers[type][idx].dep;
            let arr = infostreamers[type][idx].arr;
            if(!dep) { dep = 'NONE' }
            if(!arr) { arr = 'NONE' }
            let url = (true) ? 'https://twitch.tv/'+infostreamers[type][idx].streamername : 'https://youtube.com/c/' + infostreamers[type][idx].streamername + '/live';
            $('#infobar-content').html('<div class="d-flex" style="min-height: 100%"><div class="streamer px-3 d-flex align-items-center footer-infobar-item"><a class="text-white" href="'+url+'"><i class="fab fa-twitch"></i> '+infostreamers[type][idx].streamername+'</a></div><div onmouseup="zoomToFlight(\''+infostreamers[type][idx].uid+'\')" class="pe-3 d-flex align-items-center footer-infobar-item"><table class="text-white" style="font-size: 0.9rem"><tr><td class="ps-3">'+infostreamers[type][idx].callsign+'</td><td class="ps-3">'+dep+'</td><td class="ps-2"><div class="d-flex flex-row align-items-center" style="width: 140px"><div id="infobar-flights-progressbar" class="d-flex flex-row align-items-center" style="flex-grow: 1"><div id="infobar-flights-progressbar-elapsed"></div><i id="infobar-flights-progressbar-plane" class="fas fa-plane"></i><div id="infobar-flights-progressbar-remaining"></div></td><td class="ps-2">'+arr+'</td></tr></table></div></div>');

            // Set colors
            $('#infobar-flights-progressbar-plane').css({ 'color': flight_status.color });
            $('#infobar-flights-progressbar-elapsed').css({ 'background-color': flight_status.color });
            $('#infobar-flights-progressbar-elapsed').css({ width: getInfoElapsedWidth(infoflight) + '%' });
            $('#infobar-content').delay(300).animate({left: '0px', opacity: 1}, 250, 'easeOutSine', () => {
                $('#infobar-content').delay(5000).animate({opacity: 0}, 250, 'easeOutSine',function() {
                    $('#infobar-content').css({left: '-20px'});
                    infobar_streamers_scroll(idx + 1, type);
                })
            })
        }
        else if(type == 'controllers')
        {
            let url = (infostreamers[type][idx].platform == 'twitch') ? 'https://twitch.tv/'+infostreamers[type][idx].streamername : 'https://youtube.com/c/' + infostreamers[type][idx].streamername + '/live';
            $('#infobar-content').html('<div class="d-flex" style="min-height: 100%"><div class="streamer px-3 d-flex align-items-center footer-infobar-item"><a class="text-white" href="'+url+'"><i class="fab fa-twitch"></i> '+infostreamers[type][idx].streamername+'</a></div><div class="pe-3 d-flex align-items-center" style="min-height: 100%"><table class="text-white" style="font-size: 0.9rem"><tr><td style="vertical-align: middle" class="ps-3">'+infostreamers[type][idx].position+'</td></tr></table></div></div>');

            // Set colors
            $('#infobar-content').delay(300).animate({left: '0px', opacity: 1}, 250, 'easeOutSine', () => {
                $('#infobar-content').delay(5000).animate({opacity: 0}, 250, 'easeOutSine',function() {
                   $('#infobar-content').css({left: '-20px'});
                    infobar_streamers_scroll(idx + 1, type);
                })
            })
        }
        else
        {
            infobar_streamers_scroll(idx + 1, type);
        }
        
    }
}
