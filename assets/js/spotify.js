setInterval(function(){
fetch('https://spotify.aidenwallis.co.uk/u/63a218d8d1def76279e0eec8')
.then(res => res.text())
.then((textResponse) => {
document.querySelector('#sp-wg').textContent = textResponse.replace('User is currently not playing any music on Spotify.', 'kendimi');
 });
}, 3000);
