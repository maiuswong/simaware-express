async function initializeInfobar()
{
    infobardata = await updateInfobar();
    infoairports = await infobardata['airports'];
    infostreamers = await infobardata['streamers'];
    infobar_airports();
}

function infobar_airports()
{
    $('#infobar-title').html('<span class="badge bg-primary" style="border-radius: 2rem; font-size: 0.9rem; font-weight: normal">Popular Airports</span>');
    $('#infobar-title').fadeIn(300, () => {
        infobar_airports_scroll(0);
    })
}

async function updateInfobar()
{
    let response = await fetch(apiserver + 'api/infobar');
    let data = await response.json();
    return data;
}

function infobar_airports_scroll(idx, limit = 10)
{
    if(idx >= limit)
    {
        infobar_airports();
    }
    else
    {
        airport = airports[infoairports[idx].icao];
        $('#infobar-content').html('<table class="text-white"><tr><td><span class="badge bg-secondary"; style="border-radius: 2rem; font-family: \'JetBrains Mono\', monospace">#'+(idx + 1)+'</span></td><td class="ps-3" style="font-family: \'JetBrains mono\', sans-serif">'+infoairports[idx].icao+'</td><td class="ps-3" style="font-size: 0.9rem; line-height: 0.9rem">'+airport.name+'<br><small class="text-muted">'+airport.city+'</small></td><td class="ps-3"><i class="fas fa-plane-departure"></i> '+infoairports[idx].departures+'</td><td class="ps-2"><i class="fas fa-plane-arrival"></i> '+infoairports[idx].arrivals+'</td></tr></table>');
        $('#infobar-content').fadeIn(300, function() {
            $(this).delay(5000).fadeOut(150, function() {
                infobar_airports_scroll(idx + 1);
            })
        })
    }
}