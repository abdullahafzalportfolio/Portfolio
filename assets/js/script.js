/* ============================================================================
   Abdullah Afzal — Personal Brand Website
   Production JavaScript (single file, no dependencies)
   ----------------------------------------------------------------------------
   Progressive enhancement: the site is fully usable without this file.
   Every module is hook-guarded — it only runs if its markup is present, and a
   failing module never breaks the others (each init is isolated).

   TABLE OF CONTENTS
   1.  UTILITIES
   2.  PERFORMANCE HELPERS
   3.  ACCESSIBILITY HELPERS
   4.  NAVIGATION (sticky, hide/show, mobile, dropdown, smooth-scroll, scrollspy)
   5.  THEME TOGGLE
   6.  HERO (scroll indicator, typing, counters)
   7.  SCROLL ANIMATIONS (reveal + stagger fallback)
   8.  PORTFOLIO (filter, category switch, card tilt)
   9.  TESTIMONIALS (slider, autoplay, swipe, keyboard)
   10. FAQ (accordion, one-open, smooth, a11y)
   11. CONTACT FORM (validate, errors, loading, success)
   12. BUTTONS (ripple, loading)
   13. INIT
   ========================================================================== */
(() => {
  "use strict";

  /* ==========================================================================
     1. UTILITIES
     ======================================================================== */
  const select = (sel, ctx = document) => ctx.querySelector(sel);
  const selectAll = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);
  const off = (el, evt, fn, opts) => el && el.removeEventListener(evt, fn, opts);
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  /** Run a callback safely; log without crashing other modules. */
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.warn(`[script.js] ${name} failed:`, err); }
  };

  /* ==========================================================================
     2. PERFORMANCE HELPERS
     ======================================================================== */

  /** Trailing debounce — good for resize/settle events. */
  const debounce = (fn, wait = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };

  /** Time-based throttle — caps how often a handler fires. */
  const throttle = (fn, limit = 100) => {
    let last = 0, queued;
    return (...args) => {
      const now = Date.now();
      const remaining = limit - (now - last);
      if (remaining <= 0) {
        clearTimeout(queued);
        last = now;
        fn.apply(null, args);
      } else if (!queued) {
        queued = setTimeout(() => { last = Date.now(); queued = null; fn.apply(null, args); }, remaining);
      }
    };
  };

  /** rAF throttle — coalesces bursts of scroll/pointer events to one paint. */
  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { fn.apply(null, args); ticking = false; });
    };
  };

  const PASSIVE = { passive: true };

  /* ==========================================================================
     3. ACCESSIBILITY HELPERS
     ======================================================================== */
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotion = () => motionQuery.matches;

  const FOCUSABLE = [
    "a[href]", "button:not([disabled])", "input:not([disabled])",
    "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  /** Trap focus inside a container. Returns a cleanup function. */
  const trapFocus = (container) => {
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const items = selectAll(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    on(container, "keydown", onKey);
    return () => off(container, "keydown", onKey);
  };

  /* ==========================================================================
     4. NAVIGATION
     ======================================================================== */
  const initNavigation = () => {
    const header = select("[data-header]") || select(".c-header");
    if (!header) return;

    /* --- 4a. Sticky elevation + premium hide-on-scroll-down ------------- */
    header.style.transition = "transform 320ms cubic-bezier(.2,0,0,1), box-shadow 200ms";
    let lastY = window.scrollY;
    let menuOpen = false;

    const onScrollHeader = () => {
      const y = window.scrollY;
      const headerH = header.offsetHeight;

      // Elevation once scrolled past the top.
      header.style.boxShadow = y > 8 ? "0 10px 30px rgba(0,0,0,.35)" : "none";

      // Hide when scrolling down past the header; reveal on scroll up.
      if (!menuOpen && Math.abs(y - lastY) > 6) {
        if (y > lastY && y > headerH * 1.5) header.style.transform = "translateY(-100%)";
        else header.style.transform = "translateY(0)";
      }
      lastY = y;
    };
    on(window, "scroll", rafThrottle(onScrollHeader), PASSIVE);

    /* --- 4b. Mobile navigation ----------------------------------------- */
    const trigger = select("[data-menu-trigger]");
    const menu = select("#mobile-menu");
    let releaseTrap = null;

    const closeMobile = () => {
      if (!menu || menu.hidden) return;
      menu.hidden = true;
      menuOpen = false;
      if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.setAttribute("aria-label", "Open menu"); }
      document.body.style.overflow = "";
      header.style.transform = "translateY(0)";
      if (releaseTrap) { releaseTrap(); releaseTrap = null; }
      if (trigger) trigger.focus();
    };

    const openMobile = () => {
      if (!menu) return;
      menu.hidden = false;
      menuOpen = true;
      if (trigger) { trigger.setAttribute("aria-expanded", "true"); trigger.setAttribute("aria-label", "Close menu"); }
      document.body.style.overflow = "hidden";
      releaseTrap = trapFocus(menu);
      const firstLink = select("a, button", menu);
      if (firstLink) firstLink.focus();
    };

    on(trigger, "click", () => (menu && menu.hidden ? openMobile() : closeMobile()));
    // Close after choosing a destination.
    selectAll("a", menu).forEach((a) => on(a, "click", closeMobile));

    /* --- 4c. Services dropdown ----------------------------------------- */
    const dropToggle = select(".c-nav__toggle");
    const dropMenu = dropToggle && select(`#${dropToggle.getAttribute("aria-controls")}`);

    const closeDropdown = () => {
      if (!dropToggle || !dropMenu) return;
      dropMenu.hidden = true;
      dropToggle.setAttribute("aria-expanded", "false");
    };
    const toggleDropdown = () => {
      if (!dropMenu) return;
      const isOpen = dropToggle.getAttribute("aria-expanded") === "true";
      dropMenu.hidden = isOpen;
      dropToggle.setAttribute("aria-expanded", String(!isOpen));
    };
    on(dropToggle, "click", toggleDropdown);
    on(document, "click", (e) => {
      if (dropToggle && !dropToggle.parentElement.contains(e.target)) closeDropdown();
    });

    /* --- 4d. Global Escape handling ------------------------------------ */
    on(document, "keydown", (e) => {
      if (e.key !== "Escape") return;
      if (menu && !menu.hidden) closeMobile();
      closeDropdown();
    });

    /* --- 4e. Smooth scrolling for in-page anchors ---------------------- */
    const scrollToTarget = (target) => {
      const headerH = header.offsetHeight + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
      // Move focus for keyboard users without a second visual jump.
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };

    selectAll('a[href*="#"]').forEach((link) => {
      const url = link.getAttribute("href");
      const hash = url.slice(url.indexOf("#"));
      // Only hijack same-page hashes that actually resolve to an element.
      const samePage = url.startsWith("#") || url.startsWith("/#") || url.startsWith(location.pathname + "#");
      if (!samePage || hash.length < 2) return;
      const target = select(hash);
      if (!target) return;
      on(link, "click", (e) => { e.preventDefault(); scrollToTarget(target); });
    });

    /* --- 4f. Scroll spy (active section link) -------------------------- */
    const sections = selectAll("main section[id]");
    const linkFor = (id) =>
      selectAll(`a[href$="#${id}"], a[href="#${id}"]`);

    if ("IntersectionObserver" in window && sections.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            selectAll("a[aria-current='location']").forEach((a) => {
              a.removeAttribute("aria-current");
              a.style.color = "";
            });
            linkFor(entry.target.id).forEach((a) => {
              a.setAttribute("aria-current", "location");
              a.style.color = "var(--color-accent)";
            });
          });
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
      );
      sections.forEach((s) => spy.observe(s));
    }
  };

  /* ==========================================================================
     5. THEME TOGGLE
     ======================================================================== */
  const initTheme = () => {
    const toggle = select("[data-theme-toggle]");
    const root = document.documentElement;
    const KEY = "aa-theme";

    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

    const sync = () => {
      const isLight = root.getAttribute("data-theme") === "light";
      if (toggle) {
        toggle.setAttribute("aria-pressed", String(isLight));
        toggle.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
      }
    };
    sync();

    on(toggle, "click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      localStorage.setItem(KEY, next);
      sync();
    });
  };

  /* ==========================================================================
     6. HERO (scroll indicator, typing, counters)
     Hook-guarded so they activate only when the matching markup is present.
     ======================================================================== */
  const initHero = () => {
    // 6a. Scroll indicator: any [data-scroll-indicator] scrolls to next section.
    const indicator = select("[data-scroll-indicator]");
    if (indicator) {
      on(indicator, "click", () => {
        const hero = indicator.closest("section");
        const next = hero && hero.nextElementSibling;
        if (next) next.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
      });
    }

    // 6b. Typing effect: <element data-typing='["A","B"]'> cycles phrases.
    selectAll("[data-typing]").forEach((el) => {
      let words;
      try { words = JSON.parse(el.getAttribute("data-typing")); } catch { return; }
      if (!Array.isArray(words) || !words.length || reducedMotion()) { el.textContent = words ? words[0] : ""; return; }
      let w = 0, c = 0, deleting = false;
      const tick = () => {
        const word = words[w];
        el.textContent = word.slice(0, c);
        if (!deleting && c < word.length) c++;
        else if (deleting && c > 0) c--;
        else if (!deleting && c === word.length) { deleting = true; return setTimeout(tick, 1400); }
        else { deleting = false; w = (w + 1) % words.length; }
        setTimeout(tick, deleting ? 45 : 90);
      };
      tick();
    });

    // 6c. Counter animation: <element data-count='1200'> counts up when seen.
    const counters = selectAll("[data-count]");
    if (counters.length && "IntersectionObserver" in window) {
      const animateCount = (el) => {
        const end = parseFloat(el.getAttribute("data-count")) || 0;
        const dur = 1600;
        if (reducedMotion()) { el.textContent = String(end); return; }
        const start = performance.now();
        const step = (now) => {
          const p = clamp((now - start) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          el.textContent = Math.round(end * eased).toLocaleString();
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      counters.forEach((c) => io.observe(c));
    }
  };

  /* ==========================================================================
     7. SCROLL ANIMATIONS (reveal + stagger)
     The CSS already handles reveals via `animation-timeline: view()` where
     supported. This is the JS fallback for browsers without it (e.g. Safari,
     Firefox), using IntersectionObserver + inline styles (no CSS required).
     ======================================================================== */
  const initScrollAnimations = () => {
    const cssHandles =
      window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
    if (cssHandles || reducedMotion() || !("IntersectionObserver" in window)) return;

    const SELECTOR = [
      "[data-animate]",
      ".c-expertise__card", ".c-service__block", ".c-process__step",
      ".c-why__card", ".c-project-card", ".c-testimonial",
      ".c-blog-card", ".c-case-study",
    ].join(",");

    const FROM = {
      "fade-up": "translateY(24px)",
      "fade-down": "translateY(-24px)",
      "fade-left": "translateX(-28px)",
      "fade-right": "translateX(28px)",
      "scale-in": "scale(.94)",
      "blur-reveal": "translateY(16px)",
    };

    const items = selectAll(SELECTOR);
    const groups = new Map();

    items.forEach((el) => {
      const type = el.getAttribute("data-animate") || "fade-up";
      el.style.opacity = "0";
      el.style.transform = FROM[type] || FROM["fade-up"];
      if (type === "blur-reveal") el.style.filter = "blur(10px)";
      el.style.willChange = "opacity, transform";
      // Stagger by index within the shared parent.
      const parent = el.parentElement;
      const idx = groups.get(parent) || 0;
      el.dataset._delay = String(Math.min(idx * 70, 350));
      groups.set(parent, idx + 1);
    });

    const reveal = (el) => {
      const delay = el.dataset._delay || "0";
      el.style.transition =
        `opacity 620ms cubic-bezier(0,0,0,1) ${delay}ms, ` +
        `transform 620ms cubic-bezier(0,0,0,1) ${delay}ms, ` +
        `filter 620ms ease ${delay}ms`;
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.filter = "none";
      const cleanup = () => { el.style.willChange = "auto"; off(el, "transitionend", cleanup); };
      on(el, "transitionend", cleanup);
    };

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });

    items.forEach((el) => io.observe(el));
  };

  /* ==========================================================================
     8. PORTFOLIO (filter / category switch / card tilt)
     ======================================================================== */
  const initPortfolio = () => {
    /* --- 8a. Reusable filter -------------------------------------------
       Activates when a container carries [data-filter-group]; its controls
       use [data-filter] and its items use [data-category]. */
    selectAll("[data-filter-group]").forEach((group) => {
      const controls = selectAll("[data-filter]", group);
      const items = selectAll("[data-category]", group);

      const apply = (value) => {
        items.forEach((item) => {
          const cats = (item.getAttribute("data-category") || "").split(/\s+/);
          const show = value === "all" || cats.includes(value);
          item.hidden = !show;
          if (show && !reducedMotion()) {
            item.animate(
              [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }],
              { duration: 320, easing: "cubic-bezier(.2,0,0,1)" }
            );
          }
        });
      };

      controls.forEach((btn) =>
        on(btn, "click", (e) => {
          e.preventDefault();
          controls.forEach((c) => { c.classList.remove("is-active"); c.setAttribute("aria-pressed", "false"); });
          btn.classList.add("is-active");
          btn.setAttribute("aria-pressed", "true");
          apply(btn.getAttribute("data-filter"));
        })
      );
    });

    /* --- 8b. Premium card tilt (pointer, fine devices, motion-allowed) -- */
    if (reducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;

    selectAll(".c-project-card").forEach((card) => {
      let raf = null;
      const move = (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform =
            `translateY(-4px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
        });
      };
      const reset = () => {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = "";
      };
      card.style.transformStyle = "preserve-3d";
      on(card, "pointermove", move);
      on(card, "pointerleave", reset);
    });
  };

  /* ==========================================================================
     9. TESTIMONIALS (slider / autoplay / swipe / keyboard)
     Activates on a [data-carousel] container with [data-carousel-track] and
     [data-carousel-slide] children; controls use [data-carousel-prev/next].
     ======================================================================== */
  const initTestimonials = () => {
    selectAll("[data-carousel]").forEach((root) => {
      const track = select("[data-carousel-track]", root);
      const slides = selectAll("[data-carousel-slide]", root);
      if (!track || slides.length < 2) return;

      let index = 0;
      let timer = null;
      const delay = parseInt(root.getAttribute("data-carousel-interval"), 10) || 6000;

      const go = (to) => {
        index = (to + slides.length) % slides.length;
        track.style.transition = reducedMotion() ? "none" : "transform 500ms cubic-bezier(.2,0,0,1)";
        track.style.transform = `translateX(-${index * 100}%)`;
        slides.forEach((s, i) => s.setAttribute("aria-hidden", String(i !== index)));
        selectAll("[data-carousel-dot]", root).forEach((d, i) =>
          d.setAttribute("aria-current", String(i === index)));
      };
      const next = () => go(index + 1);
      const prev = () => go(index - 1);

      const play = () => { if (!timer && !reducedMotion()) timer = setInterval(next, delay); };
      const stop = () => { clearInterval(timer); timer = null; };

      on(select("[data-carousel-next]", root), "click", () => { next(); });
      on(select("[data-carousel-prev]", root), "click", () => { prev(); });
      selectAll("[data-carousel-dot]", root).forEach((dot, i) => on(dot, "click", () => go(i)));

      // Pause on hover / focus.
      on(root, "pointerenter", stop);
      on(root, "pointerleave", play);
      on(root, "focusin", stop);
      on(root, "focusout", play);

      // Keyboard.
      root.setAttribute("tabindex", "0");
      on(root, "keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); next(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      });

      // Swipe (pointer).
      let startX = null;
      on(root, "pointerdown", (e) => { startX = e.clientX; stop(); });
      on(root, "pointerup", (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        startX = null; play();
      });

      go(0);
      play();
    });
  };

  /* ==========================================================================
     10. FAQ (accordion, one-open, smooth, a11y)
     Enhances native <details>/<summary> — closes siblings and animates height.
     Falls back to native behaviour if anything is unavailable.
     ======================================================================== */
  const initFaq = () => {
    const lists = selectAll(".c-faq__list");
    if (!lists.length) return;

    lists.forEach((list) => {
      const items = selectAll(".c-faq__item", list);

      items.forEach((item) => {
        const summary = select("summary", item);
        const panel = select(".c-faq__answer", item);
        if (!summary || !panel) return;

        summary.addEventListener("click", (e) => {
          e.preventDefault();
          const isOpen = item.hasAttribute("open");

          // One open at a time: close the others in this list.
          if (!isOpen) {
            items.forEach((other) => {
              if (other !== item && other.hasAttribute("open")) closePanel(other);
            });
            openPanel(item);
          } else {
            closePanel(item);
          }
        });
      });

      const openPanel = (item) => {
        const panel = select(".c-faq__answer", item);
        item.setAttribute("open", "");
        if (reducedMotion() || typeof panel.animate !== "function") return;
        const h = panel.scrollHeight;
        panel.animate(
          [{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }],
          { duration: 300, easing: "cubic-bezier(.2,0,0,1)" }
        );
      };

      const closePanel = (item) => {
        const panel = select(".c-faq__answer", item);
        if (reducedMotion() || typeof panel.animate !== "function") { item.removeAttribute("open"); return; }
        const h = panel.scrollHeight;
        const anim = panel.animate(
          [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
          { duration: 260, easing: "cubic-bezier(.2,0,0,1)" }
        );
        // Guarantee the closed state even if the animation is throttled/interrupted
        // (backgrounded tab, reduced-motion mid-flight). removeAttribute is idempotent.
        const done = () => item.removeAttribute("open");
        anim.onfinish = done;
        anim.oncancel = done;
        setTimeout(done, 300);
      };
    });
  };

  /* ==========================================================================
     11. CONTACT FORM (validate / errors / loading / success)
     ======================================================================== */
  const initForms = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const setError = (field, message) => {
      field.setAttribute("aria-invalid", "true");
      let msg = field.parentElement.querySelector(".js-error");
      if (!msg) {
        msg = document.createElement("p");
        msg.className = "js-error";
        msg.style.cssText = "color:var(--error);font-size:var(--text-caption);margin-top:var(--space-2);";
        msg.setAttribute("aria-live", "polite");
        const id = (field.id || field.name) + "-error";
        msg.id = id;
        field.setAttribute("aria-describedby", id);
        field.parentElement.appendChild(msg);
      }
      msg.textContent = message;
    };

    const clearError = (field) => {
      field.removeAttribute("aria-invalid");
      const msg = field.parentElement.querySelector(".js-error");
      if (msg) msg.remove();
    };

    const validateField = (field) => {
      const val = field.value.trim();
      if (field.hasAttribute("required") && !val) { setError(field, "This field is required."); return false; }
      if (field.type === "email" && val && !emailRe.test(val)) { setError(field, "Please enter a valid email address."); return false; }
      clearError(field);
      return true;
    };

    const showSuccess = (form, text) => {
      const note = document.createElement("p");
      note.setAttribute("role", "status");
      note.setAttribute("aria-live", "polite");
      note.style.cssText =
        "margin-top:var(--space-4);padding:var(--space-4) var(--space-5);" +
        "color:var(--emerald-400);background:rgba(18,184,134,.12);" +
        "border:1px solid rgba(18,184,134,.3);border-radius:var(--radius-md);";
      note.textContent = text;
      form.appendChild(note);
      note.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
    };

    const handle = (form, successText) => {
      const fields = selectAll("input, textarea, select", form)
        .filter((f) => f.type !== "hidden" && f.name !== "website");

      // Clear errors as the user fixes them.
      fields.forEach((f) => on(f, "input", () => f.getAttribute("aria-invalid") === "true" && validateField(f)));

      on(form, "submit", (e) => {
        e.preventDefault();

        // Honeypot: silently drop bot submissions.
        const honeypot = form.querySelector("[name='website']");
        if (honeypot && honeypot.value) return;

        const results = fields.map(validateField);
        if (results.includes(false)) {
          const firstBad = fields.find((f) => f.getAttribute("aria-invalid") === "true");
          if (firstBad) firstBad.focus();
          return;
        }

        const btn = form.querySelector("[type='submit']");
        setButtonLoading(btn, true);

        // No backend wired yet — simulate a network round-trip, then confirm.
        setTimeout(() => {
          setButtonLoading(btn, false);
          form.reset();
          showSuccess(form, successText);
        }, 1200);
      });
    };

    const contactForm = select(".c-contact__form");
    if (contactForm) handle(contactForm, "Thanks — your message is in. I’ll reply within one business day.");

    const newsletter = select(".c-newsletter");
    if (newsletter) handle(newsletter, "You’re in. Watch your inbox.");
  };

  /* ==========================================================================
     12. BUTTONS (ripple + loading)
     ======================================================================== */
  let setButtonLoading; // hoisted for use by forms

  const initButtons = () => {
    /* --- 12a. Loading state ------------------------------------------- */
    setButtonLoading = (btn, loading) => {
      if (!btn) return;
      if (loading) {
        btn.dataset._label = btn.innerHTML;
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
        btn.innerHTML =
          '<span aria-hidden="true" style="width:1em;height:1em;border:2px solid currentColor;' +
          "border-top-color:transparent;border-radius:50%;display:inline-block;" +
          'animation:aa-spin .7s linear infinite"></span><span>Sending…</span>';
      } else {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        if (btn.dataset._label) btn.innerHTML = btn.dataset._label;
      }
    };

    // Inject the spinner keyframes once (not in the approved CSS file).
    if (!select("#aa-js-keyframes")) {
      const style = document.createElement("style");
      style.id = "aa-js-keyframes";
      style.textContent = "@keyframes aa-spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(style);
    }

    /* --- 12b. Ripple effect ------------------------------------------- */
    if (reducedMotion()) return;
    selectAll(".c-btn").forEach((btn) => {
      const cs = getComputedStyle(btn);
      if (cs.position === "static") btn.style.position = "relative";
      btn.style.overflow = "hidden";

      on(btn, "pointerdown", (e) => {
        const r = btn.getBoundingClientRect();
        const size = Math.max(r.width, r.height);
        const ripple = document.createElement("span");
        ripple.setAttribute("aria-hidden", "true");
        ripple.style.cssText =
          `position:absolute;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px;` +
          `width:${size}px;height:${size}px;border-radius:50%;pointer-events:none;` +
          "background:rgba(255,255,255,.35);transform:scale(0);";
        btn.appendChild(ripple);
        const remove = () => ripple.remove();
        ripple.animate(
          [{ transform: "scale(0)", opacity: 0.6 }, { transform: "scale(2.2)", opacity: 0 }],
          { duration: 600, easing: "cubic-bezier(0,0,0,1)" }
        ).onfinish = remove;
        setTimeout(remove, 650); // fallback so ripples never accumulate
      });
    });
  };

  /* ==========================================================================
     12b. PREMIUM EFFECTS (scroll progress + magnetic buttons)
     ======================================================================== */

  /** Thin top progress bar reflecting how far the page is scrolled. */
  const initScrollProgress = () => {
    const bar = select("[data-scroll-progress]");
    if (!bar) return;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      bar.style.setProperty("--progress", p.toFixed(4));
    };
    update();
    on(window, "scroll", rafThrottle(update), PASSIVE);
    on(window, "resize", rafThrottle(update), PASSIVE);
  };

  /** Subtle magnetic pull toward the cursor on primary CTAs (fine pointers). */
  const initMagnetic = () => {
    if (reducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const STRENGTH = 0.32;   // fraction of offset the button follows
    const RADIUS = 90;       // px beyond the button where the pull engages
    const targets = selectAll(".c-btn--primary");

    targets.forEach((btn) => {
      btn.classList.add("is-magnetic");
      let raf = 0;

      const onMove = (e) => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        if (Math.hypot(dx, dy) > Math.max(r.width, r.height) / 2 + RADIUS) return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          btn.classList.add("is-grabbing");
          btn.style.setProperty("--mx", (dx * STRENGTH).toFixed(1) + "px");
          btn.style.setProperty("--my", (dy * STRENGTH).toFixed(1) + "px");
        });
      };
      const reset = () => {
        cancelAnimationFrame(raf);
        btn.classList.remove("is-grabbing");
        btn.style.setProperty("--mx", "0px");
        btn.style.setProperty("--my", "0px");
      };

      on(btn, "pointermove", onMove);
      on(btn, "pointerleave", reset);
      on(btn, "blur", reset);
    });
  };

  /** Ambient light that follows the cursor (desktop, fine pointers). */
  const initCursorGlow = () => {
    const glow = select("[data-cursor-glow]");
    if (!glow || reducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let x = 0, y = 0;
    const paint = rafThrottle(() => {
      glow.style.setProperty("--cursor-x", x + "px");
      glow.style.setProperty("--cursor-y", y + "px");
    });
    on(window, "pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      if (!document.body.classList.contains("has-cursor-glow")) {
        document.body.classList.add("has-cursor-glow");
      }
      paint();
    }, PASSIVE);
  };

  /** Cursor-tracking spotlight inside cards (drives --mx/--my in CSS). */
  const initCardSpotlight = () => {
    if (reducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    selectAll(".c-card").forEach((card) => {
      let raf = 0;
      on(card, "pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width) * 100;
        const my = ((e.clientY - r.top) / r.height) * 100;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.setProperty("--mx", mx.toFixed(1) + "%");
          card.style.setProperty("--my", my.toFixed(1) + "%");
        });
      }, PASSIVE);
    });
  };

  /** Scroll-driven progress fill + active nodes for the process timeline(s). */
  const initProcessTimeline = () => {
    const lists = selectAll(".c-process__steps");
    if (!lists.length) return;
    lists.forEach((list) => {
      const steps = selectAll(".c-process__step", list);
      const update = () => {
        const rect = list.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const anchor = vh * 0.55;                       // fill up to ~55% viewport
        const p = clamp((anchor - rect.top) / rect.height, 0, 1);
        list.style.setProperty("--process-progress", p.toFixed(3));
        steps.forEach((s) => {
          const node = select(".c-process__number", s);
          if (!node) return;
          s.classList.toggle("is-active", node.getBoundingClientRect().top < anchor);
        });
      };
      update();
      on(window, "scroll", rafThrottle(update), PASSIVE);
      on(window, "resize", rafThrottle(update), PASSIVE);
    });
  };

  /** Add a "Live Preview" overlay button over each project screenshot. */
  const initProjectOverlays = () => {
    selectAll(".c-project-card").forEach((card) => {
      const mockup = select(".c-project-card__mockup", card);
      const cta = select(".c-project-card__body .c-btn", card);
      if (!mockup || !cta || select(".c-project-card__overlay", mockup)) return;
      const oldView = select(".c-project-card__view", mockup);
      if (oldView) oldView.remove();
      const href = cta.getAttribute("href");
      if (!href) return;
      const overlay = document.createElement("div");
      overlay.className = "c-project-card__overlay";
      const link = document.createElement("a");
      link.className = "c-btn c-btn--primary c-btn--sm c-project-card__preview";
      link.href = href;
      let rel = cta.getAttribute("rel") || "";
      const external = /^https?:\/\//i.test(href) && !href.includes(location.host);
      if (external) { link.target = "_blank"; if (!/noopener/.test(rel)) rel = (rel + " noopener").trim(); }
      if (rel) link.setAttribute("rel", rel);
      link.innerHTML = 'Live Preview <span class="c-btn__arrow" aria-hidden="true"></span>';
      link.setAttribute("aria-label", "Live preview of this project (opens the project)");
      overlay.appendChild(link);
      mockup.appendChild(overlay);
    });
  };

  /** Collapse each project's detail block behind a "Show more" toggle. */
  const initProjectMore = () => {
    selectAll(".c-project-card__body").forEach((body) => {
      const overview = select(".c-project-card__overview", body);
      const cta = select(".c-btn", body);
      if (!overview || !cta || select(".c-project-card__more", body)) return;
      const details = document.createElement("div");
      details.className = "c-project-card__details";
      details.hidden = true;
      let node = overview.nextElementSibling;
      const move = [];
      while (node && node !== cta) { move.push(node); node = node.nextElementSibling; }
      if (!move.length) return;
      move.forEach((n) => details.appendChild(n));
      overview.classList.add("is-clamped");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "c-project-card__more";
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML = 'Show more <span class="c-project-card__more-icon" aria-hidden="true"></span>';
      body.insertBefore(details, cta);
      body.insertBefore(btn, details);
      on(btn, "click", () => {
        const open = details.hidden;
        details.hidden = !open;
        overview.classList.toggle("is-clamped", !open);
        btn.setAttribute("aria-expanded", String(open));
        btn.firstChild.textContent = open ? "Show less " : "Show more ";
      });
    });
  };

  /** Show only the first 5 FAQ items, with a button to reveal the rest. */
  const initFaqMore = () => {
    const list = select(".c-faq__list");
    if (!list) return;
    const items = selectAll(".c-faq__item", list);
    const LIMIT = 5;
    if (items.length <= LIMIT || select(".c-faq__more")) return;
    const rest = items.slice(LIMIT);
    rest.forEach((it) => it.classList.add("is-faq-hidden"));
    const label = (n) => "Show all " + n + " questions ";
    const wrap = document.createElement("div");
    wrap.className = "c-faq__more-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "c-faq__more";
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = label(items.length) + '<span class="c-faq__more-icon" aria-hidden="true"></span>';
    wrap.appendChild(btn);
    list.after(wrap);
    on(btn, "click", () => {
      const expand = btn.getAttribute("aria-expanded") === "false";
      rest.forEach((it) => it.classList.toggle("is-faq-hidden", !expand));
      btn.setAttribute("aria-expanded", String(expand));
      btn.firstChild.textContent = expand ? "Show fewer questions " : label(items.length);
      if (!expand) list.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    });
  };

  /** Small "swipe" hint shown under the mobile carousels (CSS-gated). */
  const initCarouselHints = () => {
    [".c-portfolio__grid", ".c-testimonials__grid"].forEach((sel) => {
      const grid = select(sel);
      if (!grid) return;
      const next = grid.nextElementSibling;
      if (next && next.classList.contains("c-carousel-hint")) return;
      const hint = document.createElement("p");
      hint.className = "c-carousel-hint";
      hint.setAttribute("aria-hidden", "true");
      hint.textContent = "Swipe to see more →";
      grid.after(hint);
    });
  };

  /** Reveal the floating WhatsApp button once the user scrolls past the hero. */
  const initWhatsappFab = () => {
    const fab = select("[data-whatsapp-fab]");
    if (!fab) return;
    const THRESHOLD = 420;
    const update = () => {
      document.body.classList.toggle("show-fab", window.scrollY > THRESHOLD);
    };
    update();
    on(window, "scroll", rafThrottle(update), PASSIVE);
  };

  /** Register the service worker for fast repeat loads (hosted contexts only). */
  const initServiceWorker = () => {
    if (!("serviceWorker" in navigator)) return;
    // SW requires http/https — skip file:// (double-click) which can't use it.
    if (location.protocol !== "http:" && location.protocol !== "https:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {/* non-fatal */});
    }, { once: true });
  };

  /* ==========================================================================
     13. INIT
     ======================================================================== */
  const init = () => {
    // Buttons first so setButtonLoading is available to the form module.
    safe("buttons", initButtons);
    safe("navigation", initNavigation);
    safe("theme", initTheme);
    safe("hero", initHero);
    safe("scroll-animations", initScrollAnimations);
    safe("portfolio", initPortfolio);
    safe("testimonials", initTestimonials);
    safe("faq", initFaq);
    safe("forms", initForms);
    safe("scroll-progress", initScrollProgress);
    safe("magnetic", initMagnetic);
    safe("cursor-glow", initCursorGlow);
    safe("card-spotlight", initCardSpotlight);
    safe("process-timeline", initProcessTimeline);
    safe("project-overlays", initProjectOverlays);
    safe("project-more", initProjectMore);
    safe("faq-more", initFaqMore);
    safe("carousel-hints", initCarouselHints);
    safe("whatsapp-fab", initWhatsappFab);
    safe("service-worker", initServiceWorker);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
