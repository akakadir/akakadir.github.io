$(document).ready(function() {
  var fontSizeSlider = $("#fontSize");
  var fontSizeValue = $("#fontSizeValue");
  var fontSizeDisplay = $("#fontSizeDisplay");
  var linkColorPicker = $("#linkColor");
  var linkColorDisplay = $(".link-color");
  var selectedColorText = $("#selectedColor");
  
  var originalFontSize;
  var originalLinkColor;
  
  function saveSettings() {
    var currentFontSize = fontSizeSlider.val();
    var currentLinkColor = linkColorPicker.val();
    
    localStorage.setItem("fontSize", currentFontSize);
    localStorage.setItem("linkColor", currentLinkColor);
    
    applySettings(currentFontSize, currentLinkColor);
  }
  
  function applySettings(fontSize, linkColor) {
    fontSizeValue.text(fontSize + "px");
    fontSizeDisplay.css("font-size", fontSize + "px");
    $("body").not("#ayarlar").css("font-size", fontSize + "px");
    $("#ayarlar").css("font-size", "initial");
    
    linkColorDisplay.css("color", linkColor);
    selectedColorText.text(linkColor);
    $("a").not(".btn").css("color", linkColor);
    
    fontSizeSlider.val(fontSize);
    linkColorPicker.val(linkColor);
  }
  
  function loadSettings() {
    var savedFontSize = localStorage.getItem("fontSize") || "16";
    var savedLinkColor = localStorage.getItem("linkColor") || "#53a245";
    
    applySettings(savedFontSize, savedLinkColor);
    
    originalFontSize = savedFontSize;
    originalLinkColor = savedLinkColor;
  }
  
  loadSettings();
  
  fontSizeSlider.on("input", function() {
    var size = fontSizeSlider.val();
    fontSizeValue.text(size + "px");
    fontSizeDisplay.css("font-size", size + "px");
    $("body").not("#ayarlar").css("font-size", size + "px");
    $("#ayarlar").css("font-size", "initial");
  });
  
  linkColorPicker.on("input", function() {
    var selectedColor = linkColorPicker.val();
    linkColorDisplay.css("color", selectedColor);
    selectedColorText.text(selectedColor);
    $("a").not(".btn").css("color", selectedColor);
  });
  
  $("#ayarlar").on("show", function() {
    originalFontSize = fontSizeSlider.val();
    originalLinkColor = linkColorPicker.val();
  });
  
  $(".modal-footer .btn-primary").click(function() {
    saveSettings();
  });
  
  $(".modal-footer .btn-danger").click(function() {
    applySettings(originalFontSize, originalLinkColor);
  });
});
