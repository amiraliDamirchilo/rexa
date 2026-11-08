/* ==========================================================================
   VOX — motion system
   Progressive: with JS off or reduced motion, the page is complete and still.

   Scroll-linked values (all 0 → 1), written as CSS custom properties:
   --p   page progress (top bar) / process playhead
   --hs  hero scrolled away (lines drift apart, photo pushes in)
   --sp  a dark "screen" section switching on
   --sl  a service title sliding into place
   --fp  footer name rising
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const body = document.body;
  root.classList.add('booted');

  const motionOK = root.classList.contains('motion');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const markLoaded = () => body.classList.add('is-loaded');
  setTimeout(markLoaded, 6000); // never leave the intro hidden

  $$('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------------
     Smooth scroll (Lenis), with graceful fallback to native
     ------------------------------------------------------------------ */
  let lenis = null;
  if (motionOK && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  }
  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -60, duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: motionOK ? 'smooth' : 'auto' });
    else target.scrollIntoView({ behavior: motionOK ? 'smooth' : 'auto' });
  };
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    if (id === '#main') return; // keep the skip link native for keyboard users
    const target = id === '#top' || id === '#' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    scrollToTarget(target);
    if (id.length > 1) history.replaceState(null, '', id);
  });

  // Page transitions: wipe the screen before leaving for the 3D version.
  const wipe = $('.page-wipe');
  $$('[data-transition]').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (!motionOK || !wipe || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      wipe.classList.add('is-active');
      setTimeout(() => { window.location.href = link.href; }, 850);
    });
  });
  // Back button returns a cached page: clear the wipe.
  window.addEventListener('pageshow', () => { if (wipe) wipe.classList.toggle('is-active', false); });

  /* ------------------------------------------------------------------
     Text splitting
     ------------------------------------------------------------------ */
  const splitWords = (el, className, inner) => {
    let index = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          if (!child.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.className = className;
            if (inner) {
              const i = document.createElement('span');
              i.className = inner;
              i.style.setProperty('--i', index);
              i.textContent = part;
              word.appendChild(i);
            } else {
              word.textContent = part;
            }
            index += 1;
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
  };

  if (motionOK) {
    const heroTitle = $('.hero__title');
    if (heroTitle) {
      const masks = $$('[data-chars]', heroTitle);
      heroTitle.setAttribute('aria-label', masks.map((n) => n.textContent.trim()).join(' '));
      masks.forEach((el, line) => {
        el.setAttribute('aria-hidden', 'true');
        const text = el.textContent.trim();
        el.textContent = '';
        let i = 0;
        text.split(/\s+/).forEach((word, wi) => {
          if (wi) el.appendChild(document.createTextNode(' '));
          const w = document.createElement('span');
          w.style.display = 'inline-block';
          w.style.whiteSpace = 'nowrap';
          Array.from(word).forEach((ch) => {
            const c = document.createElement('span');
            c.className = 'char';
            c.textContent = ch;
            c.style.setProperty('--i', i++);
            c.style.setProperty('--line', line);
            w.appendChild(c);
          });
          el.appendChild(w);
        });
      });
    }

    $$('[data-words]').forEach((el) => splitWords(el, 'w', 'w__i'));

    $$('[data-footer-word]').forEach((el) => {
      const text = el.textContent.trim();
      el.textContent = '';
      Array.from(text).forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'fl';
        s.textContent = ch;
        s.style.setProperty('--i', i);
        el.appendChild(s);
      });
    });
  }

  const scrubs = $$('[data-scrub]').map((el) => {
    splitWords(el, 'sw');
    return { el, words: $$('.sw', el), marker: $('.marker', el), lit: -1 };
  });
  if (!motionOK) scrubs.forEach((s) => s.marker && s.marker.classList.add('is-marked'));

  /* ------------------------------------------------------------------
     Scramble (nav hover, section labels on arrival)
     ------------------------------------------------------------------ */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%&*+';
  const scramble = (el, duration = 650) => {
    if (!motionOK) return;
    const final = el.dataset.text || (el.dataset.text = el.textContent);
    if (el._scr) cancelAnimationFrame(el._scr);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const shown = Math.floor(t * final.length);
      let out = '';
      for (let i = 0; i < final.length; i += 1) {
        const ch = final[i];
        out += i < shown || /\s/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) el._scr = requestAnimationFrame(step);
      else { el.textContent = final; el._scr = null; }
    };
    el._scr = requestAnimationFrame(step);
  };

  $$('[data-scramble]').forEach((el) => {
    const trigger = el.closest('a, button') || el;
    trigger.addEventListener('mouseenter', () => scramble(el, 450));
    trigger.addEventListener('focus', () => scramble(el, 450));
  });

  /* ------------------------------------------------------------------
     Intro: film-leader countdown → yellow wipe → hero builds itself
     ------------------------------------------------------------------ */
  const loader = $('.loader');
  const heroEyebrow = $('.hero [data-scramble-in]');
  const startIntro = () => {
    markLoaded();
    if (heroEyebrow) setTimeout(() => scramble(heroEyebrow, 900), 150);
  };

  if (motionOK && loader) {
    if (lenis) lenis.stop();
    const countEl = $('[data-loader-count]', loader);
    const t0 = performance.now();
    const STEP = 380;
    const fontsReady = Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
    let done = false;
    const tick = (now) => {
      const count = 3 - Math.floor((now - t0) / STEP);
      if (count >= 1) {
        if (countEl.textContent !== String(count)) {
          countEl.textContent = count;
          countEl.classList.remove('is-tick');
          void countEl.offsetWidth;
          countEl.classList.add('is-tick');
        }
        requestAnimationFrame(tick);
      } else if (!done) {
        done = true;
        fontsReady.then(() => {
          loader.classList.add('is-done');
          setTimeout(startIntro, 380);
          setTimeout(() => { loader.classList.add('is-gone'); if (lenis) lenis.start(); }, 1000);
        });
      }
    };
    requestAnimationFrame(tick);
  } else {
    startIntro();
  }

  /* ------------------------------------------------------------------
     Header + mobile menu
     ------------------------------------------------------------------ */
  const header = $('[data-header]');
  const menuButton = $('.menu-toggle');
  const navigation = $('.main-nav');
  let menuOpen = false;

  const setMenu = (open) => {
    menuOpen = open;
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
    $('.menu-toggle__label', menuButton).textContent = open
      ? (menuButton.dataset.closeLabel || 'CLOSE')
      : (menuButton.dataset.openLabel || 'MENU');
    if (open) header.classList.remove('is-hidden');
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  };

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => setMenu(!menuOpen));
    $$('a', navigation).forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); menuButton.focus(); }
    });
  }

  const navLinks = $$('.main-nav a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionObserver.observe(s));

  /* ------------------------------------------------------------------
     Reveal on arrival
     ------------------------------------------------------------------ */
  const revealTargets = $$('[data-reveal], [data-words]');
  revealTargets.forEach((el) => {
    if (!el.hasAttribute('data-reveal')) return;
    const siblings = Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-reveal'));
    el.style.setProperty('--stagger', siblings.indexOf(el) % 3);
  });

  const countUp = (el) => {
    const final = el.dataset.final;
    const match = final.match(/^(\D*)(\d+)(.*)$/s);
    if (!match || !motionOK) { el.textContent = final; return; }
    const [, prefix, digits, suffix] = match;
    const target = parseInt(digits, 10);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1800);
      const v = t === 1 ? target : Math.round(target * (1 - Math.pow(2, -10 * t)));
      el.textContent = `${prefix}${String(v).padStart(digits.length, '0')}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  $$('[data-count]').forEach((el) => {
    el.dataset.final = el.textContent.trim();
    if (motionOK) el.textContent = el.dataset.final.replace(/\d/g, '0');
  });

  const slate = $('[data-slate]');
  const clap = () => {
    if (!slate || !motionOK) return;
    slate.classList.remove('is-clap');
    void slate.offsetWidth;
    slate.classList.add('is-clap');
    setTimeout(() => slate.classList.remove('is-clap'), 520);
  };

  // Elements fully hidden by clip-path never "intersect"; watch their parent.
  const proxyOf = new Map();
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = proxyOf.get(entry.target) || entry.target;
      el.classList.add('is-in');
      $$('[data-count]', el).forEach((n) => setTimeout(() => countUp(n), 200));
      if (el === slate) setTimeout(clap, 900); // "action!" — the slate claps as it lands
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  // Clip-revealed reels only expose a sliver, so any overlap counts.
  const sliverObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  revealTargets.forEach((el) => {
    if (el.dataset.reveal === 'wipe') {
      proxyOf.set(el.parentElement, el);
      revealObserver.observe(el.parentElement);
    } else if (el.dataset.reveal === 'reel') {
      sliverObserver.observe(el);
    } else {
      revealObserver.observe(el);
    }
  });

  const markerObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      setTimeout(() => entry.target.classList.add('is-marked'), 350);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.8 });
  $$('.marker').filter((m) => !m.closest('[data-scrub]')).forEach((m) => markerObserver.observe(m));

  const scrambleObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      scramble(entry.target, 900);
      obs.unobserve(entry.target);
    });
  }, { threshold: 1 });
  $$('[data-scramble-in]').filter((el) => !el.closest('.hero')).forEach((el) => scrambleObserver.observe(el));

  /* ------------------------------------------------------------------
     Marquee (direction + speed follow your scroll)
     ------------------------------------------------------------------ */
  const marquees = $$('[data-marquee]').map((el) => {
    const track = $('.marquee__track', el);
    const m = { el, tracks: [track], base: parseFloat(el.dataset.speedBase || '1'), x: 0, w: 0 };
    m.fill = () => {
      if (!motionOK) return;
      m.w = track.getBoundingClientRect().width;
      if (!m.w) return;
      const needed = Math.ceil((el.getBoundingClientRect().width * 2) / m.w) + 1;
      while (m.tracks.length < needed) {
        const clone = track.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        el.appendChild(clone);
        m.tracks.push(clone);
      }
    };
    return m;
  });

  /* ------------------------------------------------------------------
     Process timeline
     ------------------------------------------------------------------ */
  const process = $('[data-process]');
  const proc = process && {
    el: process,
    sticky: $('.process__sticky', process),
    clips: $$('.clip', process),
    steps: $$('.step', process),
    active: -1,
    pinned: false,
  };
  if (proc) proc.steps[0]?.classList.add('is-active');

  const updateProcess = (vh) => {
    if (!proc) return;
    const rect = proc.el.getBoundingClientRect();
    if (rect.bottom < -50 || rect.top > vh + 50) return;
    const p = proc.pinned
      ? clamp(-rect.top / (rect.height - vh), 0, 1)
      : clamp((vh * 0.75 - rect.top) / rect.height, 0, 1);
    proc.el.style.setProperty('--p', p.toFixed(4));
    const active = Math.min(proc.steps.length - 1, Math.floor(p * proc.steps.length));
    if (active === proc.active) return;
    proc.active = active;
    proc.steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
    proc.clips.forEach((c, i) => {
      c.classList.toggle('is-active', i === active);
      c.classList.toggle('is-done', i < active);
    });
  };

  /* ------------------------------------------------------------------
     Pointer: hero parallax, spotlight, cursor, magnetic
     ------------------------------------------------------------------ */
  const hero = $('[data-hero]');
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  const parallax = { x: 0, y: 0 };

  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / innerWidth - 0.5) * 2;
    pointer.ny = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  const frame = $('[data-spotlight]');
  if (frame) {
    frame.addEventListener('pointermove', (e) => {
      const r = frame.getBoundingClientRect();
      frame.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      frame.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  }

  const cursor = $('.cursor');
  const cur = { rx: pointer.x, ry: pointer.y, on: false };
  let cursorDot;
  let cursorRing;
  let cursorLabel;

  if (cursor && finePointer && motionOK) {
    root.classList.add('has-cursor');
    cursorDot = $('.cursor__dot', cursor);
    cursorRing = $('.cursor__ring', cursor);
    cursorLabel = $('.cursor__label', cursor);
    cursor.classList.add('is-hidden');

    document.addEventListener('pointermove', () => {
      if (!cur.on) { cur.on = true; cur.rx = pointer.x; cur.ry = pointer.y; cursor.classList.remove('is-hidden'); }
    }, { passive: true });
    root.addEventListener('mouseleave', () => { cur.on = false; cursor.classList.add('is-hidden'); });
    document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));

    document.addEventListener('mouseover', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const labelled = t.closest('[data-cursor]');
      const interactive = t.closest('a, button, label, input, textarea, .svc');
      cursorLabel.textContent = labelled ? labelled.dataset.cursor : '';
      cursor.classList.toggle('is-label', Boolean(labelled));
      cursor.classList.toggle('is-link', !labelled && Boolean(interactive));
      cursor.classList.toggle('is-dark', Boolean(t.closest('.screen, .main-nav.is-open, .timeline')));
    });

    // Over a video the player owns the pointer.
    $$('iframe').forEach((f) => {
      f.addEventListener('mouseenter', () => cursor.classList.add('is-hidden'));
      f.addEventListener('mouseleave', () => cursor.classList.remove('is-hidden'));
    });

    $$('[data-magnetic]').forEach((el) => {
      const strength = el.classList.contains('logo') ? 0.25 : 0.35;
      el.style.transition = `${getComputedStyle(el).transition}, transform .6s cubic-bezier(.16,1,.3,1)`;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------
     Scroll-linked scenes
     ------------------------------------------------------------------ */
  const progressBar = $('.progress');
  const screens = $$('[data-screen]');
  const slides = $$('[data-slide]');
  const reels = $$('.reel');
  const footer = $('[data-footer]');
  const footerWord = $('[data-footer-word]');

  const fitFooterWord = () => {
    if (!footerWord) return;
    footerWord.style.fontSize = '100px';
    footerWord.style.width = 'max-content';
    const natural = footerWord.getBoundingClientRect().width;
    footerWord.style.width = '';
    const avail = footerWord.clientWidth;
    if (natural) footerWord.style.fontSize = `${Math.min(100 * (avail / natural) * 0.97, innerHeight * 0.62)}px`;
  };

  const updateScenes = (vh, y) => {
    if (!motionOK) return;

    if (hero && y < vh * 1.3) hero.style.setProperty('--hs', clamp(y / vh, 0, 1).toFixed(4));

    // Dark sections grow from an inset screen to full bleed as they arrive.
    screens.forEach((s) => {
      const top = s.getBoundingClientRect().top;
      if (top > vh || top < -vh) return;
      s.style.setProperty('--sp', easeOut(clamp(1 - top / (vh * 0.85), 0, 1)).toFixed(4));
    });

    // Service titles slide home as their row reaches the reading line.
    slides.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;
      el.style.setProperty('--sl', easeOut(clamp((vh - r.top) / (vh * 0.55), 0, 1)).toFixed(4));
    });

    // Reels drift at different speeds per column — depth in the screening room.
    if (innerWidth > 560) {
      reels.forEach((el, i) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.top > vh || r.bottom < 0) return;
        const col = i % 3;
        const speed = col === 1 ? 0.12 : col === 2 ? 0.05 : 0;
        el.style.setProperty('--py', `${((r.top + r.height / 2 - vh / 2) * speed).toFixed(1)}px`);
      });
    }

    if (footer) {
      const r = footer.getBoundingClientRect();
      if (r.top < vh) footer.style.setProperty('--fp', clamp((vh - r.top) / r.height, 0, 1).toFixed(4));
    }

    scrubs.forEach((s) => {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.35), 0, 1);
      const lit = Math.round(p * s.words.length);
      if (lit === s.lit) return;
      s.lit = lit;
      s.words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      if (s.marker) s.marker.classList.toggle('is-marked', lit >= s.words.length);
    });
  };

  if (motionOK) {
    // Start every scene at its resting state before the first frame.
    screens.forEach((s) => s.style.setProperty('--sp', '0'));
    slides.forEach((s) => s.style.setProperty('--sl', '0'));
    if (footer) footer.style.setProperty('--fp', '0');
  }

  const onResize = () => {
    if (proc) proc.pinned = getComputedStyle(proc.sticky).position === 'sticky';
    marquees.forEach((m) => m.fill());
    fitFooterWord();
  };
  onResize();
  window.addEventListener('resize', onResize);
  if (document.fonts) document.fonts.ready.then(onResize);

  /* ------------------------------------------------------------------
     Main loop
     ------------------------------------------------------------------ */
  let lastY = window.scrollY;
  let velocity = 0;
  let direction = 1;
  let headerY = window.scrollY;

  const loop = (time) => {
    if (lenis) lenis.raf(time);

    const vh = innerHeight;
    const y = window.scrollY;
    const max = Math.max(1, root.scrollHeight - vh);

    velocity = lerp(velocity, y - lastY, 0.12);
    lastY = y;
    if (velocity > 0.4) direction = 1;
    else if (velocity < -0.4) direction = -1;

    if (progressBar) progressBar.style.setProperty('--p', clamp(y / max, 0, 1).toFixed(4));

    if (header) {
      header.classList.toggle('is-scrolled', y > 30);
      if (!menuOpen) {
        if (y > headerY + 6 && y > 320) { header.classList.add('is-hidden'); headerY = y; }
        else if (y < headerY - 6 || y < 320) { header.classList.remove('is-hidden'); headerY = y; }
      }
    }

    if (motionOK) {
      const boost = 1 + Math.min(Math.abs(velocity) * 0.18, 6);
      const skew = clamp(-velocity * 0.25, -10, 10);
      marquees.forEach((m) => {
        if (!m.w) return;
        m.x -= m.base * direction * boost;
        if (m.x <= -m.w) m.x += m.w;
        if (m.x > 0) m.x -= m.w;
        const tf = `translate3d(${m.x.toFixed(2)}px,0,0)`;
        m.tracks.forEach((t) => { t.style.transform = tf; });
        m.el.style.transform = `skewX(${skew.toFixed(2)}deg)`;
      });

      if (hero && y < vh * 1.2) {
        parallax.x = lerp(parallax.x, finePointer ? pointer.nx : 0, 0.07);
        parallax.y = lerp(parallax.y, finePointer ? pointer.ny : 0, 0.07);
        hero.style.setProperty('--px', parallax.x.toFixed(3));
        hero.style.setProperty('--py', parallax.y.toFixed(3));
      }

      if (cursorDot && cur.on) {
        cur.rx = lerp(cur.rx, pointer.x, 0.18);
        cur.ry = lerp(cur.ry, pointer.y, 0.18);
        cursorDot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
        cursorRing.style.transform = `translate3d(${cur.rx.toFixed(1)}px, ${cur.ry.toFixed(1)}px, 0)`;
      }
    }

    updateScenes(vh, y);
    updateProcess(vh);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  /* ------------------------------------------------------------------
     Contact form — the slate claps on every take
     ------------------------------------------------------------------ */
  const contactForm = $('.contact-form');
  if (contactForm) {
    const status = $('.form-status', contactForm);
    const submit = $('button[type="submit"]', contactForm);
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

      clap();
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
        status.textContent = (error.message || fallbackErrorMessage).toUpperCase();
        status.className = 'form-status is-error';
      } finally {
        submit.disabled = false;
        submit.innerHTML = original;
      }
    });
  }
})();
