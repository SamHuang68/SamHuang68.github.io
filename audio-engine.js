/**
 * @fileoverview Web Audio 晶片合成音效引擎 (Web Audio Silicon Synthesizer)
 * 純原生代碼合成科技微音效：零外部音訊檔案依賴、零網路請求、極致省電
 * 符合規範：遵守瀏覽器自動播放策略，預設靜音，使用者點擊開啟
 */

(() => {
  'use strict';

  let audioCtx = null;
  let isSoundEnabled = false;

  const initAudioContext = () => {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };

  /**
   * 播放清脆的晶圓滴水微漣漪音 (Crystal Droplet)
   */
  const playDropletSound = (freq = 880) => {
    if (!isSoundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.22);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  };

  /**
   * 播放卡片懸停共振微音 (Crystal Hover Sheen)
   */
  const playHoverSound = () => {
    if (!isSoundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1320, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  };

  /**
   * 播放 Tab / 按鈕機械光學微滴答 (Haptic Optical Click)
   */
  const playClickSound = () => {
    if (!isSoundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.035);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  };

  /**
   * 播放 HUD 指揮中心開啟微掃描音 (HUD Activation Sweep)
   */
  const playHudSound = () => {
    if (!isSoundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    } catch {}
  };

  // 全域暴露 API
  window.SiliconAudio = {
    enable: () => {
      initAudioContext();
      isSoundEnabled = true;
      playDropletSound(1046);
    },
    disable: () => {
      isSoundEnabled = false;
    },
    toggle: () => {
      if (isSoundEnabled) {
        window.SiliconAudio.disable();
        return false;
      } else {
        window.SiliconAudio.enable();
        return true;
      }
    },
    isEnabled: () => isSoundEnabled,
    playDroplet: playDropletSound,
    playHover: playHoverSound,
    playClick: playClickSound,
    playHud: playHudSound,
  };
})();
