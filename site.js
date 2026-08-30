(() => {
  document.documentElement.classList.add('js-ready');

  const year = document.querySelector('[data-current-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  const cards = [...document.querySelectorAll('.portal-card')];
  cards.forEach((card) => {
    card.addEventListener('pointerdown', () => card.classList.add('is-pressed'));
    card.addEventListener('pointerup', () => card.classList.remove('is-pressed'));
    card.addEventListener('pointercancel', () => card.classList.remove('is-pressed'));
    card.addEventListener('pointerleave', () => card.classList.remove('is-pressed'));
  });

  window.switchTab = (type) => {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach((btn) => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });

    const activeBtn = document.getElementById(`tab-${type}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
    }

    let visibleCount = 0;
    cards.forEach((card) => {
      const cardType = card.getAttribute('data-type');
      if (type === 'all' || cardType === type) {
        card.classList.remove('hidden');
        card.style.opacity = '0';
        card.style.transform = 'translateY(4px)';
        requestAnimationFrame(() => {
          card.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
        visibleCount += 1;
      } else {
        card.classList.add('hidden');
      }
    });

    const countDisplay = document.getElementById('matrix-count');
    if (countDisplay) {
      countDisplay.textContent = visibleCount < 10 ? `0${visibleCount}` : String(visibleCount);
    }
  };
})();
