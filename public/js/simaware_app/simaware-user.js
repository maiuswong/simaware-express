async function initializeUser(cid)
{

    el = document.getElementById('sidebar-container');
    L.DomEvent.disableScrollPropagation(el);
    L.DomEvent.disableClickPropagation(el);
    
    var response = await fetch('https://simaware.ca/api/user/'+cid);
    user = await response.json();

    $('#pilotname').html(user.name);

    var response = await fetch('https://simaware.ca/api/moreflights/'+cid+'/0');
    var flights = await response.json();

    html = '';
    $.each(flights, (idx, obj) => {
        html += '<tr uid="'+obj.uid+'" class="flight"><td style="font-size: 1rem" class="py-2 px-3">'+obj.date+'</td><td class="p-2">'+obj.callsign+'<br><small>'+obj.dep+' ('+obj.depicao+')<br>'+obj.arr+' ('+obj.arricao+')</small></td></tr>'
    })

    $('#airport-list').html(html);
}