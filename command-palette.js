// 快速導覽沿用原生 dialog、鍵盤選取與焦點復原；專案資訊直接讀取首頁。
(() => {
  'use strict';
  const ACTIONS = [
    {id: 'act-lang', titleZh: '切換語言', titleEn: 'Switch language', descZh: '在繁體中文與英文之間切換', descEn: 'Switch between Traditional Chinese and English', badge: {zh: '設定', en: 'Setting'}, action: () => applyLanguage(document.documentElement.dataset.lang === 'en' ? 'zh' : 'en')},
    {id: 'act-audio', titleZh: '切換操作音效', titleEn: 'Toggle interface sounds', descZh: '開啟或關閉按鈕與卡片微音效；預設靜音', descEn: 'Enable or mute subtle button and card sounds; muted by default', badge: '', action: () => window.SiliconAudio?.toggle()},
    {id: 'act-xray', titleZh: '切換圖層檢視', titleEn: 'Toggle layer view', descZh: '以單色高對比查看首頁原創記憶單元示意', descEn: 'Inspect the original memory illustration in high-contrast monochrome', badge: '', action: () => document.body.classList.toggle('xray-mode')}
  ];
  const COPY = {
    zh: { title: '搜尋與指令', search: '搜尋專案或指令', close: '關閉搜尋', list: '專案與指令', empty: '沒有符合的專案或指令', hint: '↑ ↓ 選擇 · Enter 執行 · Esc 關閉', count: n => `${n} 個結果` },
    en: { title: 'Search & commands', search: 'Search projects or commands', close: 'Close search', list: 'Projects and commands', empty: 'No matching projects or commands', hint: '↑ ↓ Choose · Enter Run · Esc Close', count: n => `${n} ${n === 1 ? 'result' : 'results'}` },
  };
  let modalEl, inputEl, listEl, statusEl;
  let returnFocus;
  let activeIndex = 0;
  let filteredCommands = [];
  const getCommands = () => {
    const lang = getLang();
    const projects = [...document.querySelectorAll('[data-node]')].map(card => {
      const isPrivate = card.classList.contains('private-link');
      const title = card.querySelector('h3,strong');
      const description = card.querySelector('.card-description') || card.querySelector('span');
      const translated = (element, language) => I18N[language][element.dataset.i18n] || element.textContent;
      return {
        id: `project-${card.dataset.node}`,
        titleZh: translated(title, 'zh'), titleEn: translated(title, 'en'),
        descZh: translated(description, 'zh'), descEn: translated(description, 'en'),
        badge: isPrivate ? (lang === 'zh' ? '需存取權限' : 'Access required') : (lang === 'zh' ? '公開網站' : 'Public site'),
        action: () => { window.location.href = card.href; }
      };
    });
    return [...projects, ...ACTIONS];
  };
  const getLang = () => document.documentElement.dataset.lang === 'en' ? 'en' : 'zh';
  const closePalette = () => {
    if (!modalEl?.open) return;
    const opener = returnFocus;
    modalEl.close();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };

  const select = index => {
    activeIndex = index;
    listEl.querySelectorAll('[role="option"]').forEach((item, i) => {
      item.classList.toggle('is-selected', i === index);
      item.setAttribute('aria-selected', String(i === index));
    });
    const selected = listEl.children[index];
    if (selected) inputEl.setAttribute('aria-activedescendant', selected.id);
    else inputEl.removeAttribute('aria-activedescendant');
  };
  const execute = index => {
    const command = filteredCommands[index];
    if (command) { closePalette(); command.action(); }
  };
  const renderList = () => {
    const lang = getLang();
    listEl.replaceChildren();
    filteredCommands.forEach((command, index) => {
      const item = document.createElement('li');
      item.id = `command-${command.id}`;
      item.className = 'cmd-item';
      if (command.language) item.lang = command.language;
      item.setAttribute('role', 'option');
      const info = document.createElement('span');
      info.className = 'cmd-item-info';
      const title = document.createElement('span');
      title.className = 'cmd-item-title';
      title.textContent = lang === 'zh' ? command.titleZh : command.titleEn;
      const description = document.createElement('span');
      description.className = 'cmd-item-desc';
      description.textContent = lang === 'zh' ? command.descZh : command.descEn;
      const badge = document.createElement('span');
      badge.className = 'cmd-item-badge';
      badge.textContent = typeof command.badge === 'object' ? command.badge[lang] : command.badge;
      if (command.id === 'act-audio' || command.id === 'act-xray') {
        const enabled = command.id === 'act-audio' ? window.SiliconAudio?.isEnabled() : document.body.classList.contains('xray-mode');
        badge.textContent = lang === 'zh' ? (enabled ? '已開啟' : '已關閉') : (enabled ? 'ON' : 'OFF');
      }
      info.append(title, description);
      item.append(info, badge);
      item.addEventListener('pointermove', () => select(index));
      item.addEventListener('click', () => execute(index));
      listEl.append(item);
    });
    select(activeIndex);
    statusEl.textContent = filteredCommands.length ? COPY[lang].count(filteredCommands.length) : COPY[lang].empty;
  };
  const filterCommands = () => {
    const query = inputEl.value.trim().toLocaleLowerCase();
    filteredCommands = getCommands().filter(command =>
      [command.titleZh, command.titleEn, command.descZh, command.descEn, command.id]
        .some(value => value.toLocaleLowerCase().includes(query)));
    activeIndex = 0;
    renderList();
  };
  const translate = () => {
    if (!modalEl) return;
    const copy = COPY[getLang()];
    modalEl.querySelector('#cmdPaletteTitle').textContent = copy.title;
    inputEl.placeholder = copy.search;
    inputEl.setAttribute('aria-label', copy.search);
    listEl.setAttribute('aria-label', copy.list);
    modalEl.querySelector('.cmd-palette-close').setAttribute('aria-label', copy.close);
    modalEl.querySelector('.cmd-palette-hint').textContent = copy.hint;
    filterCommands();
  };
  const createPalette = () => {
    modalEl = document.createElement('dialog');
    modalEl.id = 'commandPaletteModal';
    modalEl.className = 'cmd-palette';
    modalEl.setAttribute('aria-labelledby', 'cmdPaletteTitle');
    modalEl.innerHTML = `
      <div class="cmd-palette-header">
        <h2 id="cmdPaletteTitle"></h2>
        <button type="button" class="cmd-palette-close">×</button>
      </div>
      <input type="text" class="cmd-palette-input" id="cmdPaletteInput" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="cmdPaletteList" autocomplete="off" spellcheck="false" autofocus>
      <ul class="cmd-palette-list" id="cmdPaletteList" role="listbox"></ul>
      <div class="cmd-palette-footer"><span id="cmdPaletteStatus" role="status" aria-live="polite"></span><span class="cmd-palette-hint"></span></div>`;
    document.body.append(modalEl);
    inputEl = modalEl.querySelector('#cmdPaletteInput');
    listEl = modalEl.querySelector('#cmdPaletteList');
    statusEl = modalEl.querySelector('#cmdPaletteStatus');
    modalEl.querySelector('.cmd-palette-close').addEventListener('click', closePalette);
    modalEl.addEventListener('click', event => {
      const box = modalEl.getBoundingClientRect();
      if (event.target === modalEl && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) closePalette();
    });
    modalEl.addEventListener('cancel', event => {
      // Restore focus as part of closing, before another interaction can begin.
      event.preventDefault();
      closePalette();
    });
    modalEl.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const close = modalEl.querySelector('.cmd-palette-close');
      if (event.shiftKey && document.activeElement === close) {
        event.preventDefault(); inputEl.focus();
      } else if (!event.shiftKey && document.activeElement === inputEl) {
        event.preventDefault(); close.focus();
      }
    });
    inputEl.addEventListener('input', filterCommands);
    inputEl.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const count = filteredCommands.length;
        if (!count) return;
        select((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + count) % count);
        listEl.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        execute(activeIndex);
      }
    });
  };
  const openPalette = (opener = document.activeElement) => {
    if (!modalEl) createPalette();
    if (modalEl.open) return;
    // Pointer activation does not focus buttons in every browser.
    returnFocus = opener;
    inputEl.value = '';
    translate();
    modalEl.showModal();
    inputEl.focus();
    if (window.SiliconAudio) window.SiliconAudio.playHud();
  };
  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (modalEl?.open) closePalette(); else openPalette();
    }
  });
  document.addEventListener('portal-languagechange', translate);
  createPalette();
  translate();
  window.openCommandPalette = openPalette;
})();
