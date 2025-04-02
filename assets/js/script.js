$(document).ready(function() {
  var fontSizeSlider = $("#fontSize");
  var fontSizeValue = $("#fontSizeValue");
  var fontSizeDisplay = $("#fontSizeDisplay");

  fontSizeSlider.on("input", function() {
    var size = fontSizeSlider.val();
    fontSizeValue.text(size + "px");
    fontSizeDisplay.css("font-size", size + "px");
    $("body").not("#ayarlar").css("font-size", size + "px");
    $("#ayarlar").css("font-size", "initial");
  });

  var linkColorPicker = $("#linkColor");
  var linkColorDisplay = $(".link-color");
  var selectedColorText = $("#selectedColor");

  linkColorPicker.on("input", function() {
    var selectedColor = linkColorPicker.val();
    linkColorDisplay.css("color", selectedColor);
    selectedColorText.text(selectedColor);
    $("a").not(".btn").css("color", selectedColor);
  });

var button = document.getElementById('mode');
if (button.innerText === 'koyu') {
  button.classList.add('btn-inverse');
} else {
  button.classList.add('');
}
});
