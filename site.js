(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.primary-navigation');
  const pageRegions = [...document.querySelectorAll('main, footer')];

  if (!header || !toggle || !navigation) return;

  const navLinks = [...navigation.querySelectorAll('a[href^="#"]')];
  const desktop = window.matchMedia('(min-width: 761px)');

  const setPageInert = (enabled) => {
    pageRegions.forEach((region) => {
      if (enabled) region.setAttribute('inert', '');
      else region.removeAttribute('inert');
    });
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '開啟主選單');
    document.body.classList.remove('navigation-open');
    setPageInert(false);
    if (restoreFocus) toggle.focus({ preventScroll: true });
  };

  const openMenu = () => {
    header.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '關閉主選單');
    document.body.classList.add('navigation-open');
    setPageInert(true);

    const firstLink = navigation.querySelector('a');
    firstLink?.focus({ preventScroll: true });
    if (document.activeElement !== firstLink) {
      requestAnimationFrame(() => firstLink?.focus({ preventScroll: true }));
    }
  };

  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') closeMenu({ restoreFocus: true });
    else openMenu();
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (!header.classList.contains('menu-open')) return;

    if (event.key === 'Escape') {
      closeMenu({ restoreFocus: true });
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = [toggle, ...navigation.querySelectorAll('a')];
    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;

        navLinks.forEach((link) => {
          const active = link.getAttribute('href') === `#${visible.target.id}`;
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      },
      { rootMargin: '-24% 0px -62% 0px', threshold: [0.05, 0.2, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
  }

  desktop.addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });
})();
