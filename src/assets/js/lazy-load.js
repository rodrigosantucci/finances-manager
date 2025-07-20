// src/assets/js/lazy-load.js

class LazyLoad extends HTMLElement {
  constructor() {
    super();
    this._hasLoaded = false;
    this._observer = null;
    console.log('[LazyLoad] Constructor called.'); // LOG
  }

  connectedCallback() {
    if (this._hasLoaded) {
      console.log('[LazyLoad] Already loaded, skipping connectedCallback.'); // LOG
      return;
    }

    this._observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this._hasLoaded) {
            console.log('[LazyLoad] Element is intersecting, loading content...'); // LOG
            this._loadContent();
            this._hasLoaded = true;
            this._observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
      }
    );

    this._observer.observe(this);
    console.log('[LazyLoad] IntersectionObserver observing:', this); // LOG
  }

  disconnectedCallback() {
    if (this._observer) {
      this._observer.disconnect();
      console.log('[LazyLoad] Observer disconnected.'); // LOG
    }
  }

  _loadContent() {
    const template = this.querySelector("template");
    if (template) {
      console.log('[LazyLoad] Template found, cloning content.'); // LOG
      const content = template.content.cloneNode(true);
      template.remove();
      this.appendChild(content);

      content.querySelectorAll("script").forEach((oldScript) => {
        const newScript = document.createElement("script");

        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        newScript.textContent = oldScript.textContent;

        oldScript.parentNode.replaceChild(newScript, oldScript);
        console.log('[LazyLoad] Script replaced and will be executed:', newScript.src || 'inline'); // LOG

        newScript.onerror = () => {
          console.error('[LazyLoad] Failed to load script:', newScript.src); // LOG
        };
      });
    } else {
      console.warn('[LazyLoad] No template found inside lazy-load element.'); // LOG
    }
  }
}

customElements.define("lazy-load", LazyLoad);
