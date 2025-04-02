$(document).ready(function() {
  var fontSizeSlider = $("#fontSize");
  var fontSizeValue = $("#fontSizeValue");
  var fontSizeDisplay = $("#fontSizeDisplay");

  fontSizeSlider.on("input", function() {
    var size = fontSizeSlider.val();
    fontSizeValue.text(size + "px");
    fontSizeDisplay.css("font-size", size + "px");
    $("body").css("font-size", size + "px");
  });
  
  var textColorPicker = $("#linkColor");
  var selectedColorText = $("#selectedColor");

  textColorPicker.on("input", function() {
    var selectedColor = textColorPicker.val();
    selectedColorText.text(selectedColor);
    $("p").css("color", selectedColor);
  });
});
