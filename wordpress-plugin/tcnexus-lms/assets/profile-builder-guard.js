(function () {
  'use strict';

  var form = document.querySelector('.tcn-profile-builder-form');
  var modal = document.getElementById('tcn-profile-unsaved-modal');
  if (!form || !modal) return;

  var dirty = false;
  var allowNavigation = false;
  var pendingHref = '';
  var historyArmed = false;
  var editorUrl = window.location.href;
  var discardButton = document.getElementById('tcn-profile-unsaved-discard');
  var saveButton = document.getElementById('tcn-profile-unsaved-save');
  var cancelButton = document.getElementById('tcn-profile-unsaved-cancel');

  function armHistoryGuard() {
    if (historyArmed || allowNavigation) return;
    window.history.pushState({ tcnUnsavedProfileGuard: true }, '', editorUrl);
    historyArmed = true;
  }

  function markDirty() {
    dirty = true;
    armHistoryGuard();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    pendingHref = '';
  }

  function openModal(href) {
    if (!dirty || allowNavigation) {
      window.location.href = href;
      return;
    }
    pendingHref = href || '';
    modal.classList.add('is-open');
  }

  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);

  // WordPress's visual editor types inside an iframe, so its edits do not
  // bubble through the form's input/change listeners above.
  function wireRichTextEditors() {
    if (!window.tinymce || !window.tinymce.editors) return;
    window.tinymce.editors.forEach(function (editor) {
      editor.on('change keyup undo redo', markDirty);
    });
  }

  wireRichTextEditors();
  window.setTimeout(wireRichTextEditors, 250);

  form.addEventListener('submit', function () {
    allowNavigation = true;
    dirty = false;
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || allowNavigation || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
    var href = link.href;
    if (!href || href.charAt(0) === '#' || href === window.location.href) return;
    if (!dirty) return;
    event.preventDefault();
    openModal(href);
  }, true);

  if (discardButton) {
    discardButton.addEventListener('click', function () {
      allowNavigation = true;
      dirty = false;
      var href = pendingHref;
      closeModal();
      if (href) {
        window.location.href = href;
      } else {
        window.history.back();
      }
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', function () {
      allowNavigation = true;
      dirty = false;
      closeModal();
      form.requestSubmit();
    });
  }

  if (cancelButton) cancelButton.addEventListener('click', closeModal);

  window.addEventListener('beforeunload', function (event) {
    if (!allowNavigation && dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  window.addEventListener('popstate', function () {
    if (allowNavigation || !dirty) return;
    window.history.pushState({ tcnUnsavedProfileGuard: true }, '', editorUrl);
    historyArmed = true;
    openModal('');
  });
})();
