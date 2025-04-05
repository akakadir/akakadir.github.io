$(document).ready(function() {
  window.isModalOpen = false;

  var fontSizeSlider = $("#fontSize");
  var fontSizeValue = $("#fontSizeValue");
  var fontSizeDisplay = $("#fontSizeDisplay");
  var linkColorPicker = $("#linkColor");
  var linkColorDisplay = $(".link-color");
  var selectedColorText = $("#selectedColor");

  var originalFontSize;
  var originalLinkColor;
  var isModalOpen = false;
  var intervalId;

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
    $("a").not(".btn").not(".noncolor").css("color", linkColor);
    $(".noncolor").css("color", "#f11115");
    $(".dot").css("color", linkColor);

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

  function startSettingsMonitor() {
    if (!intervalId) {
      intervalId = setInterval(function() {
        if (!isModalOpen) {
          var storedFontSize = localStorage.getItem("fontSize") || "16";
          var storedLinkColor = localStorage.getItem("linkColor") || "#53a245";

          if (fontSizeSlider.val() !== storedFontSize || linkColorPicker.val() !== storedLinkColor) {
            applySettings(storedFontSize, storedLinkColor);
          }
        }
      }, 3000);
    }
  }

  loadSettings();
  startSettingsMonitor();

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
    $("a").not(".btn").not(".noncolor").css("color", selectedColor);
    $(".noncolor").css("color", "#f11115");
    $(".dot").css("color", linkColor);
  });

  $("#ayarlar").on("show", function() {
    isModalOpen = true;
    window.isModalOpen = true;
    originalFontSize = fontSizeSlider.val();
    originalLinkColor = linkColorPicker.val();
  });

  $("#ayarlar").on("hide", function() {
    isModalOpen = false;
    window.isModalOpen = false;
  });

  $(".modal-footer .btn-primary").click(function() {
    saveSettings();
  });

  $(".modal-footer .btn-danger").click(function() {
    applySettings(originalFontSize, originalLinkColor);
  });
});
