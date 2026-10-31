/* AGOS LLC: GA4 is loaded only after an explicit, unexpired analytics opt-in. */
(() => {
  'use strict';
  if (window.AgosAnalytics) return;
  const ID = 'G-PZB0SR38P1';
  const KEY = 'agos.analytics.consent.v1';
  const VERSION = 1;
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const DISABLE = 'ga-disable-' + ID;
  const HOSTS = ['agosllc.com', 'www.agosllc.com'];
  if (!HOSTS.includes(location.hostname)) return;

  window[DISABLE] = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const denied = {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'};
  window.gtag('consent', 'default', denied);
  window.gtag('set', 'ads_data_redaction', true);
  window.gtag('set', 'url_passthrough', false);

  let record = null;
  let scriptRequested = false;
  let libraryReady = false;
  let configured = false;
  let pageViewSent = false;
  let expiryTimer = null;
  let previousFocus = null;

  function parse(raw) {
    try {
      const value = JSON.parse(raw);
      const now = Date.now();
      if (value && value.version === VERSION && value.measurementId === ID &&
          typeof value.analytics === 'boolean' && Number.isFinite(value.savedAt) &&
          Number.isFinite(value.expiresAt) && value.savedAt <= now &&
          value.expiresAt > now && value.expiresAt <= value.savedAt + MAX_AGE) return value;
    } catch (_) {}
    return null;
  }
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const value = parse(raw);
      if (raw && !value) localStorage.removeItem(KEY);
      return value;
    } catch (_) { return null; }
  }
  function allowed() { return Boolean(record && record.analytics && record.expiresAt > Date.now()); }
  function safeUrl(value) {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : '';
    } catch (_) { return ''; }
  }

  const panel = document.createElement('section');
  panel.id = 'agos-cookie-panel';
  panel.className = 'agos-cookie-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'agos-cookie-title');
  panel.setAttribute('tabindex', '-1');
  panel.hidden = true;
  panel.innerHTML = '<div class="agos-cookie-copy"><h2 id="agos-cookie-title">Your analytics choice</h2>' +
    '<p>We use optional Google Analytics cookies to understand visits and improve this site. You can accept or reject analytics and change your choice at any time. <a href="/privacy/#website-analytics">Privacy details</a>.</p>' +
    '<p class="agos-cookie-current" id="agos-cookie-current"></p></div>' +
    '<div class="agos-cookie-actions"><button type="button" data-agos-consent="accept">Accept analytics</button>' +
    '<button type="button" data-agos-consent="reject">Reject analytics</button>' +
    '<button type="button" class="agos-cookie-close" data-agos-consent="close" hidden>Close settings</button></div>';
  document.body.appendChild(panel);
  const current = panel.querySelector('#agos-cookie-current');
  const closeButton = panel.querySelector('[data-agos-consent="close"]');
  const notice = document.createElement('span');
  notice.className = 'agos-cookie-sr';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  document.body.appendChild(notice);
  document.querySelectorAll('[data-agos-cookie-settings]').forEach(button => { button.hidden = false; });

  function showSettings(focus) {
    current.textContent = record ? 'Analytics is currently ' + (allowed() ? 'on.' : 'off.') : 'Analytics is off until you accept.';
    closeButton.hidden = !record;
    panel.hidden = false;
    if (focus) {
      previousFocus = document.activeElement;
      panel.focus({preventScroll:true});
    }
  }
  function hideSettings() {
    panel.hidden = true;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({preventScroll:true});
    previousFocus = null;
  }
  function clearAnalyticsCookies() {
    // This installation uses host-only cookies with the dedicated 'agos' prefix.
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (/^agos_ga(?:_|$)/.test(name)) document.cookie = name + '=; Path=/; Max-Age=0; SameSite=Lax; Secure';
    });
  }
  function stopAnalytics() {
    window[DISABLE] = true;
    // Disable collection before updating consent, including pending tag loads.
    window.gtag('consent', 'update', denied);
    clearAnalyticsCookies();
  }
  function enableAnalytics() {
    if (!allowed() || !libraryReady) return;
    window[DISABLE] = false;
    window.gtag('consent', 'update', {...denied, analytics_storage:'granted'});
    if (!configured) {
      window.gtag('js', new Date());
      window.gtag('config', ID, {
        send_page_view:false,
        allow_google_signals:false,
        allow_ad_personalization_signals:false,
        cookie_prefix:'agos',
        cookie_domain:'none',
        cookie_expires:MAX_AGE / 1000,
        cookie_update:false,
        cookie_flags:'SameSite=Lax;Secure',
        page_location:safeUrl(location.href),
        page_referrer:safeUrl(document.referrer)
      });
      configured = true;
    }
    if (!pageViewSent) {
      window.gtag('event', 'page_view', {
        send_to:ID,
        page_title:document.title,
        page_location:safeUrl(location.href),
        page_referrer:safeUrl(document.referrer)
      });
      pageViewSent = true;
    }
  }
  function startAnalytics() {
    if (!allowed()) return;
    if (libraryReady) { enableAnalytics(); return; }
    if (scriptRequested) return;
    scriptRequested = true;
    const tag = document.createElement('script');
    tag.id = 'agos-ga4-tag';
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
    tag.onload = () => { libraryReady = true; enableAnalytics(); };
    tag.onerror = () => { scriptRequested = false; tag.remove(); };
    document.head.appendChild(tag);
  }
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    if (!record) return;
    expiryTimer = setTimeout(() => {
      if (record && record.expiresAt <= Date.now()) {
        record = null;
        try { localStorage.removeItem(KEY); } catch (_) {}
        stopAnalytics();
        showSettings(false);
      } else scheduleExpiry();
    }, Math.min(record.expiresAt - Date.now(), 2147483647));
  }
  function apply(value) {
    record = value;
    if (allowed()) startAnalytics(); else stopAnalytics();
    scheduleExpiry();
  }
  function choose(analytics) {
    const now = Date.now();
    const value = {version:VERSION, measurementId:ID, analytics, savedAt:now, expiresAt:now + MAX_AGE};
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (_) {}
    apply(value);
    hideSettings();
    notice.textContent = analytics ? 'Analytics accepted. You can change this in Cookie settings.' : 'Analytics rejected. You can still use the whole site.';
  }
  panel.querySelector('[data-agos-consent="accept"]').addEventListener('click', () => choose(true));
  panel.querySelector('[data-agos-consent="reject"]').addEventListener('click', () => choose(false));
  closeButton.addEventListener('click', hideSettings);
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && record) hideSettings();
  });
  document.addEventListener('click', event => {
    const element = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!element) return;
    if (element.closest('[data-agos-cookie-settings]')) { event.preventDefault(); showSettings(true); return; }
    if (!allowed() || !libraryReady) return;
    const link = element.closest('a[href]');
    if (!link) return;
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    if (!/^https?:$/.test(url.protocol)) return;
    let name;
    let parameters;
    if (['apps.apple.com','play.google.com'].includes(url.hostname)) {
      name = 'store_click'; parameters = {store:url.hostname === 'apps.apple.com' ? 'apple' : 'google', destination:url.origin + url.pathname};
    } else if (['teamsinigang.com','www.teamsinigang.com','agosforge.com','www.agosforge.com','everydaykeep.com','www.everydaykeep.com'].includes(url.hostname)) {
      name = 'brand_visit'; parameters = {brand:url.hostname.replace(/^www\./, '')};
    } else if (url.origin === location.origin && url.pathname.startsWith('/assets/press/') && link.hasAttribute('download')) {
      name = 'press_download'; parameters = {file_name:url.pathname.split('/').pop()};
    }
    if (name) window.gtag('event', name, {send_to:ID, ...parameters});
  });
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    apply(read());
    if (!record) showSettings(false); else panel.hidden = true;
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { apply(read()); if (!record) showSettings(false); }
  });
  window.AgosAnalytics = Object.freeze({openSettings:() => showSettings(true)});
  apply(read());
  if (!record) showSettings(false);
})();
