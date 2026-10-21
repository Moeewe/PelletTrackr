// Such-Felder bekommen automatisch ein "×" zum schnellen Leeren (auch in später geöffneten Dialogen).
(function () {
  const SELECTOR = 'input.search-input, #userManagerSearchInput, #safetySearch, #safetyPersonSearch, #printerSearchInput, #knowledgeQuestion';

  function decorate(input) {
    if (input.dataset.clearReady || !input.parentNode) return;
    input.dataset.clearReady = '1';
    const wrap = document.createElement('span');
    wrap.className = 'search-field';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-clear';
    button.setAttribute('aria-label', 'Suche leeren');
    button.textContent = '×';
    wrap.appendChild(button);

    const update = () => wrap.classList.toggle('has-value', input.value.length > 0);
    button.addEventListener('click', () => {
      input.value = '';
      ['input', 'keyup', 'change'].forEach(type => input.dispatchEvent(new Event(type, { bubbles: true })));
      update();
      input.focus();
    });
    ['input', 'keyup', 'change', 'focus'].forEach(type => input.addEventListener(type, update));
    update();
  }

  const scan = root => (root.querySelectorAll ? root.querySelectorAll(SELECTOR) : []).forEach(decorate);

  function start() {
    scan(document);
    new MutationObserver(mutations => {
      for (const mutation of mutations) mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.(SELECTOR)) decorate(node);
        scan(node);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
