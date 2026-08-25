(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.primary-navigation');
  const navLinks = [...document.querySelectorAll('.primary-navigation a[href^="#"]')];

  if (!header || !toggle || !navigation) return;

  const closeMenu = ({ restoreFocus = false } = {}) => {
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('navigation-open');
    if (restoreFocus) toggle.focus();
  };

  const openMenu = () => {
    header.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('navigation-open');
    const firstLink = navigation.querySelector('a');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => firstLink?.focus({ preventScroll: true }));
    });
  };

  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') closeMenu({ restoreFocus: true });
    else openMenu();
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      closeMenu({ restoreFocus: true });
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

  const desktop = window.matchMedia('(min-width: 861px)');
  desktop.addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });
})();
