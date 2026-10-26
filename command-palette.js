/**
 * @fileoverview 全域架構指揮中心 (HUD Command Palette: Ctrl+K / ⌘K)
 * 模組化設計：獨立管理鍵盤極速導航、全域快捷操作與模糊搜尋
 */

(() => {
  'use strict';

  const COMMANDS = [
    {
      id: 'node-nvm',
      titleZh: 'NVM Knowledge Hub',
      titleEn: 'NVM Knowledge Hub',
      searchAliases: "Node-01 半導體非揮發性記憶體物理與白皮書門戶 Semiconductor NVM foundations and whitepapers",
      descZh: "透過 OTP、MTP、eFlash、PUF 與技術文獻，探索非揮發性記憶體及安全儲存。",
      descEn: "Explore non-volatile memory and secure storage through OTP, MTP, eFlash, PUF and technical literature.",
      action: () => (window.location.href = 'https://hub.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-arcade',
      titleZh: '多元遊戲大廳',
      titleEn: 'Interactive Game Arcade',
      searchAliases: "Node-02 涵蓋 3D 棋盤對弈、策略模擬與復古街機合輯 Interactive gaming suite featuring 21 titles",
      descZh: "在瀏覽器探索棋盤、策略、空間益智與街機遊戲。",
      descEn: "Board games, strategy, spatial puzzles and arcade experiences in the browser.",
      action: () => (window.location.href = 'https://arcade.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-learning',
      titleZh: 'E-Learning 學習引擎',
      titleEn: 'E-Learning Engine',
      searchAliases: "Node-03 數學、物理、日語、多益與華語八軌引擎 Eight-track unified modular learning engine",
      descZh: "數理、程式與語言的互動練習及學習資源。",
      descEn: "Interactive practice and learning resources across STEM, computing and languages.",
      action: () => (window.location.href = 'https://learn.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-hardware',
      titleZh: 'Hardware Profile',
      titleEn: 'Hardware Profile',
      searchAliases: "Node-04 AI 工作站、RTX 5080 eGPU 與工程硬體資產 Interactive asset profile detailing AI workstations",
      descZh: "開發工作站、硬體規格與本機算力配置參考。",
      descEn: "Development workstations, hardware specifications and local compute references.",
      action: () => (window.location.href = 'https://hardware.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-semi',
      titleZh: 'Semiconductor Knowledge Hub',
      titleEn: 'Semiconductor Knowledge Hub',
      searchAliases: "Node-07 從沙子到晶片的晶圓製造與先進封裝知識門戶 From sand to silicon: wafer fabrication and packaging hub",
      descZh: "從 FEOL、BEOL 到 CMOS 等整合技術，探索晶圓製造、製程整合與先進封裝。",
      descEn: "Wafer fabrication, process integration and advanced packaging, from FEOL and BEOL to CMOS and beyond.",
      action: () => (window.location.href = 'https://samhuang68.github.io/semiconductor-knowledge-hub/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-guangxi',
      titleZh: '光汐工作站',
      titleEn: 'Guangxi Studio',
      searchAliases: "Node-09 瀏覽器音樂創作：音色設計、演奏、八軌編曲與混音 In-browser music studio: sound design, playing, 8-track arrangement, and mixing",
      descZh: "在瀏覽器探索音色、演奏與編曲的音樂工作站。",
      descEn: "A browser music workstation for exploring sound, playing and arranging musical ideas.",
      action: () => (window.location.href = 'https://guangxi-studio.samhuang68.workers.dev/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-d2r-codex',
      titleZh: '聖休亞瑞典藏中樞',
      titleEn: 'D2R Sanctuary Codex',
      searchAliases: "Node-10 暗黑 2 獄火重生：配裝模擬、技能樹、裝備與符文之語資料庫 Diablo II: Resurrected build simulator, skill tree, and gear and runeword database",
      descZh: "暗黑破壞神 II：獄火重生的配裝模擬，以及技能、裝備與符文之語資料入口。",
      descEn: "Build simulation and references for Diablo II: Resurrected skills, equipment and runewords.",
      action: () => (window.location.href = 'https://d2r.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-oip',
      titleZh: 'Secure Storage OIP',
      titleEn: 'Secure Storage OIP',
      searchAliases: "Node-05 私人技術簡報與本機展示，需 GitHub 存取權限 Private briefings and local demos; GitHub access required",
      descZh: "Secure Storage／OIP 私人技術簡報與本機展示工作區，整理硬體信任根（RoT）及非揮發性記憶體安全參考架構。",
      descEn: "Private Secure Storage/OIP briefings and a local demo workspace for hardware Root of Trust and NVM security reference architectures.",
      action: () => (window.location.href = 'https://github.com/SamHuang68/secure-storage-oip-briefing'),
      badge: 'PRIVATE',
    },
    {
      id: 'node-pulse',
      titleZh: 'TW Pulse Terminal',
      titleEn: 'TW Pulse Terminal',
      searchAliases: "Node-06 私人模擬資料原型，非目前 Stock Terminal，沒有真實行情；需 GitHub 存取權限 Private simulated-data prototype, separate from the current Stock Terminal. No live market data; GitHub access required",
      descZh: "私人模擬資料介面原型，非目前 Stock Terminal，沒有真實行情服務；需 GitHub 存取權限。",
      descEn: "A private simulated-data interface prototype, separate from the current Stock Terminal. No live market data; GitHub access required.",
      action: () => (window.location.href = 'https://github.com/SamHuang68/tw-pulse-terminal'),
      badge: 'PRIVATE',
    },
    {
      id: 'node-kaodata',
      titleZh: '光榮武將臉譜（私人）',
      titleEn: 'Portrait Archive (Private)',
      searchAliases: "武將臉譜私人典藏，限擁有者登入 Private portrait archive; owner sign-in required",
      descZh: "私人武將臉譜典藏，限擁有者登入；本頁僅提供入口。",
      descEn: "Private character portrait collection. Owner sign-in required; this page provides only the entry point.",
      action: () => (window.location.href = 'https://koei-portrait-archive.samhuang68.chatgpt.site'),
      badge: 'PRIVATE',
    },
    {
      id: 'act-lang',
      titleZh: '切換語系 (Toggle Language: 中 / EN)',
      titleEn: 'Toggle Language (ZH / EN)',
      descZh: '即時雙向切換繁體中文與專業英文語意',
      descEn: 'Switch interface between Traditional Chinese and English',
      action: () => {
        if (typeof window.toggleLanguage === 'function') window.toggleLanguage();
      },
      badge: 'ACTION',
    },
    {
      id: 'act-audio',
      titleZh: '切換晶片合成音效 (Toggle Silicon Audio)',
      titleEn: 'Toggle Silicon Synthesizer Audio',
      descZh: '開啟或關閉水波漣漪與晶片光學滴答微音',
      descEn: 'Enable or disable liquid ripple and click sound FX',
      action: () => {
        if (window.SiliconAudio) {
          const enabled = window.SiliconAudio.toggle();
          const soundBtn = document.getElementById('soundToggle');
          if (soundBtn) {
            soundBtn.setAttribute('data-sound', enabled ? 'on' : 'off');
            soundBtn.setAttribute('title', enabled ? '音效: 開啟 (點擊關閉)' : '音效: 靜音 (點擊開啟)');
          }
        }
      },
      badge: 'AUDIO',
    },
    {
      id: 'act-xray',
      titleZh: '切換 X-Ray 晶圓光罩透視圖層',
      titleEn: 'Toggle X-Ray Lithography Layer View',
      descZh: '透視晶圓 EDA 布圖走線與深層微結構',
      descEn: 'Inspect underlying EDA layout and silicon circuitry',
      action: () => {
        document.body.classList.toggle('xray-mode');
        if (window.SiliconAudio) window.SiliconAudio.playHud();
      },
      badge: 'X-RAY',
    },
  ];

  const COPY = {
    zh: { title: '搜尋與指令', search: '搜尋專案或指令', close: '關閉搜尋', list: '專案與指令', empty: '沒有符合的專案或指令', hint: '↑ ↓ 選擇 · Enter 執行 · Esc 關閉', count: n => `${n} 個結果` },
    en: { title: 'Search & commands', search: 'Search projects or commands', close: 'Close search', list: 'Projects and commands', empty: 'No matching projects or commands', hint: '↑ ↓ Choose · Enter Run · Esc Close', count: n => `${n} ${n === 1 ? 'result' : 'results'}` },
  };
  let modalEl, inputEl, listEl, statusEl;
  let returnFocus;
  let activeIndex = 0;
  let filteredCommands = [...COMMANDS];
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
      badge.textContent = command.badge;
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
    filteredCommands = COMMANDS.filter(command =>
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
