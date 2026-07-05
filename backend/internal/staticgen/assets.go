package staticgen

import "encoding/json"

func jsonMarshal(v any) ([]byte, error) {
	return json.Marshal(v)
}

const baseMainJS = `/**
 * Lazuardi No-Code Builder — static site runtime
 */
(function () {
  'use strict';

  /* ── Tabs ─────────────────────────────────────────────── */
  document.querySelectorAll('[data-laz-tabs]').forEach(function (root) {
    const tabs = root.querySelectorAll('[role="tab"]');
    const panel = root.querySelector('[role="tabpanel"]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        const id = tab.getAttribute('data-tab-id');
        tabs.forEach(function (t) {
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
          t.classList.toggle('laz-tab-active', t === tab);
        });
        if (panel && id) {
          panel.id = 'panel-' + id;
          panel.setAttribute('aria-labelledby', 'tab-' + id);
        }
      });
    });
  });

  /* ── Dismissible alerts ───────────────────────────────── */
  document.querySelectorAll('[data-laz-dismiss]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const alert = btn.closest('[role="alert"]');
      if (alert) alert.remove();
    });
  });

  /* ── Modal close ──────────────────────────────────────── */
  document.querySelectorAll('[data-laz-modal-close]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const backdrop = btn.closest('.laz-modal-backdrop');
      if (backdrop) backdrop.remove();
    });
  });

  /* ── Mobile nav toggle ────────────────────────────────── */
  document.querySelectorAll('[data-laz-nav-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const nav = btn.closest('nav');
      const menu = nav && nav.querySelector('[data-laz-nav-menu]');
      if (menu) menu.classList.toggle('laz-hidden');
    });
  });
})();
`
