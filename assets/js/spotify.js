function fetchLastTrack() {
    $.getJSON('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=akakadir&api_key=99fb051e59a2e902e5a6f0981a4c6203&format=json', function(data) {
        var container = document.getElementById('lastfm');

        if (data.recenttracks && data.recenttracks.track && data.recenttracks.track.length > 0) {
            var track = data.recenttracks.track[0];
            var artist = track.artist["#text"];
            var title = track.name;
            var url = track.url;
            var nowPlaying = track['@attr'] && track['@attr'].nowplaying;

            if (container) {
                container.innerHTML = '';
                if (nowPlaying) {
                    var a = document.createElement('a');
                    a.textContent = `${artist} - ${title}`;
                    a.href = url;
                    a.target = '_blank';
                    container.appendChild(a);
                } else {
                    var span = document.createElement('span');
                    span.textContent = "kafamı";
                    container.appendChild(span);
                }
            }
        } else {
        }
    });
}
setInterval(fetchLastTrack, 3000);
fetchLastTrack();
