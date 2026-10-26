// 快速導覽沿用原生 dialog、鍵盤選取與焦點復原；專案資訊直接讀取首頁。
(() => {
  'use strict';
  const ACTIONS = [
    {id: 'act-lang', titleZh: '切換語言', titleEn: 'Switch language', descZh: '在繁體中文與英文之間切換', descEn: 'Switch between Traditional Chinese and English', badge: {zh: '設定', en: 'Setting'}, action: () => applyLanguage(document.documentElement.dataset.lang === 'en' ? 'zh' : 'en')},
    {id: 'act-audio', titleZh: '切換操作音效', titleEn: 'Toggle interface sounds', descZh: '開啟或關閉按鈕與卡片微音效；預設靜音', descEn: 'Enable or mute subtle button and card sounds; muted by default', badge: '', action: () => window.SiliconAudio?.toggle()},
    {id: 'act-xray', titleZh: '切換圖層檢視', titleEn: 'Toggle layer view', descZh: '以單色檢視首頁的知識中心作品畫面', descEn: 'Inspect the knowledge hub preview in monochrome', badge: '', action: () => document.body.classList.toggle('xray-mode')}
  ];
  const COPY = {
    zh: { title: '搜尋與指令', search: '搜尋專案或指令', close: '關閉搜尋', list: '專案與指令', empty: '沒有符合的專案或指令', hint: '↑ ↓ 選擇 · Enter 執行 · Esc 關閉', count: n => `${n} 個結果` },
    en: { title: 'Search & commands', search: 'Search projects or commands', close: 'Close search', list: 'Projects and commands', empty: 'No matching projects or commands', hint: '↑ ↓ Choose · Enter Run · Esc Close', count: n => `${n} ${n === 1 ? 'result' : 'results'}` },
  };
  let modalEl, inputEl, listEl, statusEl;
  let returnFocus;
  let activeIndex = 0;
  let filteredCommands = [];
  const PROJECT_COPY = {
  "nvm": [
    "nvmTitle",
    "nvmSummary"
  ],
  "semi": [
    "semiTitle",
    "semiDesc"
  ],
  "learn": [
    "learnTitle",
    "learnOutcome"
  ],
  "hardware": [
    "hardwareTitle",
    "hardwareDesc"
  ],
  "studio": [
    "studioTitle",
    "studioOutcome"
  ],
  "arcade": [
    "arcadeTitle",
    "arcadeDesc"
  ],
  "d2r": [
    "d2rTitle",
    "d2rDesc"
  ],
  "oip": [
    "oipTitle",
    "oipDesc"
  ],
  "pulse": [
    "pulseTitle",
    "pulseDesc"
  ],
  "portrait": [
    "portraitTitle",
    "portraitDesc"
  ]
};
  // 保留3.1.0完整描述搜尋字串，顯示文案仍來自新版案例。
  const SEARCH_ALIASES = {
  "nvm": "探索 OTP、MTP、eFlash 與 PUF，串連非揮發性記憶體、安全儲存與技術白皮書。 Explore OTP, MTP, eFlash and PUF through connected resources on non-volatile memory, secure storage and technical whitepapers.",
  "semi": "半導體製程知識庫 循著晶圓製造流程，理解電晶體、製程整合與先進封裝。 Semiconductor Process Hub Follow the wafer fabrication journey to understand transistors, process integration and advanced packaging.",
  "learn": "結合數理、程式與語言學習，用互動練習與記憶排程累積理解。 Build understanding through interactive practice and spaced repetition across STEM, computing and languages.",
  "hardware": "硬體與算力環境 整理開發工作站、硬體規格與本機 AI 算力配置，作為工程實作的參考。 Hardware & compute A reference for development workstations, hardware specifications and local AI compute configurations.",
  "studio": "光汐工作站 在瀏覽器探索音色、演奏與編曲，讓音樂想法逐步成形。 Guangxi Studio Explore sound design, performance and arrangement in a browser-based music studio.",
  "arcade": "多元遊戲大廳 從棋盤與策略到益智與街機，用瀏覽器開啟一段遊戲時光。 Interactive Game Arcade Make time for play with board games, strategy, puzzles and arcade experiences in your browser.",
  "d2r": "聖休亞瑞典藏中樞 《暗黑破壞神 II：獄火重生》的配裝模擬與資料查詢入口，探索技能、裝備與符文之語。 D2R Sanctuary Codex Explore builds, skills, equipment and runewords for Diablo II: Resurrected through a simulator and reference library.",
  "oip": "私人技術簡報與展示；需 GitHub 存取權限。 Private technical briefings and demos. GitHub access required.",
  "pulse": "模擬資料介面原型，非目前 Stock Terminal，未提供真實行情；需 GitHub 存取權限。 A simulated-data interface prototype, separate from the current Stock Terminal. No live market data. GitHub access required.",
  "portrait": "武將典藏 私人武將臉譜典藏；限擁有者登入。 Portrait Archive A private character portrait collection. Owner sign-in required."
};
  const getCommands = () => {
    const lang = getLang();
    const projects = [...document.querySelectorAll('[data-project],[data-private]')].map(link => {
      const key = link.dataset.project || link.dataset.private;
      const [title, description] = PROJECT_COPY[key];
      const isPrivate = link.hasAttribute('data-private');
      return {id: 'project-' + link.dataset.node, searchAliases: SEARCH_ALIASES[key], titleZh: I18N.zh[title], titleEn: I18N.en[title], descZh: I18N.zh[description], descEn: I18N.en[description], badge: isPrivate ? I18N[lang].restricted : (lang === 'zh' ? '公開網站' : 'Public site'), action: () => { window.location.href = link.href; }};
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
      [command.titleZh, command.titleEn, command.descZh, command.descEn, command.id, command.searchAliases || '']
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
