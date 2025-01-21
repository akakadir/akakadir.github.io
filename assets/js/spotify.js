const SPOTIFY_CLIENT_ID = "4a0c7ffafdc14086818973e1e07b5aa8";
const SPOTIFY_CLIENT_SECRET = "5d8d938a40bd4730be33e6ebb6be5499";

// CORS Proxy URL
const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";

function fetchSpotifyToken(callback) {
    $.ajax({
        url: CORS_PROXY + "https://accounts.spotify.com/api/token",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET),
        },
        data: { grant_type: "client_credentials" },
        success: function (response) {
            callback(response.access_token);
        },
        error: function (xhr) {
            console.error("Spotify token alınırken bir hata oluştu: ", xhr.responseText);
        },
    });
}

function fetchSpotifyTrack(artist, title, callback) {
    fetchSpotifyToken(function (token) {
        $.ajax({
            url: CORS_PROXY + `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}%20${encodeURIComponent(title)}&type=track&limit=1`,
            method: "GET",
            headers: {
                Authorization: "Bearer " + token,
            },
            success: function (response) {
                if (response.tracks.items.length > 0) {
                    callback(response.tracks.items[0].external_urls.spotify);
                } else {
                    callback(null);
                }
            },
            error: function (xhr) {
                console.error("Spotify şarkı aranırken bir hata oluştu: ", xhr.responseText);
            },
        });
    });
}

function fetchLastTrack() {
    $.getJSON("https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=akakadir&api_key=99fb051e59a2e902e5a6f0981a4c6203&format=json", function (data) {
        var container = document.getElementById("lastfm");
        var trackLink = document.getElementById("trackLink");
        var noTrackMessage = document.getElementById("noTrackMessage");

        if (data.recenttracks && data.recenttracks.track && data.recenttracks.track.length > 0) {
            var track = data.recenttracks.track[0];
            var artist = track.artist["#text"];
            var title = track.name;
            var nowPlaying = track["@attr"] && track["@attr"].nowplaying;

            if (container) {
                if (nowPlaying) {
                    fetchSpotifyTrack(artist, title, function (spotifyUrl) {
                        if (spotifyUrl) {
                            trackLink.textContent = `${artist} - ${title}`;
                            trackLink.href = spotifyUrl;
                            trackLink.target = "_blank";
                            trackLink.style.display = "inline";
                            noTrackMessage.style.display = "none";
                        } else {
                            trackLink.textContent = `${artist} - ${title}`;
                            trackLink.href = "#";
                            trackLink.style.display = "inline";
                            noTrackMessage.style.display = "none";
                        }
                    });
                } else {
                    trackLink.style.display = "none";
                    noTrackMessage.style.display = "inline";
                }
            }
        } else {
            console.error("Last.fm'den parça bilgisi alınamadı.");
        }
    });
}

setInterval(fetchLastTrack, 3000);
fetchLastTrack();
