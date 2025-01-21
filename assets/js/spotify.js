function fetchLastTrack() {
    $.getJSON('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=akakadir&api_key=99fb051e59a2e902e5a6f0981a4c6203&format=json', function(data) {
        var container = document.getElementById('lastfm');
        var trackLink = document.getElementById('trackLink');
        var noTrackMessage = document.getElementById('noTrackMessage');

        if (data.recenttracks && data.recenttracks.track && data.recenttracks.track.length > 0) {
            var track = data.recenttracks.track[0];
            var artist = track.artist["#text"];
            var title = track.name;
            var nowPlaying = track['@attr'] && track['@attr'].nowplaying;

            if (container) {
                if (nowPlaying) {
                    var spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(artist)}%20${encodeURIComponent(title)}`;
                    trackLink.textContent = `${artist} - ${title}`;
                    trackLink.href = spotifySearchUrl;
                    trackLink.target = '_blank';
                    trackLink.style.display = 'inline';
                    noTrackMessage.style.display = 'none';
                } else {
                    trackLink.style.display = 'none';
                    noTrackMessage.style.display = 'inline';
                }
            }
        }
    });
}

setInterval(fetchLastTrack, 3000);
fetchLastTrack();
