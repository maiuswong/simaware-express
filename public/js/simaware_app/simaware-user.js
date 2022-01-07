async function initializeUser(cid)
{

    el = document.getElementById('user-sidebar');
    L.DomEvent.disableScrollPropagation(el);
    L.DomEvent.disableClickPropagation(el);

    $('#flight-list').html('<div class="p-3 d-flex" style="justify-content: center; align-items: center"><div class="spinner-border text-secondary" role="status"></div> <h5 class="ms-4 mb-0 text-secondary">Loading...</h5></div>')
    
    var response = await fetch('https://api.simaware.ca/api/user/'+cid);
    user = await response.json();

    $('#pilot-name').html(user.name);

    var response = await fetch('https://api.simaware.ca/api/moreflights/'+cid+'/0');
    var flights = await response.json();

    html = '';
    $.each(flights, (idx, obj) => {
        html += '<tr uid="'+obj.uid+'" onclick="zoomToFlight(\''+obj.uid+'\')" class="flight"><td style="font-size: 1rem; text-align: center" class="py-2 px-1">';
        
        if(typeof(plane_array[obj.uid]) != 'undefined')
        {
            html += '<span class="live text-white px-2">Live</span>';
        }
        else
        {
            html += obj.date;
        }

        html +='</td><td class="p-2 ps-0">'+obj.callsign+'<br><small>'+obj.dep+' ('+obj.depicao+')<br>'+obj.arr+' ('+obj.arricao+')</small></td></tr>'
    })

    $('#flight-list').html(html);
}

async function zoomToUser(user)
{

    if(!$('#map').length || manual)
    {
        window.location.href = '/?user=' + user;
    }

    if(typeof(ap_featuregroup) != 'undefined')
    {
        returnFromAirport();
    }

    $('#user-sidebar').show();
    
    // If the searchbox is showing, hide it
    $('#search-wrapper').hide();

    user_sidebar = true;
    
    await initializeUser(user);
}