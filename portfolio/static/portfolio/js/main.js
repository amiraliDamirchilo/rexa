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
