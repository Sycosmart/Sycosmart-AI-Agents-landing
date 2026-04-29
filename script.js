/* ─────────────────────────────────────────────────────────────────────────
   Sycosmart · Agentes de IA — landing
   Vanilla JS + GSAP/ScrollTrigger + Lenis (loaded via CDN in index.html).
   Behaviours: smooth scroll, hero word-split, scroll-revealed sections,
   stat count-up, FAQ accordion (native <details>), tabs, audio-wave loop,
   topbar shadow on scroll.
   ───────────────────────────────────────────────────────────────────── */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Register GSAP plugin ───────────────────────────────────────────────
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ─── 1 · Lenis smooth scroll ────────────────────────────────────────────
  let lenis;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Keep ScrollTrigger in sync with Lenis
    if (window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  // ─── 2 · Topbar shadow when scrolled ────────────────────────────────────
  const topbar = $('.topbar');
  const onScroll = () => topbar?.classList.toggle('is-scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── 3 · Hero title — split words, reveal on load ───────────────────────
  const splitTarget = $('[data-split]');
  if (splitTarget) {
    splitWords(splitTarget);
    if (window.gsap && !reduce) {
      gsap.to(splitTarget.querySelectorAll('.word'), {
        y: 0,
        rotate: 0,
        opacity: 1,
        duration: 0.95,
        ease: 'expo.out',
        stagger: { each: 0.035, from: 'start' },
        delay: 0.15,
        onComplete: () => splitTarget.classList.add('is-revealed'),
      });
    } else {
      splitTarget.querySelectorAll('.word').forEach((w) => {
        w.style.opacity = 1;
        w.style.transform = 'none';
      });
      splitTarget.classList.add('is-revealed');
    }
  }

  // Splits text content into per-word spans, preserving inline children
  // (em, span.hl, etc.) so styling like the underline still works.
  function splitWords(node) {
    const walk = (el) => {
      const next = [];
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const tokens = child.nodeValue.split(/(\s+)/);
          tokens.forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) {
              next.push(document.createTextNode(tok));
            } else {
              const span = document.createElement('span');
              span.className = 'word';
              span.textContent = tok;
              next.push(span);
            }
          });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // Recurse into inline elements so <em>, <span class="hl"> etc.
          // get word-split too. Skip the underline SVG.
          if (child.tagName === 'SVG') {
            next.push(child);
            return;
          }
          walk(child);
          next.push(child);
        }
      });
      el.replaceChildren(...next);
    };
    walk(node);
  }

  // ─── 4 · Generic reveal-on-scroll ───────────────────────────────────────
  const reveals = $$('[data-reveal]');
  if (window.gsap && window.ScrollTrigger && !reduce) {
    reveals.forEach((el) => {
      gsap.to(el, {
        y: 0,
        opacity: 1,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      });
    });
  } else {
    reveals.forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }

  // ─── 5 · Stat count-up ─────────────────────────────────────────────────
  $$('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (!Number.isFinite(target)) return;

    const run = () => {
      if (reduce) { el.textContent = target + suffix; return; }
      const start = performance.now();
      const dur = 1400;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(target * ease(p)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (window.ScrollTrigger && !reduce) {
      ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: run });
    } else {
      run();
    }
  });

  // ─── 6 · Use-case tabs ─────────────────────────────────────────────────
  const tabs = $$('.tab');
  const panels = $$('.tab-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === id));
    });
  });

  // ─── 7 · FAQ — close siblings on open (single-open behaviour) ───────────
  const faqItems = $$('.faq__item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  // ─── 8 · Audio-wave bars — randomised heights, eased loop ──────────────
  const bars = $$('.audio-wave i');
  if (bars.length && !reduce) {
    bars.forEach((bar, i) => {
      bar.style.animation = `audioBar 0.9s ${(i * 0.04).toFixed(2)}s ease-in-out infinite alternate`;
    });
    const sheet = document.createElement('style');
    sheet.textContent = `
      @keyframes audioBar {
        0%   { height: 18%; }
        25%  { height: 70%; }
        50%  { height: 35%; }
        75%  { height: 95%; }
        100% { height: 50%; }
      }
    `;
    document.head.appendChild(sheet);
  }

  // ─── 9 · In-page anchor links go through Lenis when present ────────────
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.1 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
