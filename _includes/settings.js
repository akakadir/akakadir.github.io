/**
 * Settings.js - İzole edilmiş ayarlar modülü
 * Bu modül, sayfanın geri kalanını etkilemeden Bootstrap kullanarak bir ayarlar modalı oluşturur
 */
(function() {
  // Stil ve HTML içeriğini dinamik olarak oluştur
  function createSettingsModule() {
    // Bootstrap stillerini sadece kendi kapsamında tanımla
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Settings içeriğini kapsayan konteyner */
      #settings-container * {
        box-sizing: border-box;
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      }
      
      /* Modal stillerini özelleştir */
      #settings-container .modal {
        max-width: 250px;
        background-color: white;
        border-radius: 6px;
        box-shadow: 0 3px 7px rgba(0, 0, 0, 0.3);
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1050;
        outline: none;
        display: none;
      }
      
      #settings-container .modal.in {
        display: block;
      }
      
      #settings-container .modal-backdrop {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 1040;
        background-color: #000;
        opacity: 0.5;
        display: none;
      }
      
      #settings-container .modal-backdrop.in {
        display: block;
      }
      
      #settings-container .modal-body {
        padding: 15px;
      }
      
      #settings-container .modal-footer {
        padding: 14px 15px 15px;
        margin-bottom: 0;
        text-align: right;
        background-color: #f5f5f5;
        border-top: 1px solid #ddd;
        border-radius: 0 0 6px 6px;
      }
      
      /* Buton stilleri */
      #settings-container .btn {
        display: inline-block;
        padding: 4px 12px;
        margin-bottom: 0;
        font-size: 14px;
        line-height: 20px;
        color: #333;
        text-align: center;
        vertical-align: middle;
        cursor: pointer;
        background-color: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4px;
        text-decoration: none;
      }
      
      #settings-container .btn:hover {
        background-color: #e6e6e6;
      }
      
      #settings-container .btn-primary {
        color: #fff;
        background-color: #006dcc;
        border-color: #0044cc;
      }
      
      #settings-container .btn-primary:hover {
        background-color: #0044cc;
      }
      
      #settings-container .btn-danger {
        color: #fff;
        background-color: #da4f49;
        border-color: #bd362f;
      }
      
      #settings-container .btn-danger:hover {
        background-color: #bd362f;
      }
      
      #settings-container .btn-inverse {
        color: #fff;
        background-color: #363636;
        border-color: #222;
      }
      
      #settings-container .btn-inverse:hover {
        background-color: #222;
      }
      
      /* Diğer stiller */
      #settings-container hr {
        margin: 10px 0;
        border: 0;
        border-top: 1px solid #eee;
      }
      
      #settings-container label {
        display: block;
        margin-bottom: 5px;
      }
      
      #settings-container input[type="range"] {
        width: 100%;
      }
      
      #settings-container input[type="color"] {
        height: 30px;
        width: 50px;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Settings konteynerini oluştur
    const container = document.createElement('div');
    container.id = 'settings-container';
    
    // HTML içeriğini oluştur
    container.innerHTML = `
      <a href="#" id="settings-trigger" class="btn">Ayarlar</a>
      
      <div class="modal-backdrop fade"></div>
      <div id="settings-modal" class="modal fade">
        <div class="modal-body"> 
          <label>Tema Seçimi: </label>
          <a href="#" id="light-theme" class="btn">Açık</a>
          <a href="#" id="dark-theme" class="btn btn-inverse">Koyu</a>
          <hr>
          <label for="link-color">Bağlantı Paleti: <span id="selected-color">#53a245</span></label>
          <input type="color" id="link-color" value="#53a245">
          <p class="link-color-display">
            <a style="color:#53a245" href="#" class="link-color">Bu bir örnek bağlantıdır</a>
          </p>
          <hr>
          <label for="font-size">Font Ölçeği: <span id="font-size-value">14px</span></label>
          <input type="range" id="font-size" min="11" max="16" value="14">
          <p class="font-size-display" id="font-size-display">Değişiklikler böyle gözükecek.</p>
        </div>
        
        <div class="modal-footer">
          <a href="#" id="cancel-btn" class="btn btn-danger">Vazgeç</a>
          <a href="#" id="save-btn" class="btn btn-primary">Kaydet</a>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Ayarları sakla
    const settings = {
      theme: localStorage.getItem('site-theme') || 'light',
      linkColor: localStorage.getItem('site-link-color') || '#53a245',
      fontSize: localStorage.getItem('site-font-size') || '14'
    };
    
    // Ayarları HTML'e uygula
    if (settings.theme === 'dark') {
      document.getElementById('dark-theme').classList.add('active');
    } else {
      document.getElementById('light-theme').classList.add('active');
    }
    
    document.getElementById('link-color').value = settings.linkColor;
    document.getElementById('selected-color').textContent = settings.linkColor;
    document.querySelector('.link-color').style.color = settings.linkColor;
    
    document.getElementById('font-size').value = settings.fontSize;
    document.getElementById('font-size-value').textContent = settings.fontSize + 'px';
    document.getElementById('font-size-display').style.fontSize = settings.fontSize + 'px';
    
    // Eğer ayarlar daha önce uygulanmışsa, sayfaya uygula
    applySettingsToPage(settings);
    
    // Olayları yönet
    setupEventListeners();
  }
  
  // Tüm olay dinleyicilerini ayarla
  function setupEventListeners() {
    // Modal açma butonu
    document.getElementById('settings-trigger').addEventListener('click', function(e) {
      e.preventDefault();
      openModal();
    });
    
    // Vazgeç butonu
    document.getElementById('cancel-btn').addEventListener('click', function(e) {
      e.preventDefault();
      closeModal();
    });
    
    // Kaydet butonu
    document.getElementById('save-btn').addEventListener('click', function(e) {
      e.preventDefault();
      saveSettings();
      closeModal();
    });
    
    // Tema seçimi
    document.getElementById('light-theme').addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('dark-theme').classList.remove('active');
      this.classList.add('active');
    });
    
    document.getElementById('dark-theme').addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('light-theme').classList.remove('active');
      this.classList.add('active');
    });
    
    // Font boyutu değişimi
    const fontSizeSlider = document.getElementById('font-size');
    fontSizeSlider.addEventListener('input', function() {
      const size = this.value;
      document.getElementById('font-size-value').textContent = size + 'px';
      document.getElementById('font-size-display').style.fontSize = size + 'px';
    });
    
    // Renk seçimi
    const linkColorPicker = document.getElementById('link-color');
    linkColorPicker.addEventListener('input', function() {
      const selectedColor = this.value;
      document.getElementById('selected-color').textContent = selectedColor;
      document.querySelector('.link-color').style.color = selectedColor;
    });
  }
  
  // Modal açma fonksiyonu
  function openModal() {
    const backdrop = document.querySelector('#settings-container .modal-backdrop');
    const modal = document.getElementById('settings-modal');
    
    backdrop.classList.add('in');
    modal.classList.add('in');
  }
  
  // Modal kapatma fonksiyonu
  function closeModal() {
    const backdrop = document.querySelector('#settings-container .modal-backdrop');
    const modal = document.getElementById('settings-modal');
    
    backdrop.classList.remove('in');
    modal.classList.remove('in');
  }
  
  // Ayarları kaydetme fonksiyonu
  function saveSettings() {
    const settings = {
      theme: document.getElementById('dark-theme').classList.contains('active') ? 'dark' : 'light',
      linkColor: document.getElementById('link-color').value,
      fontSize: document.getElementById('font-size').value
    };
    
    // Local Storage'a kaydet
    localStorage.setItem('site-theme', settings.theme);
    localStorage.setItem('site-link-color', settings.linkColor);
    localStorage.setItem('site-font-size', settings.fontSize);
    
    // Sayfaya uygula
    applySettingsToPage(settings);
  }
  
  // Ayarları sayfaya uygulama fonksiyonu
  function applySettingsToPage(settings) {
    // Theme
    if (settings.theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
    
    // Link rengi - sadece #settings-container dışındaki linklere uygulanır
    const links = document.querySelectorAll('a:not(#settings-container a)');
    links.forEach(link => {
      link.style.color = settings.linkColor;
    });
    
    // Font boyutu - sadece #settings-container dışındaki elemanlara uygulanır
    document.body.style.fontSize = settings.fontSize + 'px';
  }
  
  // Sayfaya yüklendiğinde çalıştır
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSettingsModule);
  } else {
    createSettingsModule();
  }
})();
