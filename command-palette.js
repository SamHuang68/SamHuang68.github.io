/**
 * @fileoverview 全域架構指揮中心 (HUD Command Palette: Ctrl+K / ⌘K)
 * 模組化設計：獨立管理鍵盤極速導航、全域快捷操作與模糊搜尋
 */

(() => {
  'use strict';

  const COMMANDS = [
    {
      id: 'node-nvm',
      titleZh: 'Node-01: NVM Knowledge Hub',
      titleEn: 'Node-01: NVM Knowledge Hub',
      descZh: '半導體非揮發性記憶體物理與白皮書門戶',
      descEn: 'Semiconductor NVM foundations and whitepapers',
      action: () => (window.location.href = 'https://hub.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-arcade',
      titleZh: 'Node-02: 多元遊戲大廳',
      titleEn: 'Node-02: Interactive Game Arcade',
      descZh: '涵蓋 3D 棋盤對弈、策略模擬與復古街機合輯',
      descEn: 'Interactive gaming suite featuring 21 titles',
      action: () => (window.location.href = 'https://arcade.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-learning',
      titleZh: 'Node-03: E-Learning 學習引擎',
      titleEn: 'Node-03: E-Learning Engine',
      descZh: '數學、物理、日語、多益與華語八軌引擎',
      descEn: 'Eight-track unified modular learning engine',
      action: () => (window.location.href = 'https://learn.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-hardware',
      titleZh: 'Node-04: Hardware Profile',
      titleEn: 'Node-04: Hardware Profile',
      descZh: 'AI 工作站、RTX 5080 eGPU 與工程硬體資產',
      descEn: 'Interactive asset profile detailing AI workstations',
      action: () => (window.location.href = 'https://hardware.samhuang68.org/'),
      badge: 'LIVE WEB',
    },
    {
      id: 'node-oip',
      titleZh: 'Node-05: Secure Storage OIP',
      titleEn: 'Node-05: Secure Storage OIP',
      descZh: 'Secure Storage 與 OIP 技術溝通公開原始碼',
      descEn: 'Open codebase, briefings and silicon architecture',
      action: () => (window.location.href = 'https://github.com/SamHuang68/secure-storage-oip-briefing'),
      badge: 'REPO',
    },
    {
      id: 'node-pulse',
      titleZh: 'Node-06: TW Pulse Terminal',
      titleEn: 'Node-06: TW Pulse Terminal',
      descZh: '以終端命令語彙重組台灣脈動數據之開源專案',
      descEn: 'Terminal synthesizing Taiwan market telemetry',
      action: () => (window.location.href = 'https://github.com/SamHuang68/tw-pulse-terminal'),
      badge: 'REPO',
    },
    {
      id: 'act-lang',
      titleZh: '切換語系 (Toggle Language: 中 / EN)',
      titleEn: 'Toggle Language (中 / EN)',
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

  let modalEl = null;
  let inputEl = null;
  let listEl = null;
  let activeIndex = 0;
  let filteredCommands = [...COMMANDS];

  const getLang = () =>
    document.documentElement.getAttribute('data-lang') ||
    document.documentElement.getAttribute('data-language') ||
    'zh';

  const createPaletteDom = () => {
    modalEl = document.createElement('div');
    modalEl.id = 'commandPaletteModal';
    modalEl.className = 'cmd-palette-backdrop';
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="cmd-palette-box">
        <div class="cmd-palette-header">
          <span class="cmd-palette-icon" aria-hidden="true">⌘</span>
          <input type="text" class="cmd-palette-input" id="cmdPaletteInput" placeholder="搜尋專案、指令或架構節點 (Type a command or node)..." autocomplete="off" spellcheck="false" />
          <kbd class="cmd-palette-esc">ESC</kbd>
        </div>
        <div class="cmd-palette-body">
          <ul class="cmd-palette-list" id="cmdPaletteList" role="listbox"></ul>
        </div>
        <div class="cmd-palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> 選擇</span>
          <span><kbd>↵</kbd> 執行</span>
          <span><kbd>ESC</kbd> 關閉</span>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    inputEl = modalEl.querySelector('#cmdPaletteInput');
    listEl = modalEl.querySelector('#cmdPaletteList');

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closePalette();
    });

    inputEl.addEventListener('input', () => {
      const q = inputEl.value.trim().toLowerCase();
      const lang = getLang();
      filteredCommands = COMMANDS.filter((cmd) => {
        const title = (lang === 'zh' ? cmd.titleZh : cmd.titleEn).toLowerCase();
        const desc = (lang === 'zh' ? cmd.descZh : cmd.descEn).toLowerCase();
        return title.includes(q) || desc.includes(q) || cmd.id.includes(q);
      });
      activeIndex = 0;
      renderList();
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % Math.max(1, filteredCommands.length);
        renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length);
        renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[activeIndex]) {
          const action = filteredCommands[activeIndex].action;
          closePalette();
          action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    });
  };

  const renderList = () => {
    if (!listEl) return;
    const lang = getLang();
    if (filteredCommands.length === 0) {
      listEl.innerHTML = `<li class="cmd-empty">${lang === 'zh' ? '無匹配的架構指令' : 'No matching commands'}</li>`;
      return;
    }

    listEl.innerHTML = filteredCommands
      .map((cmd, idx) => {
        const isSelected = idx === activeIndex;
        const title = lang === 'zh' ? cmd.titleZh : cmd.titleEn;
        const desc = lang === 'zh' ? cmd.descZh : cmd.descEn;
        return `
        <li class="cmd-item ${isSelected ? 'is-selected' : ''}" role="option" aria-selected="${isSelected}" data-index="${idx}">
          <div class="cmd-item-info">
            <span class="cmd-item-title">${title}</span>
            <span class="cmd-item-desc">${desc}</span>
          </div>
          <span class="cmd-item-badge">${cmd.badge}</span>
        </li>
      `;
      })
      .join('');

    listEl.querySelectorAll('.cmd-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        activeIndex = Number(item.getAttribute('data-index'));
        renderList();
      });
      item.addEventListener('click', () => {
        const idx = Number(item.getAttribute('data-index'));
        if (filteredCommands[idx]) {
          const action = filteredCommands[idx].action;
          closePalette();
          action();
        }
      });
    });
  };

  const openPalette = () => {
    if (!modalEl) createPaletteDom();
    filteredCommands = [...COMMANDS];
    activeIndex = 0;
    renderList();
    modalEl.classList.add('is-open');
    modalEl.setAttribute('aria-hidden', 'false');
    if (window.SiliconAudio) window.SiliconAudio.playHud();
    setTimeout(() => {
      if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
      }
    }, 50);
  };

  const closePalette = () => {
    if (modalEl) {
      modalEl.classList.remove('is-open');
      modalEl.setAttribute('aria-hidden', 'true');
    }
  };

  // 全域鍵盤監聽: Ctrl+K / Cmd+K
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (modalEl && modalEl.classList.contains('is-open')) {
        closePalette();
      } else {
        openPalette();
      }
    } else if (e.key === 'Escape' && modalEl && modalEl.classList.contains('is-open')) {
      closePalette();
    }
  });

  window.openCommandPalette = openPalette;
})();
