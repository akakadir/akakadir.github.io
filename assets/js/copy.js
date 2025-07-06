document.addEventListener("DOMContentLoaded", function() {
  const codeBlocks = document.querySelectorAll('.highlighter-rouge pre');
  
  codeBlocks.forEach(block => {
    const button = document.createElement('button');
    button.classList.add('btn');
    button.classList.add('btn-default');
    button.classList.add('copy-button');
    button.textContent = 'kopyala';
    
    block.parentElement.style.position = 'relative';
    block.parentElement.appendChild(button);
    
    button.addEventListener('click', async function() {
      const code = block.querySelector('code').textContent;
      
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(code);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = code;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          textArea.style.opacity = '0';
          textArea.style.pointerEvents = 'none';
          textArea.setAttribute('readonly', '');
          
          document.body.appendChild(textArea);

          if (navigator.userAgent.match(/ipad|iphone/i)) {
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, 999999);
          } else {
            textArea.select();
          }
          
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }

        button.textContent = 'kopyalandı';
        setTimeout(() => {
          button.textContent = 'kopyala';
        }, 2000);
        
      } catch (err) {
        console.error('Kopyalama başarısız:', err);
        button.textContent = 'hata!';
        setTimeout(() => {
          button.textContent = 'kopyala';
        }, 2000);
      }
    });
  });
});
