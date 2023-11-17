$.ajax({
  url: "https://spotify.aidenwallis.co.uk/u/63a218d8d1def76279e0eec8",
  method: "GET"
}).then(function(data) {
  adminlisten = data;
  $("#track").text(adminlisten);
});