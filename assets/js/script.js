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
  
  var linkColorPicker = $("#linkColor");
  var linkColorDisplay = $(".link-color");
  var selectedColorText = $("#selectedColor");

  linkColorPicker.on("input", function() {
    var selectedColor = linkColorPicker.val();
    linkColorDisplay.css("color", selectedColor);
    selectedColorText.text(selectedColor);
    $("a").css("color", selectedColor);
  });
});
