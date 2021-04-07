var streamer_template = Handlebars.compile('<div class="infobar-streamer" style="display: none"><div class="d-flex align-items-center"><a class="streamertag me-3 py-1 px-2" style="color: #fff;background: #6441a5; border-radius: 1rem;" href=“{{ streamerURL }}“ ><i class="fab fa-twitch" style="color: #fff"></i> {{ streamer }}</a> <span class="me-3">{{ callsign }}</span><span id="infobar-icao">{{ dep }}</span><div id="flights-progressbar" class="d-flex flex-row align-items-center" style="width: 150px"><div id="flights-progressbar-elapsed" style="width: {{ width }}" class="bg-success"></div><i id="flights-progressbar-plane" class="fas fa-plane text-success"></i><div id="flights-progressbar-remaining"></div></div><span id="flights-arr-icao" class="infobar-icao">{{ arr }}</span></div></div>');
// execute the compiled template and print the output to the console

compiled = streamer_template({
    streamer: 'Iced8383',
    streamerURL: 'Iced8383',
    callsign: 'NWR69',
    dep: 'KMSP',
    arr: 'KSFO',
    width: '60px',
    viewers: '126',
});


$(document).ready(() => {
    $('#infobar').html('<div id="infobar-title" style="display: none"><i class="fas fa-circle text-danger me-2"></i> Active Streamers</div>');
    $('#infobar-title').fadeIn(500).delay(5000).fadeOut(500, () => {
        $('#infobar').html(compiled);
        $('.infobar-streamer').fadeIn(500);
    })
});