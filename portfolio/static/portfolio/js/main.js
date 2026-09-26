const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

if (menuButton && navigation) {
  const openLabel = menuButton.dataset.openLabel || 'MENU';
  const closeLabel = menuButton.dataset.closeLabel || 'CLOSE';

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    navigation.classList.toggle('is-open', !isOpen);
    menuButton.textContent = isOpen ? openLabel : closeLabel;
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('is-open');
      menuButton.textContent = openLabel;
    });
  });
}

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

// Editorial, cut-paper reveals. Classes are added in JavaScript so the page
// remains fully readable when scripting is unavailable.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!motionQuery.matches) {
  document.body.classList.add('motion-ready');

  const addReveal = (selector, className = 'vox-reveal') => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.classList.add(...className.split(/\s+/));
      element.style.setProperty('--reveal-order', index % 6);
    });
  };

  addReveal('.hero .index-note, .hero-copy > .ink-button', 'vox-reveal vox-reveal--left');
  addReveal('.hero h1 > span', 'vox-line');
  addReveal('.hero-visual > *, .target-mark, .scribble', 'vox-reveal vox-reveal--graphic');
  addReveal('.ribbon-intro > *, .section-heading > *, .process-lead > *, .about-copy > *, .contact-copy > *', 'vox-reveal');
  addReveal('.service-item', 'vox-reveal vox-reveal--left');
  addReveal('.project-card', 'vox-reveal vox-reveal--card');
  addReveal('.process-list li', 'vox-reveal vox-reveal--left');
  addReveal('.about-stamp, .stats > div, .booking-board', 'vox-reveal vox-reveal--card');
  addReveal('.site-footer > *', 'vox-reveal');

  const reveals = document.querySelectorAll('.vox-reveal, .vox-line');
  const reveal = (element) => element.classList.add('is-inview');

  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      activeObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  reveals.forEach((element) => observer.observe(element));

  // The opening frame must play on every hard refresh, not wait for the
  // observer callback. It also recovers any reveal skipped by a fast scroll
  // or an anchor jump, so content can never remain hidden.
  const revealReachedElements = () => {
    reveals.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight) reveal(element);
    });
  };

  requestAnimationFrame(revealReachedElements);

  let scrollFrame;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = undefined;
      revealReachedElements();
    });
  }, { passive: true });
}

const contactForm = document.querySelector('.contact-form');

if (contactForm) {
  const status = contactForm.querySelector('.form-status');
  const submit = contactForm.querySelector('button[type="submit"]');
  const validationMessage = contactForm.dataset.validationMessage || 'CHECK THE REQUIRED FIELDS.';
  const sendingMessage = contactForm.dataset.sendingMessage || 'SENDING...';
  const fallbackErrorMessage = contactForm.dataset.errorMessage || 'Something went wrong.';

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      status.textContent = validationMessage;
      status.className = 'form-status is-error';
      return;
    }

    const original = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = sendingMessage;
    status.textContent = '';
    status.className = 'form-status';

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || fallbackErrorMessage);
      status.textContent = payload.message.toUpperCase();
      status.className = 'form-status is-success';
      contactForm.reset();
    } catch (error) {
      status.textContent = error.message.toUpperCase();
      status.className = 'form-status is-error';
    } finally {
      submit.disabled = false;
      submit.innerHTML = original;
    }
  });
}
