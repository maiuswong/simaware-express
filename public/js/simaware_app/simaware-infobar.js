async function initializeInfobar()
{
    await updateInfobar();
    infobar_streamers();
}

async function updateInfobar()
{
    let response = await fetch(apiserver + 'api/infobar');
    let infobardata = await response.json();
    infoairports = await infobardata['airports'];
    infostreamers = await infobardata['streamers'];
}

function infobar_airports()
{
    $('#infobar-title').html('<span class="badge bg-primary" style="border-radius: 0.2rem; font-size: 0.8rem; font-weight: normal">Popular Airports</span>');
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
        $('#infobar-content').html('<div class="d-flex align-items-center" style="min-height: 100%"><table class="text-white"><tr><td><span class="badge bg-secondary"; style="border-radius: 0.2rem; font-family: \'JetBrains Mono\', monospace">#'+(idx + 1)+'</span></td><td class="ps-3" style="font-family: \'JetBrains mono\', sans-serif">'+getLocalTooltip(infoairports[idx].icao)+'</td><td class="ps-3" style="font-size: 0.9rem; line-height: 0.9rem">'+airport.name+'<br><small class="text-muted">'+airport.city+'</small></td><td class="ps-3"><i class="fas fa-plane-departure"></i> '+infoairports[idx].departures+'</td><td class="ps-2"><i class="fas fa-plane-arrival"></i> '+infoairports[idx].arrivals+'</td></tr></table></div>');
        $('#infobar-content').delay(300).animate({top: '0px', opacity: 1}, 250,  () => {
            $('#infobar-content').delay(5000).animate({opacity: 0}, 250, function() {
                $('#infobar-content').css({top: '100%'});
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
        $('#infobar-title').html('<span class="badge bg-purple" style="border-radius: 0.2rem; font-size: 0.8rem; font-weight: normal">Streamers</span>')
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
            $('#infobar-content').html('<div class="d-flex align-items-center" style="min-height: 100%"><table class="text-white" style="font-size: 0.9rem"><tr><td><span class="badge bg-secondary" style="border-radius: 0.2rem; font-weight: normal; font-size: 0.8rem"><i class="fab fa-twitch"></i> '+infostreamers[type][idx].streamername+'</span></td><td class="ps-3">'+infostreamers[type][idx].callsign+'</td><td class="ps-3">'+infostreamers[type][idx].dep+'</td><td class="ps-2"><div class="d-flex flex-row align-items-center" style="width: 140px"><div id="infobar-flights-progressbar" class="d-flex flex-row align-items-center" style="flex-grow: 1"><div id="infobar-flights-progressbar-elapsed"></div><i id="infobar-flights-progressbar-plane" class="fas fa-plane"></i><div id="infobar-flights-progressbar-remaining"></div></td><td class="ps-2">'+infostreamers[type][idx].arr+'</td></tr></table></div>');

            // Set colors
            $('#infobar-flights-progressbar-plane').css({ 'color': flight_status.color });
            $('#infobar-flights-progressbar-elapsed').css({ 'background-color': flight_status.color });
            $('#infobar-flights-progressbar-elapsed').css({ width: getInfoElapsedWidth(infoflight) + '%' });
            $('#infobar-content').delay(300).animate({top: '0px', opacity: 1}, 250,  () => {
                $('#infobar-content').delay(5000).animate({opacity: 0}, 250, function() {
                    $('#infobar-content').css({top: '100%'});
                    infobar_streamers_scroll(idx + 1, type);
                })
            })
        }
        else if(type == 'controllers')
        {
            $('#infobar-content').html('<div class="d-flex align-items-center" style="min-height: 100%"><table class="text-white" style="font-size: 0.9rem"><tr><td><span class="badge bg-secondary" style="border-radius: 0.2rem; font-weight: normal; font-size: 0.8rem"><i class="fab fa-twitch"></i> '+infostreamers[type][idx].streamername+'</span></td><td class="ps-3">'+infostreamers[type][idx].callsign+'</td><td style="vertical-align: middle" class="ps-3">'+infostreamers[type][idx].position+'</td></tr></table></div>');

            // Set colors
            $('#infobar-content').delay(300).animate({top: '0px', opacity: 1}, 250,  () => {
                $('#infobar-content').delay(5000).animate({opacity: 0}, 250, function() {
                   $('#infobar-content').css({top: '100%'});
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
