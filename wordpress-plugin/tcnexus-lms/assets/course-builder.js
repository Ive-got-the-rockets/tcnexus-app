(function () {
  // root is Course Builder's own wrapper — some sections below (tabs, slug
  // mirroring, the quick-create-person modal) only ever exist on that page
  // and are gated on it directly. The generic subsystems (custom selects,
  // media pickers, the lessons list) are NOT gated on root, since the
  // Global Lessons List page reuses this same script but has no
  // #tcnexus-builder wrapper of its own.
  var root = document.getElementById('tcnexus-builder');

  document.querySelectorAll('.tcn-save-confirmation').forEach(function (notice) {
    window.setTimeout(function () {
      notice.classList.add('is-dismissing');
      window.setTimeout(function () { notice.remove(); }, 220);
    }, 3000);
  });

  function openOrganizedMediaLibrary(picker, onSelect) {
    var modal = document.createElement('div');
    modal.className = 'tcn-organized-media-modal';
    modal.innerHTML = '<div class="tcn-organized-media-modal__panel" role="dialog" aria-modal="true" aria-label="Media Library"><button type="button" class="tcn-organized-media-modal__close" aria-label="Close">×</button><div class="tcn-organized-media-modal__body"><aside class="tcn-organized-media-modal__folders"></aside><main><h2>Media Library</h2><div class="tcn-organized-media-modal__grid"></div></main></div></div>';
    document.body.appendChild(modal);
    var foldersEl = modal.querySelector('.tcn-organized-media-modal__folders');
    var gridEl = modal.querySelector('.tcn-organized-media-modal__grid');
    var close = function () { modal.remove(); };
    modal.querySelector('.tcn-organized-media-modal__close').addEventListener('click', close);
    function load(folder) {
      var body = new URLSearchParams({ action: 'tcnexus_media_library_items', nonce: window.tcnexusMedia.mediaLibraryNonce, folder: folder || 'unsorted' });
      gridEl.innerHTML = '<p>Loading media…</p>';
      fetch(window.tcnexusMedia.ajaxUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }).then(function (response) { return response.json(); }).then(function (result) {
        if (!result.success) { gridEl.innerHTML = '<p>Unable to load media.</p>'; return; }
        foldersEl.innerHTML = result.data.folders.map(function (item) { return '<button type="button" class="tcn-organized-media-modal__folder ' + (item.key === result.data.selected ? 'is-active' : '') + '" data-folder="' + item.key + '">▰ ' + item.label + '</button>'; }).join('');
        foldersEl.querySelectorAll('[data-folder]').forEach(function (button) { button.addEventListener('click', function () { load(button.dataset.folder); }); });
        gridEl.innerHTML = result.data.items.length ? result.data.items.map(function (item) { return '<button type="button" class="tcn-organized-media-modal__item" data-id="' + item.id + '"><img src="' + (item.url || '') + '" alt=""><strong>' + item.title + '</strong><small>' + item.type + '</small></button>'; }).join('') : '<p>This folder is empty.</p>';
        gridEl.querySelectorAll('[data-id]').forEach(function (button, index) { button.addEventListener('click', function () { onSelect({ id: result.data.items[index].id, url: result.data.items[index].url }); close(); }); });
      }).catch(function () { gridEl.innerHTML = '<p>Unable to load media.</p>'; });
    }
    load('unsorted');
  }

  // ---------- Tabs ----------

  if (root) {
    var tabs = root.querySelectorAll('.tcn-tab');
    var panels = root.querySelectorAll('.tcn-panel');
    var levelTabs = root.querySelectorAll('.tcn-level-tab');
    var levelPanels = root.querySelectorAll('.tcn-level-panel');
    var levelIncludes = root.querySelectorAll('.tcn-level-include');
    var activeLevelInput = document.getElementById('tcnexus-active-level');
    var activeLanguageInput = document.getElementById('tcnexus-active-language');
    var activeTabInput = document.getElementById('tcnexus-active-tab');
    var currentLevel = activeLevelInput ? activeLevelInput.value : 'beginner';
    var headerTitle = document.getElementById('course_title');
    var headerSlug = document.getElementById('course_slug');
    var levelLabels = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
    var languageCodes = { en: 'eng', es: 'spa', pt: 'por', fr: 'fra', de: 'deu', other: 'oth' };
    var filterLessonRows = null;

    var languageAddButton = document.getElementById('tcnexus-add-course-language');
    var languageModal = document.getElementById('tcn-course-language-modal');
    var languageCancel = document.getElementById('tcn-course-language-cancel');
    var languageContinue = document.getElementById('tcn-course-language-continue');
    var languageSelect = document.getElementById('tcn-course-language-select');
    var newLanguageInput = document.getElementById('tcnexus-new-language');
    var newSeasonInput = document.getElementById('tcnexus-new-show-season');
    var addSeasonButton = document.getElementById('tcnexus-add-show-season');
    var removeLanguageInput = document.getElementById('tcnexus-remove-language');
    var languageRemoveModal = document.getElementById('tcn-course-language-remove-modal');
    var languageRemoveCancel = document.getElementById('tcn-course-language-remove-cancel');
    var languageRemoveConfirm = document.getElementById('tcn-course-language-remove-confirm');
    var languageRemoveMessage = document.getElementById('tcn-course-language-remove-message');
    var pendingLanguage = '';
    var newCourseInput = document.getElementById('tcnexus-new-course');
    var courseForm = root.closest('form');
    var builderModeInput = courseForm ? courseForm.querySelector('input[name="builder_mode"]') : null;
    var isShowBuilder = !!(builderModeInput && builderModeInput.value === 'show');
    var isNewCourse = root.dataset.newCourse === '1';

    if (addSeasonButton && newSeasonInput && courseForm) {
      addSeasonButton.addEventListener('click', function () {
        newSeasonInput.value = '1';
        courseForm.requestSubmit();
      });
    }

    function closeLanguageModal() {
      if (languageModal) languageModal.classList.remove('is-open');
    }

    function closeLanguageRemoveModal() {
      if (languageRemoveModal) languageRemoveModal.classList.remove('is-open');
      pendingLanguage = '';
    }

    if (languageAddButton && languageModal) {
      languageAddButton.addEventListener('click', function () {
        languageModal.classList.add('is-open');
      });
    }
    if (isNewCourse && languageModal) {
      languageModal.classList.add('is-open');
    }
    if (languageCancel) languageCancel.addEventListener('click', closeLanguageModal);
    if (languageModal) {
      languageModal.addEventListener('click', function (event) {
        if (event.target === languageModal) closeLanguageModal();
      });
    }
    if (languageRemoveCancel) languageRemoveCancel.addEventListener('click', closeLanguageRemoveModal);
    if (languageRemoveModal) {
      languageRemoveModal.addEventListener('click', function (event) {
        if (event.target === languageRemoveModal) closeLanguageRemoveModal();
      });
    }
    if (languageRemoveConfirm) {
      languageRemoveConfirm.addEventListener('click', function () {
        if (!pendingLanguage || !removeLanguageInput || !courseForm) return;
        removeLanguageInput.value = pendingLanguage;
        closeLanguageRemoveModal();
        courseForm.requestSubmit();
      });
    }
    if (languageContinue && languageSelect && courseForm) {
      languageContinue.addEventListener('click', function () {
        if (!languageSelect.value) return;
        if (isNewCourse && languageSelect.value === 'en') {
          closeLanguageModal();
          return;
        }
        if (newLanguageInput) newLanguageInput.value = languageSelect.value;
        courseForm.requestSubmit();
      });
    }
    root.querySelectorAll('.tcn-course-language-tab__remove:not(.is-disabled)').forEach(function (removeButton) {
      removeButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var tab = removeButton.closest('[data-language]');
        var languageLink = removeButton.closest('a[href]');
        var language = languageLink ? new URL(languageLink.href, window.location.href).searchParams.get('language') : '';
        if (language && languageRemoveModal) {
          pendingLanguage = language;
          if (languageRemoveMessage) {
            var languageName = tab ? (tab.querySelector('span') ? tab.querySelector('span').textContent.trim() : '') : '';
            var contentUnit = isShowBuilder ? 'Episodes' : 'lessons';
            languageRemoveMessage.textContent = 'Everything under ' + (languageName || 'this language') + ' will be deleted, including its levels and ' + contentUnit + '.';
          }
          languageRemoveModal.classList.add('is-open');
        }
      });
    });

    function stripLevelSuffix(value) {
      return String(value || '').replace(/\s-\s(?:Intermediate|Advanced)$/i, '');
    }

    function stripSlugSuffix(value) {
      return String(value || '').replace(/-(?:intermediate|advanced)$/i, '');
    }

    function stripLanguagePrefix(value) {
      return String(value || '').replace(/^(?:eng|spa|por|fra|deu|oth)-/i, '');
    }

    function syncHeaderToLevel(level) {
      var titleInput = root.querySelector('[data-level-title="' + level + '"]');
      var slugInput = root.querySelector('[data-level-slug="' + level + '"]');
      if (titleInput && headerTitle && headerTitle.value) {
        titleInput.value = headerTitle.value;
      }
      if (slugInput && headerSlug && headerSlug.value) {
        slugInput.value = headerSlug.value;
      }
    }

    function prepareLevelFields(level) {
      var beginnerTitle = root.querySelector('[data-level-title="beginner"]');
      var beginnerSlug = root.querySelector('[data-level-slug="beginner"]');
      var titleInput = root.querySelector('[data-level-title="' + level + '"]');
      var slugInput = root.querySelector('[data-level-slug="' + level + '"]');
      var baseTitle = stripLevelSuffix(beginnerTitle && beginnerTitle.value ? beginnerTitle.value : headerTitle && headerTitle.value);
      var baseSlug = stripLanguagePrefix(stripSlugSuffix(beginnerSlug && beginnerSlug.value ? beginnerSlug.value : headerSlug && headerSlug.value));
      var languageCode = languageCodes[activeLanguageInput && activeLanguageInput.value ? activeLanguageInput.value : 'en'] || 'oth';

      if (isShowBuilder) {
        if (headerTitle && titleInput) headerTitle.value = titleInput.value;
        if (headerSlug && slugInput) headerSlug.value = slugInput.value;
        return;
      }

      if (titleInput && level !== 'beginner' && (!titleInput.value || titleInput.dataset.generated === '1')) {
        titleInput.value = baseTitle ? baseTitle + ' - ' + levelLabels[level] : '';
        titleInput.dataset.generated = '1';
      }
      if (slugInput && level !== 'beginner' && (!slugInput.value || slugInput.dataset.generated === '1')) {
        slugInput.value = baseSlug ? languageCode + '-' + baseSlug + '-' + level : '';
        slugInput.dataset.generated = '1';
      }
      if (headerTitle && titleInput) headerTitle.value = titleInput.value;
      if (headerSlug && slugInput) headerSlug.value = slugInput.value;
    }

    function activateLevel(level) {
      syncHeaderToLevel(currentLevel);
      currentLevel = level;
      if (activeLevelInput) activeLevelInput.value = level;
      prepareLevelFields(level);
      levelTabs.forEach(function (levelTab) {
        var selected = levelTab.getAttribute('data-level') === level;
        levelTab.classList.toggle('is-active', selected);
        levelTab.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      levelPanels.forEach(function (levelPanel) {
        var selected = levelPanel.getAttribute('data-level-panel') === level;
        levelPanel.classList.toggle('is-active', selected);
        levelPanel.hidden = !selected;
      });
      levelIncludes.forEach(function (levelInclude) {
        levelInclude.hidden = levelInclude.getAttribute('data-level-include') !== level;
      });
      tabs.forEach(function (tab) {
        tab.setAttribute('aria-controls', 'tcn-panel-' + level + '-' + tab.getAttribute('data-tab'));
      });
      if (filterLessonRows) filterLessonRows(level);
    }

    function updateLevelDot(level, enabled) {
      var tab = root.querySelector('.tcn-level-tab[data-level="' + level + '"]');
      if (!tab) return;
      var dot = tab.querySelector('.tcn-level-tab__dot');
      if (enabled && !dot) {
        dot = document.createElement('span');
        dot.className = 'tcn-level-tab__dot';
        dot.setAttribute('aria-label', 'Active level');
        tab.appendChild(dot);
      } else if (!enabled && dot) {
        dot.remove();
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
        panels.forEach(function (p) { p.classList.remove('is-active'); });

        tab.setAttribute('aria-selected', 'true');
        var panel = root.querySelector('#' + tab.getAttribute('aria-controls'));
        if (panel) {
          panel.classList.add('is-active');
        }
        if (activeTabInput) activeTabInput.value = tab.getAttribute('data-tab');
        window.location.hash = tab.getAttribute('data-tab');
      });
    });

    levelTabs.forEach(function (levelTab) {
      levelTab.addEventListener('click', function () {
        activateLevel(levelTab.getAttribute('data-level') || 'beginner');
      });
    });

    levelIncludes.forEach(function (levelInclude) {
      var input = levelInclude.querySelector('input[type="checkbox"]');
      if (input) {
        input.addEventListener('change', function () {
          updateLevelDot(levelInclude.getAttribute('data-level-include'), input.checked);
        });
      }
    });

    if (headerTitle) {
      headerTitle.addEventListener('input', function () {
        var titleInput = root.querySelector('[data-level-title="' + currentLevel + '"]');
        if (titleInput) {
          titleInput.value = headerTitle.value;
          titleInput.dataset.generated = '0';
        }
      });
    }

    if (headerSlug) {
      headerSlug.addEventListener('input', function () {
        var slugInput = root.querySelector('[data-level-slug="' + currentLevel + '"]');
        if (slugInput) {
          slugInput.value = headerSlug.value;
          slugInput.dataset.generated = '0';
        }
      });
    }

    root.querySelectorAll('[data-level-title]').forEach(function (titleInput) {
      titleInput.addEventListener('input', function () {
        titleInput.dataset.generated = '0';
        if (titleInput.getAttribute('data-level-title') === currentLevel && headerTitle) {
          headerTitle.value = titleInput.value;
        }
      });
    });

    activateLevel(currentLevel);

    var initialTab = window.location.hash ? window.location.hash.slice(1) : null;
    if (initialTab) {
      var match = root.querySelector('.tcn-tab[data-tab="' + initialTab + '"]');
      if (match) {
        match.click();
      }
    }
  }

  // ---------- Save Course: "Pending Save" once anything changes ----------
  // This is a real (non-AJAX) form submit, so a successful save reloads the
  // page — which already resets the label back to "Save Course" on its own,
  // no explicit reset needed. Listening on the whole form (not just the
  // header fields) means edits anywhere in the Lessons table count too,
  // since it all submits together (see the Lessons card's own comment).
  if (root) {
      var saveCourseBtn = document.getElementById('tcnexus-save-course');
      var courseForm = root.closest('form');
      if (saveCourseBtn && courseForm) {
        var courseFormDirty = root.dataset.newCourse === '1';
      var newCourseDeleteUrl = root.dataset.newCourseDeleteUrl || '';
      var allowCourseNavigation = false;
      var pendingCourseHref = '';
       var unsavedModal = document.getElementById('tcn-unsaved-modal');
       var unsavedModalTitle = document.getElementById('tcn-unsaved-modal-title');
       var unsavedModalMessage = document.getElementById('tcn-unsaved-modal-message');
       var unsavedDiscardBtn = document.getElementById('tcn-unsaved-modal-discard');
       var unsavedSaveBtn = document.getElementById('tcn-unsaved-modal-save');
       var courseTypeCloseBtn = document.getElementById('tcn-unsaved-modal-course-type-close');
       var courseEditorUrl = window.location.href;
      var historyGuardArmed = false;
       var pendingBackNavigation = false;

       var courseTypeIsSet = function () {
         if (isShowBuilder) return true;
         return root.querySelectorAll('input[name="levels[beginner][course_types][]"]:checked').length > 0;
       };

       var mustSetCourseType = function () {
         return !isShowBuilder && !courseTypeIsSet();
       };

      var armHistoryGuard = function () {
        if (historyGuardArmed || allowCourseNavigation) {
          return;
        }
        window.history.pushState({ tcnUnsavedCourseGuard: true }, '', courseEditorUrl);
        historyGuardArmed = true;
      };

      var markCourseFormDirty = function () {
        if (courseFormDirty) {
          return;
        }
        courseFormDirty = true;
        saveCourseBtn.textContent = 'Pending Save';
        saveCourseBtn.classList.add('is-pending');
        armHistoryGuard();
      };

       var closeUnsavedModal = function () {
        if (unsavedModal) {
          unsavedModal.classList.remove('is-open');
        }
        pendingCourseHref = '';
         pendingBackNavigation = false;
         if (unsavedDiscardBtn) unsavedDiscardBtn.hidden = false;
         if (unsavedSaveBtn) unsavedSaveBtn.hidden = false;
         if (courseTypeCloseBtn) courseTypeCloseBtn.hidden = true;
         if (unsavedModalTitle) unsavedModalTitle.textContent = 'You are leaving without saving changes';
         if (unsavedModalMessage) unsavedModalMessage.textContent = 'The course you started has unsaved changes. Would you like to save it before leaving?';
       };

       var showCourseTypeWarning = function () {
         if (unsavedModalTitle) unsavedModalTitle.textContent = 'Course type required';
         if (unsavedModalMessage) unsavedModalMessage.textContent = 'You must set a course type before leaving the Course Builder.';
         if (unsavedDiscardBtn) unsavedDiscardBtn.hidden = true;
         if (unsavedSaveBtn) unsavedSaveBtn.hidden = true;
         if (courseTypeCloseBtn) courseTypeCloseBtn.hidden = false;
         if (unsavedModal) unsavedModal.classList.add('is-open');
       };

       var openUnsavedModal = function (href) {
         if (mustSetCourseType()) {
           showCourseTypeWarning();
           return;
         }
         if (!courseFormDirty || allowCourseNavigation) {
          window.location.href = href;
          return;
        }
        pendingBackNavigation = false;
        pendingCourseHref = href;
        if (unsavedModal) {
          unsavedModal.classList.add('is-open');
        }
      };

      var discardCourseChanges = function () {
        allowCourseNavigation = true;
        if (newCourseDeleteUrl) {
          closeUnsavedModal();
          window.location.href = newCourseDeleteUrl;
          return;
        }
        var href = pendingCourseHref;
        var shouldGoBack = pendingBackNavigation;
        pendingBackNavigation = false;
        closeUnsavedModal();
        if (shouldGoBack) {
          window.history.go(-2);
        } else if (href) {
          window.location.href = href;
        } else {
          window.location.reload();
        }
      };

      var saveCourseChanges = function () {
        allowCourseNavigation = true;
        pendingBackNavigation = false;
        closeUnsavedModal();
        if (newCourseInput) newCourseInput.value = '0';
        courseForm.requestSubmit();
      };

      courseForm.addEventListener('input', markCourseFormDirty);
      courseForm.addEventListener('change', markCourseFormDirty);
       courseForm.addEventListener('submit', function (event) {
         if (!validateTimelineRows()) {
           event.preventDefault();
           return;
         }
         if (mustSetCourseType()) {
           event.preventDefault();
           showCourseTypeWarning();
           return;
         }
         allowCourseNavigation = true;
       });

      if (saveCourseBtn && newCourseInput) {
        saveCourseBtn.addEventListener('click', function () {
          newCourseInput.value = '0';
        });
      }

      if (unsavedDiscardBtn) {
        unsavedDiscardBtn.addEventListener('click', discardCourseChanges);
      }
       if (unsavedSaveBtn) {
         unsavedSaveBtn.addEventListener('click', saveCourseChanges);
       }
       if (courseTypeCloseBtn) {
         courseTypeCloseBtn.addEventListener('click', closeUnsavedModal);
       }
      if (unsavedModal) {
        unsavedModal.addEventListener('click', function (event) {
          if (event.target === unsavedModal) {
            closeUnsavedModal();
          }
        });
      }

      document.addEventListener('click', function (event) {
         if (allowCourseNavigation || ((!courseFormDirty && !mustSetCourseType())) || !event.target) {
          return;
        }
        // Tabs, language controls, and other controls inside the builder are
        // not exits from the builder page and must never open this modal.
        if (root.contains(event.target)) {
          return;
        }
        var link = event.target.closest ? event.target.closest('a[href]') : null;
        if (!link || link.target === '_blank' || link.hasAttribute('download')) {
          return;
        }
        var href = link.href;
        if (!href || href === window.location.href || href.indexOf('#') === href.length - 1) {
          return;
        }
        if (root.contains(link) ||
          (window.TCNexusNavigationGuard &&
            window.TCNexusNavigationGuard.isInternalBuilderNavigation(href, window.location.href))) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        openUnsavedModal(href);
      }, true);

      window.addEventListener('beforeunload', function (event) {
         if (!allowCourseNavigation && (courseFormDirty || mustSetCourseType())) {
          event.preventDefault();
          event.returnValue = '';
        }
      });

      window.addEventListener('popstate', function () {
         if (allowCourseNavigation || (!courseFormDirty && !mustSetCourseType())) {
          return;
        }

        // Restore the editor entry immediately, then let the custom modal
        // decide whether the original Back action should continue.
        window.history.pushState({ tcnUnsavedCourseGuard: true }, '', courseEditorUrl);
        historyGuardArmed = true;
         pendingBackNavigation = true;
         if (unsavedModal) {
           if (mustSetCourseType()) {
             showCourseTypeWarning();
           } else {
             unsavedModal.classList.add('is-open');
           }
         }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && unsavedModal && unsavedModal.classList.contains('is-open')) {
          closeUnsavedModal();
        }
      });

       if (courseFormDirty || mustSetCourseType()) {
         saveCourseBtn.textContent = 'Pending Save';
        saveCourseBtn.classList.add('is-pending');
        armHistoryGuard();
      }
    }

    // ---------- Save Course: sticky button ----------
    // CSS position:sticky's "room to stick" is bounded by the element's own
    // immediate parent (.tcn-header__actions), which is only as tall as the
    // status toggle + button themselves — nowhere near enough height for
    // the button to visibly stay put while the rest of the (much longer)
    // page scrolls underneath it. Simulated instead with position:fixed
    // once it reaches the top, plus a same-size placeholder left behind so
    // the header doesn't collapse when the button leaves the flow.
    if (saveCourseBtn) {
      var saveBtnPlaceholder = document.createElement('div');
      saveBtnPlaceholder.className = 'tcn-header__save-btn-placeholder';
      saveBtnPlaceholder.style.display = 'none';
      saveCourseBtn.parentNode.insertBefore(saveBtnPlaceholder, saveCourseBtn);

      var saveBtnStuck = false;

      function saveBtnStickyTop() {
        return window.matchMedia('(max-width: 782px)').matches ? 46 : 32;
      }

      function releaseSaveBtn() {
        saveCourseBtn.style.position = '';
        saveCourseBtn.style.top = '';
        saveCourseBtn.style.left = '';
        saveCourseBtn.style.width = '';
        saveCourseBtn.classList.remove('is-stuck');
        saveBtnPlaceholder.style.display = 'none';
        saveBtnStuck = false;
      }

      function updateSaveBtnSticky() {
        var topOffset = saveBtnStickyTop();

        if (!saveBtnStuck) {
          var rect = saveCourseBtn.getBoundingClientRect();
          if (rect.top <= topOffset) {
            saveBtnPlaceholder.style.width = rect.width + 'px';
            saveBtnPlaceholder.style.height = rect.height + 'px';
            saveBtnPlaceholder.style.display = 'block';
            saveCourseBtn.style.position = 'fixed';
            saveCourseBtn.style.top = topOffset + 'px';
            saveCourseBtn.style.left = rect.left + 'px';
            saveCourseBtn.style.width = rect.width + 'px';
            saveCourseBtn.classList.add('is-stuck');
            saveBtnStuck = true;
          }
        } else if (saveBtnPlaceholder.getBoundingClientRect().top > topOffset) {
          // Scrolled back up far enough that the button's real slot in the
          // flow is below the sticky line again — no longer needs forcing.
          releaseSaveBtn();
        }
      }

      window.addEventListener('scroll', updateSaveBtnSticky, { passive: true });
      window.addEventListener('resize', function () {
        // Full reset (not an incremental resize) since a resize can change
        // the button's natural left/width — easiest to just remeasure from
        // a clean slate rather than patch stale pixel values.
        releaseSaveBtn();
        updateSaveBtnSticky();
      });
      updateSaveBtnSticky();
    }
  }

  // ---------- Custom selects ----------
  // Native <select> popups are rendered by the OS/browser, not the page, so
  // no amount of CSS reliably restyles the open list (Chromium on Windows
  // ignores option background-color for it). This replaces the visual list
  // with our own markup while keeping the real <select> for form submission
  // — hidden via display:none, which still submits its value with the form.

  function enhanceSelect(select) {
    // Multi-select fields need the browser's native interaction so users can
    // select several Characters with Ctrl/Cmd-click or Shift-click.
    if (select.multiple) {
      return;
    }
    if (select.dataset.tcnEnhanced) {
      return;
    }
    select.dataset.tcnEnhanced = '1';

    var wrap = document.createElement('div');
    wrap.className = 'tcn-select-wrap';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tcn-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    wrap.appendChild(trigger);

    var list = document.createElement('div');
    list.className = 'tcn-select-list';
    list.setAttribute('role', 'listbox');
    wrap.appendChild(list);

    function updateTrigger() {
      var selected = select.options[select.selectedIndex];
      trigger.textContent = selected ? selected.textContent : '';
      list.querySelectorAll('.tcn-select-option').forEach(function (item) {
        item.classList.toggle('is-selected', item.getAttribute('data-value') === select.value);
      });
    }

    function closeList() {
      list.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function renderOptions() {
      list.innerHTML = '';
      Array.prototype.forEach.call(select.options, function (opt) {
        // The real <option>'s disabled state (e.g. an order number an
        // already-saved lesson has taken — see updateLessonOrderAvailability)
        // means it's off the list entirely, not just grayed out, since this
        // custom list is what the user actually sees/clicks, not the hidden
        // native <select>.
        if (opt.disabled) {
          return;
        }
        var item = document.createElement('div');
        item.className = 'tcn-select-option';
        item.setAttribute('role', 'option');
        item.setAttribute('data-value', opt.value);
        item.textContent = opt.textContent;
        item.addEventListener('click', function () {
          select.value = opt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          updateTrigger();
          closeList();
        });
        list.appendChild(item);
      });
    }

    trigger.addEventListener('click', function () {
      var isOpen = list.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', function (event) {
      if (!wrap.contains(event.target)) {
        closeList();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeList();
      }
    });

    renderOptions();
    updateTrigger();

    // Exposed so code outside this closure (e.g. the quick-create-person
    // modal) can add a new <option> to the real select and have the custom
    // dropdown pick it up without re-running enhanceSelect from scratch.
    select._tcnRefresh = function () {
      renderOptions();
      updateTrigger();
    };
  }

  // document-wide, not root-scoped — the Lessons card (and its Order
  // selects) sits outside #tcnexus-builder as its own sibling section.
  document.querySelectorAll('.tcn-select').forEach(enhanceSelect);

  // Show characters: use the styled single-select dropdown to add reusable
  // character profiles into a submitted list beneath it.
  document.querySelectorAll('[data-character-picker="1"]').forEach(function (select) {
    var field = select.closest('.tcn-field');
    var list = field ? field.querySelector('.tcn-character-list__items') : null;
    if (!list) return;

    function refreshDropdown() {
      if (select._tcnRefresh) select._tcnRefresh();
    }

    list.querySelectorAll('.tcn-character-list__item').forEach(function (item) {
      var option = select.querySelector('option[value="' + item.getAttribute('data-character-id') + '"]');
      if (option) option.disabled = true;
    });
    refreshDropdown();

    function addCharacter() {
      var id = select.value;
      var option = select.options[select.selectedIndex];
      if (!id || !option || list.querySelector('[data-character-id="' + id + '"]')) return;

      var item = document.createElement('div');
      item.className = 'tcn-character-list__item';
      item.setAttribute('data-character-id', id);
      item.innerHTML = '<span></span><input type="hidden" /><button type="button" class="tcn-character-list__remove" aria-label="Remove character">×</button>';
      item.querySelector('span').textContent = option.textContent;
      item.querySelector('input').name = select.getAttribute('data-character-input-name');
      item.querySelector('input').value = id;
      item.querySelector('button').setAttribute('aria-label', 'Remove ' + option.textContent);
      option.disabled = true;
      item.querySelector('button').addEventListener('click', function () {
        option.disabled = false;
        item.remove();
        refreshDropdown();
      });
      list.appendChild(item);

      select.value = '';
      refreshDropdown();
    }

    select.addEventListener('change', addCharacter);
    list.querySelectorAll('.tcn-character-list__remove').forEach(function (button) {
      button.addEventListener('click', function () {
        var item = button.closest('.tcn-character-list__item');
        var option = item && select.querySelector('option[value="' + item.getAttribute('data-character-id') + '"]');
        if (option) option.disabled = false;
        if (item) item.remove();
        refreshDropdown();
      });
    });
  });

  // Course instructors use the same avatar/name list interaction as lesson guests.
  document.querySelectorAll('[data-instructor-picker="1"]').forEach(function (select) {
    var field = select.closest('.tcn-course-instructors');
    var list = field ? field.querySelector('.tcn-course-instructor-list') : null;
    if (!list) return;
    function refreshDropdown() { if (select._tcnRefresh) select._tcnRefresh(); }
    function addInstructor() {
      var id = select.value;
      var option = select.options[select.selectedIndex];
      if (!id || !option || list.querySelector('[data-instructor-id="' + id + '"]')) return;
      var item = document.createElement('div');
      item.className = 'tcn-lesson-guest';
      item.setAttribute('data-instructor-id', id);
      item.innerHTML = '<span class="tcn-lesson-guest__avatar-wrap"></span><span class="tcn-lesson-guest__name"></span><input type="hidden" name="' + select.getAttribute('data-person-input-name') + '" value="' + id + '" /><button type="button" class="tcn-lesson-guest__remove" aria-label="Remove instructor">×</button>';
      item.querySelector('.tcn-lesson-guest__name').textContent = option.textContent;
      if (option.getAttribute('data-photo')) {
        var avatar = document.createElement('img');
        avatar.className = 'tcn-lesson-guest__avatar';
        avatar.src = option.getAttribute('data-photo');
        avatar.alt = '';
        item.querySelector('.tcn-lesson-guest__avatar-wrap').appendChild(avatar);
      }
      list.appendChild(item); select.value = ''; refreshDropdown();
    }
    refreshDropdown();
    select.addEventListener('change', addInstructor);
    list.querySelectorAll('.tcn-lesson-guest__remove').forEach(function (button) {
      button.addEventListener('click', function () {
        var item = button.closest('.tcn-character-list__item');
        item = item || button.closest('.tcn-lesson-guest');
        if (item) item.remove(); refreshDropdown();
      });
    });
  });

  // ---------- Generic media pickers ----------
  // Each .tcn-media-picker declares its own target ids via data attributes
  // so one function can drive every image field on the page — including
  // ones added dynamically later, like a new lesson row's image picker.
  // Pickers with data-crop-width/height route the selected image through
  // the cropper (see TCNexusCropper below) before it's ever set as the
  // field's value.
  //
  // wp.Uploader (rather than the wp.media library-browser modal) drives
  // "Select Image" — its `browser` option opens the OS file dialog directly
  // on click, and `dropzone` makes the whole picker a native drag-and-drop
  // upload target. Both paths post straight to WordPress's own async
  // uploader, so no extra server-side endpoint is needed here.

  function wireMediaPicker(picker) {
    if (!picker || picker.dataset.tcnWired) {
      return;
    }
    picker.dataset.tcnWired = '1';

    var addBtn = picker.querySelector('.tcn-media-add');
    var menu = picker.querySelector('.tcn-media-picker__menu');
    var libraryBtn = picker.querySelector('.tcn-media-library');
    var fileBtn = picker.querySelector('.tcn-media-file');
    var removeBtn = picker.querySelector('.tcn-media-remove');
    var input = document.getElementById(picker.getAttribute('data-input-id'));
    var preview = picker.querySelector('.tcn-media-picker__preview');
    var cropWidth = parseInt(picker.getAttribute('data-crop-width'), 10) || 0;
    var cropHeight = parseInt(picker.getAttribute('data-crop-height'), 10) || 0;

    if (!addBtn || !menu || !libraryBtn || !fileBtn || !input || !preview || !window.wp) {
      return;
    }

    function renderPreview(url) {
      if (url) {
        preview.innerHTML = '<img src="' + url + '" alt="" />';
        return;
      }
      var empty = '';
      if (cropWidth && cropHeight) {
        if (picker.dataset.device) {
          empty += '<strong class="tcn-media-picker__device">' + picker.dataset.device + '</strong><br />';
        }
        empty += 'No image selected';
        empty += '<br />Recommended size: ' + cropWidth + ' × ' + cropHeight + 'px';
      } else {
        empty = 'No image selected';
      }
      empty += '<br />Drop image here';
      preview.innerHTML = '<span class="tcn-media-picker__empty">' + empty + '</span>';
    }

    function showUploadError(message) {
      preview.innerHTML = '<span class="tcn-media-picker__empty tcn-media-picker__empty--error">' + message + '</span>';
    }

    function showUploadProgress(percent) {
      var pct = Math.max(0, Math.min(100, Math.round(percent)));
      preview.innerHTML =
        '<div class="tcn-media-picker__progress-wrap">' +
          '<div class="tcn-media-picker__progress"><div class="tcn-media-picker__progress-bar" style="width:' + pct + '%"></div></div>' +
          '<span class="tcn-media-picker__progress-label">Uploading… ' + pct + '%</span>' +
        '</div>';
    }

    function useAttachment(attachment) {
      input.value = attachment.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      renderPreview(attachment.url);
    }

    // wp.Uploader's success callback passes a Backbone attachment model,
    // not the plain object useAttachment()/the cropper expect — toJSON()
    // normalizes it to the same shape the old wp.media selection gave us.
    function toPlainAttachment(attachment) {
      return attachment && typeof attachment.toJSON === 'function' ? attachment.toJSON() : attachment;
    }

    function handleAttachment(attachment) {
      var data = toPlainAttachment(attachment);
      if (!data || !data.id || !data.url) {
        showUploadError('Could not load this image.');
        return;
      }
      if (cropWidth && cropHeight && window.TCNexusCropper) {
        window.TCNexusCropper.open(data, cropWidth, cropHeight, useAttachment);
      } else {
        useAttachment(data);
      }
    }

    var uploader = null;
    if (wp.Uploader) {
      uploader = new wp.Uploader({
        container: picker,
        browser: fileBtn,
        dropzone: picker,
        success: handleAttachment,
        error: function (message) {
          showUploadError(typeof message === 'string' ? message : 'Could not upload this image.');
        }
      });
    }

    addBtn.addEventListener('click', function (event) {
      event.preventDefault();
      var isOpen = !menu.hidden;
      menu.hidden = isOpen;
      addBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });

    libraryBtn.addEventListener('click', function (event) {
      event.preventDefault();
      menu.hidden = true;
      addBtn.setAttribute('aria-expanded', 'false');
      if (!window.tcnexusMedia || !tcnexusMedia.ajaxUrl || !tcnexusMedia.mediaLibraryNonce) {
        showUploadError('The Media Library is unavailable.');
        return;
      }
      openOrganizedMediaLibrary(picker, handleAttachment);
    });

    fileBtn.addEventListener('click', function () {
      menu.hidden = true;
      addBtn.setAttribute('aria-expanded', 'false');
    });

    // wp.Uploader wraps a raw Plupload instance at .uploader — its own
    // success/error callbacks above only fire once the whole upload has
    // finished, with nothing shown while it's still in flight, so the
    // progress bar hooks the lower-level Plupload events directly instead.
    if (uploader && uploader.uploader && typeof uploader.uploader.bind === 'function') {
      uploader.uploader.bind('FilesAdded', function () {
        showUploadProgress(0);
      });
      uploader.uploader.bind('UploadProgress', function (up, file) {
        showUploadProgress(file.percent);
      });
    }

    ['dragenter', 'dragover'].forEach(function (eventName) {
      picker.addEventListener(eventName, function () {
        picker.classList.add('is-drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (eventName) {
      picker.addEventListener(eventName, function () {
        picker.classList.remove('is-drag-over');
      });
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', function (event) {
        event.preventDefault();
        input.value = '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
        renderPreview(null);
      });
    }
  }

  document.querySelectorAll('.tcn-media-picker').forEach(wireMediaPicker);

  // ---------- Quick-create person (Instructor/Guest "+" button) ----------
  // Lets the People tab create a new Instructors & Guests profile without
  // leaving the course — the "+" button records which <select> to update via
  // data-target-select, this posts straight to a small ajax endpoint, and
  // the new person is appended + selected in that dropdown on success.

  var quickPersonModal = document.getElementById('tcn-quick-person-modal');
  if (quickPersonModal) {
    var quickNameInput = document.getElementById('tcn-quick-person-name');
    var quickBioInput = document.getElementById('tcn-quick-person-bio');
    var quickPhotoInput = document.getElementById('tcn-media-quick_person_photo');
    var quickPhotoPreview = quickPersonModal.querySelector('.tcn-media-picker__preview');
    var quickErrorEl = document.getElementById('tcn-quick-person-error');
    var quickCreateBtn = document.getElementById('tcn-quick-person-create');
    var quickCancelBtn = document.getElementById('tcn-quick-person-cancel');
    var quickTitleEl = document.getElementById('tcn-quick-person-title');
    var quickTargetSelect = null;
    var quickRole = 'instructor';

    function resetQuickPersonModal() {
      quickNameInput.value = '';
      quickBioInput.value = '';
      if (quickPhotoInput) {
        quickPhotoInput.value = '';
      }
      if (quickPhotoPreview) {
        quickPhotoPreview.innerHTML = '<span class="tcn-media-picker__empty">No image selected</span>';
      }
      quickErrorEl.style.display = 'none';
    }

    function closeQuickPersonModal() {
      quickPersonModal.classList.remove('is-open');
    }

    root.querySelectorAll('.tcn-add-person').forEach(function (button) {
      button.addEventListener('click', function () {
        quickTargetSelect = root.querySelector('select[name="' + button.getAttribute('data-target-select') + '"]');
        quickRole = button.getAttribute('data-role') || 'instructor';
        quickTitleEl.textContent = quickRole === 'character'
          ? 'Add Character'
          : (quickRole === 'guest' ? 'Add Guest' : 'Add Instructor');
        resetQuickPersonModal();
        quickPersonModal.classList.add('is-open');
        quickNameInput.focus();
      });
    });

    quickCancelBtn.addEventListener('click', closeQuickPersonModal);
    quickPersonModal.addEventListener('click', function (event) {
      if (event.target === quickPersonModal) {
        closeQuickPersonModal();
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && quickPersonModal.classList.contains('is-open')) {
        closeQuickPersonModal();
      }
    });

    quickCreateBtn.addEventListener('click', function () {
      var name = quickNameInput.value.trim();
      if (!name) {
        quickErrorEl.textContent = 'Name is required.';
        quickErrorEl.style.display = 'block';
        return;
      }
      if (!window.tcnexusMedia || !quickTargetSelect) {
        quickErrorEl.textContent = 'Could not determine which field to update.';
        quickErrorEl.style.display = 'block';
        return;
      }

      quickCreateBtn.disabled = true;
      quickCreateBtn.textContent = 'Creating…';
      quickErrorEl.style.display = 'none';

      var body = new URLSearchParams({
        action: 'tcnexus_quick_create_person',
        nonce: window.tcnexusMedia.quickCreateNonce,
        name: name,
        bio: quickBioInput.value,
        photo_id: quickPhotoInput ? quickPhotoInput.value : '',
        role: quickRole
      });

      fetch(window.tcnexusMedia.ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
        .then(function (response) { return response.json(); })
        .then(function (json) {
          quickCreateBtn.disabled = false;
          quickCreateBtn.textContent = 'Create';
          if (json && json.success) {
            var option = document.createElement('option');
            option.value = json.data.id;
            option.textContent = json.data.title;
            quickTargetSelect.appendChild(option);
            quickTargetSelect.value = json.data.id;
            if (quickTargetSelect._tcnRefresh) {
              quickTargetSelect._tcnRefresh();
            }
            quickTargetSelect.dispatchEvent(new Event('change', { bubbles: true }));
            closeQuickPersonModal();
          } else {
            quickErrorEl.textContent = (json && json.data && json.data.message) || 'Could not create this person.';
            quickErrorEl.style.display = 'block';
          }
        })
        .catch(function () {
          quickCreateBtn.disabled = false;
          quickCreateBtn.textContent = 'Create';
          quickErrorEl.textContent = 'Could not reach the server.';
          quickErrorEl.style.display = 'block';
        });
    });
  }

  // ---------- Lessons table ----------
  // Each lesson is a pair of <tr>s: a summary row (Lesson No./Title/Level/
  // Duration/Views) and, directly after it, an expand row holding the same
  // editor (image + fields) the Lessons tab used to show inline. Clicking
  // the summary row toggles both open/closed; a handful of its fields are
  // mirrored back onto the summary row live so it never goes stale.

    var lessonsList = document.getElementById('tcnexus-lessons-list');
  if (lessonsList) {
    var newRowIndex = 0;
    var template = document.getElementById('tcnexus-lesson-row-template');
    filterLessonRows = function (level) {
      lessonsList.querySelectorAll('[data-lesson-level]').forEach(function (row) {
        row.hidden = row.getAttribute('data-lesson-level') !== level;
      });
    };

    function wireLessonRow(summaryRow, expandRow) {
      var titleInput = expandRow.querySelector('.tcn-lesson-card__title input');
      var titleSpan = summaryRow.querySelector('.tcn-lesson-row__title span');
      if (titleInput && titleSpan) {
        titleInput.addEventListener('input', function () {
          titleSpan.textContent = titleInput.value.trim() || 'Untitled lesson';
        });
      }

      var orderSelect = expandRow.querySelector('.tcn-lesson-card__order select');
      var orderCell = summaryRow.querySelector('.tcn-lessons-overview__order');
      if (orderSelect && orderCell) {
        orderSelect.addEventListener('change', function () {
          orderCell.textContent = ('0' + orderSelect.value).slice(-2);
        });
      }

      var durationInput = expandRow.querySelector('.tcn-duration-input');
      var durationCell = summaryRow.querySelector('.tcn-lessons-overview__duration');
      if (durationInput && durationCell) {
        durationInput.addEventListener('input', function () {
          durationCell.textContent = durationInput.value.trim() || '—';
        });
      }

      var tierRadios = expandRow.querySelectorAll('.tcn-lesson-card__row--meta input[type="radio"]');
      var levelChip = summaryRow.querySelector('.tcn-level-chip');
      if (levelChip) {
        tierRadios.forEach(function (radio) {
          radio.addEventListener('change', function () {
            if (radio.checked) {
              levelChip.textContent = radio.value === 'paid' ? 'Paid' : 'Free';
              levelChip.className = 'tcn-level-chip tcn-level-chip--' + radio.value;
            }
          });
        });
      }

      // .tcn-lesson-expand__panel needs overflow:hidden for its max-height
      // open/close animation, but that same overflow:hidden clips the Order
      // field's dropdown list once it's open — so overflow only switches to
      // visible once the open transition has actually finished (a row that
      // starts pre-opened, e.g. a freshly added lesson, never fires a
      // transition at all, so it's settled immediately instead), and switches
      // back to hidden the instant a close starts so the collapse still clips.
      var panel = expandRow.querySelector('.tcn-lesson-expand__panel');
      if (panel) {
        if (expandRow.classList.contains('is-open')) {
          panel.style.maxHeight = 'none';
          panel.classList.add('tcn-lesson-expand__panel--settled');
        }
        panel.addEventListener('transitionend', function (event) {
          if (event.propertyName === 'max-height' && expandRow.classList.contains('is-open')) {
            panel.style.maxHeight = 'none';
            panel.classList.add('tcn-lesson-expand__panel--settled');
          }
        });
      }
    }

    // Whatever order number an already-saved lesson has taken comes off the
    // dropdown list entirely for every other lesson — a brand-new, not-yet-
    // saved row's own current number doesn't reserve anything, since it
    // isn't real until it's actually saved.
    function updateLessonOrderAvailability() {
      // A lesson flagged for deletion (hidden, but still in the DOM so its
      // checkbox submits with the form — see the remove-row handler below)
      // is excluded here: it's going away on Save, so its order number
      // should free up for the remaining lessons right away.
      var orderSelects = Array.prototype.slice.call(lessonsList.querySelectorAll('.tcn-lesson-card__order select')).filter(function (select) {
        var level = select.closest('[data-lesson-level]');
        if (level && level.getAttribute('data-lesson-level') !== currentLevel) {
          return false;
        }
        var expandRow = select.closest('.tcn-lesson-expand');
        var flag = expandRow ? expandRow.querySelector('.tcn-lesson-delete-flag') : null;
        return !flag || !flag.checked;
      });
      var savedValues = orderSelects
        .filter(function (select) { return select.name.indexOf('[existing]') !== -1; })
        .map(function (select) { return select.value; });

      orderSelects.forEach(function (select) {
        var ownValue = select.value;
        Array.prototype.forEach.call(select.options, function (opt) {
          opt.disabled = opt.value !== ownValue && savedValues.indexOf(opt.value) !== -1;
        });
        if (select._tcnRefresh) {
          select._tcnRefresh();
        }
      });
    }

    // Lowest order number not currently held by any lesson on the page
    // (saved or not) — used to give a freshly added row a sensible default
    // instead of always starting everyone at 01.
    function nextAvailableOrderValue() {
      var usedValues = Array.prototype.slice
        .call(lessonsList.querySelectorAll('[data-lesson-level="' + currentLevel + '"] .tcn-lesson-card__order select'))
        .map(function (select) { return select.value; });
      var n = 1;
      while (usedValues.indexOf(String(n)) !== -1) {
        n++;
      }
      return String(n);
    }

    // Wire up the rows the server already rendered.
    Array.prototype.forEach.call(lessonsList.querySelectorAll('.tcn-lesson-row'), function (summaryRow) {
      var expandRow = summaryRow.nextElementSibling;
      if (expandRow && expandRow.classList.contains('tcn-lesson-expand')) {
        wireLessonRow(summaryRow, expandRow);
      }
    });
    updateLessonOrderAvailability();

    function addLessonRow() {
      var emptyRow = document.getElementById('tcnexus-lessons-empty');
      if (emptyRow) {
        emptyRow.remove();
      }

      var html = template.innerHTML
        .replace(/__LEVEL__/g, currentLevel)
        .replace(/__INDEX__/g, String(newRowIndex++));
      var wrapper = document.createElement('tbody');
      wrapper.innerHTML = html;
      var summaryRow = wrapper.querySelector('.tcn-lesson-row');
      var expandRow = wrapper.querySelector('.tcn-lesson-expand');
      lessonsList.appendChild(summaryRow);
      lessonsList.appendChild(expandRow);

      // The template always renders order=1 selected — reassign it to the
      // next free number before wiring so a second (third, ...) new lesson
      // doesn't default onto a number a saved lesson already owns.
      var orderSelect = expandRow.querySelector('.tcn-lesson-card__order select');
      if (orderSelect) {
        orderSelect.value = nextAvailableOrderValue();
      }

      wireLessonRow(summaryRow, expandRow);
      expandRow.querySelectorAll('.tcn-add-lesson-btn').forEach(function (btn) {
        btn.addEventListener('click', addLessonRow);
      });
      if (orderSelect) {
        orderSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      expandRow.querySelectorAll('.tcn-media-picker').forEach(wireMediaPicker);
      expandRow.querySelectorAll('.tcn-select').forEach(enhanceSelect);
      updateLessonOrderAvailability();
      filterLessonRows(currentLevel);
    }

    // Both the header's "+ Add Lesson" and the matching one in the table's
    // bottom footer trigger the same addLessonRow().
    var addLessonBtns = document.querySelectorAll('.tcn-add-lesson-btn');
    if (addLessonBtns.length && template) {
      addLessonBtns.forEach(function (btn) {
        btn.addEventListener('click', addLessonRow);
      });

      // "Save Lesson & Add New" (see class-tcnexus-course-builder.php)
      // redirects back here with this data attribute set, so the blank row
      // for the next lesson is already waiting after the reload. Only the
      // per-course Lessons card supports adding new lessons at all — the
      // Global Lessons List only edits/deletes existing ones — so root
      // (Course Builder's own wrapper) is guaranteed present here.
    if (root && root.getAttribute('data-add-lesson-row') === '1') {
        addLessonRow();
      }
    }

    filterLessonRows(currentLevel);

    function refreshLessonPanelHeight(element) {
      var panel = element.closest('.tcn-lesson-expand__panel');
      var expandRow = panel ? panel.closest('.tcn-lesson-expand') : null;
      if (panel && expandRow && expandRow.classList.contains('is-open')) {
        requestAnimationFrame(function () {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        });
      }
    }

    function nextTimelineIndex(timeline) {
      var next = Number(timeline.dataset.nextTimelineIndex || 0);
      timeline.querySelectorAll('[data-tc-lens-event] [name]').forEach(function (control) {
        var match = control.name.match(/\[tc_lens_timeline\]\[(\d+)\]/);
        if (match) {
          next = Math.max(next, Number(match[1]) + 1);
        }
      });
      timeline.dataset.nextTimelineIndex = String(next + 1);
      return next;
    }

    function addTimelineEvent(timeline) {
      var events = timeline.querySelector('[data-tc-lens-events]');
      var templateEvent = timeline.querySelector('[data-tc-lens-event-template]');
      if (!events || !templateEvent) {
        return;
      }

      var index = nextTimelineIndex(timeline);
      var eventRow = templateEvent.cloneNode(true);
      eventRow.hidden = false;
      eventRow.removeAttribute('data-tc-lens-event-template');
      eventRow.classList.remove('tcn-tc-lens-event--template');
      eventRow.querySelectorAll('[disabled]').forEach(function (control) {
        control.removeAttribute('disabled');
      });
      eventRow.querySelectorAll('[name]').forEach(function (control) {
        control.name = control.name.replace(/__TIMELINE_INDEX__/g, String(index));
      });
      var idInput = eventRow.querySelector('input[type="hidden"]');
      if (idInput) {
        idInput.value = 'event-new-' + Date.now() + '-' + index;
      }
      events.appendChild(eventRow);
      eventRow.querySelectorAll('.tcn-select').forEach(enhanceSelect);
      syncTimelinePayload(eventRow);
      refreshLessonPanelHeight(timeline);
      if (typeof markCourseFormDirty === 'function') markCourseFormDirty();
    }

    function syncTimelinePayload(row) {
      if (!row) return;
      var type = row.querySelector('select[name$="[messageType]"]');
      var payload = row.querySelector('[data-tc-lens-payload]');
      if (!type || !payload) return;
      payload.querySelectorAll('[data-tc-lens-payload-panel]').forEach(function (panel) {
        var active = panel.getAttribute('data-tc-lens-payload-panel') === type.value;
        panel.hidden = !active;
        panel.querySelectorAll('input, textarea, select').forEach(function (control) {
          if (!control.disabled || control.closest('[data-tc-lens-event-template]')) {
            control.setAttribute('aria-hidden', active ? 'false' : 'true');
          }
        });
      });
    }

    function parseTimelineTime(value) {
      var trimmed = String(value || '').trim();
      var match = trimmed.match(/^(\d+):(\d{1,2})$/);
      if (!match || Number(match[2]) > 59) return null;
      return Number(match[1]) * 60 + Number(match[2]);
    }

    function validateTimelineRows() {
      var firstInvalid = null;
      lessonsList.querySelectorAll('[data-tc-lens-timeline]').forEach(function (timeline) {
        var error = timeline.querySelector('.tcn-tc-lens-timeline__error');
        var timelineError = '';
        if (error) error.textContent = '';
        timeline.querySelectorAll('[data-tc-lens-event]:not([data-tc-lens-event-template])').forEach(function (row) {
          var start = row.querySelector('input[name$="[startTime]"]');
          var end = row.querySelector('input[name$="[endTime]"]');
          if (!start || !end) return;
          var startSeconds = parseTimelineTime(start.value);
          var endSeconds = String(end.value || '').trim() === '' ? null : parseTimelineTime(end.value);
          var invalid = null === startSeconds ? 'Enter a valid start time as mm:ss.' : (null !== endSeconds && endSeconds < startSeconds ? 'End time must be after the start time.' : (String(end.value || '').trim() !== '' && null === endSeconds ? 'Enter a valid end time as mm:ss.' : ''));
          start.removeAttribute('aria-invalid');
          end.removeAttribute('aria-invalid');
          if (invalid) {
            if (!firstInvalid) firstInvalid = start;
            if (null === startSeconds) start.setAttribute('aria-invalid', 'true');
            if (String(end.value || '').trim() !== '' && (null === endSeconds || endSeconds < startSeconds)) end.setAttribute('aria-invalid', 'true');
            timelineError = invalid;
          }
        });
        if (error && timelineError) error.textContent = timelineError;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return false;
      }
      return true;
    }

    lessonsList.addEventListener('click', function (event) {
      var timelineAdd = event.target.closest('.tcn-tc-lens-add');
      if (timelineAdd) {
        var timeline = timelineAdd.closest('[data-tc-lens-timeline]');
        if (timeline) addTimelineEvent(timeline);
        return;
      }
      var timelineRemove = event.target.closest('.tcn-tc-lens-event__remove');
      if (timelineRemove) {
        event.preventDefault();
        event.stopPropagation();
        var timelineEvent = timelineRemove.closest('[data-tc-lens-event]');
        var timeline = timelineRemove.closest('[data-tc-lens-timeline]');
        if (timelineEvent) {
          timelineEvent.remove();
          if (timeline) refreshLessonPanelHeight(timeline);
          if (typeof markCourseFormDirty === 'function') markCourseFormDirty();
        }
        return;
      }
      if (event.target.classList.contains('tcn-lesson-guest__remove')) {
        var guestItem = event.target.closest('.tcn-lesson-guest');
        if (guestItem) {
          guestItem.remove();
          if (typeof markCourseFormDirty === 'function') markCourseFormDirty();
        }
        return;
      }
      if (event.target.classList.contains('tcn-remove-row')) {
        var expandRow = event.target.closest('.tcn-lesson-expand');
        var summaryRow = expandRow ? expandRow.previousElementSibling : null;
        var flag = expandRow ? expandRow.querySelector('.tcn-lesson-delete-flag') : null;
        if (flag) {
          // An already-saved lesson — mark it for deletion and hide both
          // its rows; the checkbox still submits with the form so Save
          // actually trashes it. A brand-new, unsaved row has no flag and
          // nothing to submit, so it's just removed outright.
          flag.checked = true;
          flag.dispatchEvent(new Event('change', { bubbles: true }));
          if (summaryRow) {
            summaryRow.style.display = 'none';
          }
          expandRow.style.display = 'none';
        } else {
          if (summaryRow) {
            summaryRow.remove();
          }
          if (expandRow) {
            expandRow.remove();
          }
        }
        updateLessonOrderAvailability();
        return;
      }

      var row = event.target.closest('.tcn-lesson-row');
      if (!row) {
        return;
      }
      var expand = row.nextElementSibling;
      if (!expand || !expand.classList.contains('tcn-lesson-expand')) {
        return;
      }
      var willOpen = !row.classList.contains('is-open');
      row.classList.toggle('is-open', willOpen);
      expand.classList.toggle('is-open', willOpen);
      var panel = expand.querySelector('.tcn-lesson-expand__panel');
      if (panel) {
        if (willOpen) {
          panel.classList.remove('tcn-lesson-expand__panel--settled');
          panel.style.maxHeight = '0px';
          requestAnimationFrame(function () {
            panel.style.maxHeight = panel.scrollHeight + 'px';
          });
        } else {
          panel.classList.remove('tcn-lesson-expand__panel--settled');
          panel.style.maxHeight = panel.scrollHeight + 'px';
          requestAnimationFrame(function () {
            panel.style.maxHeight = '0px';
          });
        }
      }
      if (!willOpen && panel) {
        panel.addEventListener('transitionend', function resetClosedHeight(event) {
          if (event.propertyName === 'max-height' && !expand.classList.contains('is-open')) {
            panel.style.maxHeight = '0px';
            panel.removeEventListener('transitionend', resetClosedHeight);
          }
        });
      }
      if (!willOpen && !panel) {
        var closingPanel = expand.querySelector('.tcn-lesson-expand__panel');
        if (closingPanel) {
          closingPanel.classList.remove('tcn-lesson-expand__panel--settled');
        }
      }
    });

    lessonsList.addEventListener('change', function (event) {
      var type = event.target.closest('select[name$="[messageType]"]');
      if (!type) return;
      syncTimelinePayload(type.closest('[data-tc-lens-event]'));
      refreshLessonPanelHeight(type.closest('[data-tc-lens-timeline]'));
    });

    lessonsList.querySelectorAll('[data-tc-lens-event]:not([data-tc-lens-event-template])').forEach(syncTimelinePayload);

    lessonsList.addEventListener('change', function (event) {
      if (event.target.matches('.tcn-lesson-guest-picker')) {
        var picker = event.target;
        var personId = picker.value;
        var personKind = picker.getAttribute('data-person-kind') || 'guest';
        var personGroup = picker.closest('.tcn-lesson-card__guests');
        var personList = personGroup ? personGroup.querySelector('.tcn-lesson-guest-list') : null;
        if (personId && personList && !personList.querySelector('[data-guest-id="' + personId + '"]')) {
          var option = picker.options[picker.selectedIndex];
          var item = document.createElement('div');
          item.className = 'tcn-lesson-guest';
          item.setAttribute('data-guest-id', personId);
          item.innerHTML = '<span class="tcn-lesson-guest__avatar-wrap"></span>' +
            '<span class="tcn-lesson-guest__name"></span>' +
            '<input type="hidden" name="' + picker.getAttribute('data-person-input-name') + '" value="' + personId + '" />' +
            '<button type="button" class="tcn-lesson-guest__remove" aria-label="Remove ' + (personKind === 'character' ? 'character' : 'guest') + '">×</button>';
          item.querySelector('.tcn-lesson-guest__name').textContent = option ? option.textContent : (personKind === 'character' ? 'Character' : 'Guest');
          if (option && option.getAttribute('data-photo')) {
            var avatar = document.createElement('img');
            avatar.className = 'tcn-lesson-guest__avatar';
            avatar.src = option.getAttribute('data-photo');
            avatar.alt = '';
            item.querySelector('.tcn-lesson-guest__avatar-wrap').appendChild(avatar);
          }
          personList.appendChild(item);
          if (typeof markCourseFormDirty === 'function') markCourseFormDirty();
        }
        picker.value = '';
        if (picker._tcnRefresh) picker._tcnRefresh();
      }
      if (event.target.matches('input[name*="[video_source]"]')) {
        var card = event.target.closest('.tcn-lesson-card');
        var videoInput = card.querySelector('.tcn-video-id-input');
        if (videoInput) {
          videoInput.placeholder = event.target.value === 'youtube' ? 'YouTube Video ID' : 'Vimeo Video ID';
        }
      }
      if (event.target.matches('.tcn-lesson-card__order select')) {
        updateLessonOrderAvailability();
      }
    });
  }

  // ---------- Slug: mirror title until the user edits slug directly ----------

  var titleInput = document.getElementById('course_title');
  var slugInput = document.getElementById('course_slug');
  if (titleInput && slugInput) {
    var slugTouched = slugInput.value.trim() !== '';
    slugInput.addEventListener('input', function () { slugTouched = true; });
    titleInput.addEventListener('input', function () {
      if (slugTouched) {
        return;
      }
      slugInput.value = titleInput.value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    });
  }

  // Exposed so other admin pages sharing this script (the Global Lessons
  // List) can reuse the same custom-select and image-upload wiring instead
  // of duplicating it.
  window.TCNexusBuilder = {
    enhanceSelect: enhanceSelect,
    wireMediaPicker: wireMediaPicker
  };
})();

(function () {
  var switcher = document.querySelector('.tcn-course-view-switcher');
  if (!switcher) {
    return;
  }

  var buttons = switcher.querySelectorAll('[data-course-view]');
  var panels = document.querySelectorAll('[data-course-view-panel]');
  var storageKey = 'tcnexus-course-list-view';
  var savedView = 'detail';
  try {
    savedView = localStorage.getItem(storageKey) || 'detail';
  } catch (error) {
    savedView = 'detail';
  }

  function activateView(view) {
    if (['compact', 'detail', 'card'].indexOf(view) === -1) {
      view = 'card';
    }
    buttons.forEach(function (button) {
      var active = button.getAttribute('data-course-view') === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-course-view-panel') !== view;
    });
    try {
      localStorage.setItem(storageKey, view);
    } catch (error) {
      // The view still works when browser storage is unavailable.
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      activateView(button.getAttribute('data-course-view'));
    });
  });
  activateView(savedView);
})();

(function () {
  // Each course card owns its own details panel. Expanding one card must not
  // change the state of any neighboring card in the list.
  document.querySelectorAll('.tcn-course-card__toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var card = toggle.closest('.tcn-course-card');
      var detailsId = toggle.getAttribute('aria-controls');
      var details = detailsId ? document.getElementById(detailsId) : null;
      if (!card || !details) {
        return;
      }

      card.classList.toggle('is-expanded');
      var expanded = card.classList.contains('is-expanded');
      details.hidden = !expanded;
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.setAttribute('aria-label', expanded ? 'Hide language details' : 'Show language details');
      toggle.setAttribute('title', expanded ? 'Hide language details' : 'Show language details');
    });
  });
})();

(function () {
  // Runs on the course list screen, which has no #tcnexus-builder wrapper,
  // so this is a separate IIFE from the one above rather than nested inside
  // its early-return guard.
  var modal = document.getElementById('tcn-delete-modal');
  if (!modal) {
    return;
  }

  var message = document.getElementById('tcn-delete-modal-message');
  var confirmLink = document.getElementById('tcn-delete-modal-confirm');
  var cancelBtn = document.getElementById('tcn-delete-modal-cancel');

  function openModal(deleteUrl, courseTitle) {
    message.textContent = 'Are you sure you want to delete "' + courseTitle + '"? This will move it to the trash.';
    confirmLink.setAttribute('href', deleteUrl);
    modal.classList.add('is-open');
  }

  function closeModal() {
    modal.classList.remove('is-open');
  }

  document.querySelectorAll('.tcn-course-card__delete').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      openModal(button.getAttribute('data-delete-url'), button.getAttribute('data-course-title'));
    });
  });

  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (event) {
    if (event.target === modal) {
      closeModal();
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });
})();

// ---------- Image cropper ----------
// Built on top of the same public wp_crop_image() core function WordPress's
// own Site Icon/Custom Header cropper uses, but with our own DOM/JS for the
// crop-selection UI, since driving WP's built-in Backbone cropper views from
// outside the Customizer requires internals that aren't meant to be reused.
// Exposed on window since media pickers on any admin page (Course Builder,
// Instructor Builder) share this one module.
window.TCNexusCropper = (function () {
  var STAGE_SIZE = 440;

  var modal = null;
  var stage = null;
  var img = null;
  var frameEl = null;
  var zoomInput = null;
  var errorEl = null;
  var applyBtn = null;
  var cancelBtn = null;

  var state = null;

  function ensureModal() {
    if (modal) {
      return;
    }

    modal = document.createElement('div');
    modal.className = 'tcn-modal-backdrop';
    modal.id = 'tcn-cropper-modal';
    modal.innerHTML =
      '<div class="tcn-modal tcn-cropper-modal">' +
      '<h2>Adjust Image</h2>' +
      '<p>Drag to reposition, use the slider to zoom. The highlighted area is what will be used.</p>' +
      '<div class="tcn-cropper-stage">' +
      '<img class="tcn-cropper-image" alt="" />' +
      '<div class="tcn-cropper-frame"></div>' +
      '</div>' +
      '<input type="range" class="tcn-cropper-zoom" min="0" max="100" value="0" />' +
      '<p class="tcn-cropper-error" style="display:none;"></p>' +
      '<div class="tcn-modal__actions">' +
      '<button type="button" class="tcn-btn-ghost" id="tcn-cropper-cancel">Cancel</button>' +
      '<button type="button" class="tcn-save-btn" id="tcn-cropper-apply">Apply Crop</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(modal);

    stage = modal.querySelector('.tcn-cropper-stage');
    img = modal.querySelector('.tcn-cropper-image');
    frameEl = modal.querySelector('.tcn-cropper-frame');
    zoomInput = modal.querySelector('.tcn-cropper-zoom');
    errorEl = modal.querySelector('.tcn-cropper-error');
    applyBtn = modal.querySelector('#tcn-cropper-apply');
    cancelBtn = modal.querySelector('#tcn-cropper-cancel');

    zoomInput.addEventListener('input', function () {
      applyZoom(parseFloat(zoomInput.value));
    });

    frameEl.addEventListener('mousedown', function (event) {
      event.preventDefault();
      var startX = event.clientX;
      var startY = event.clientY;
      var startLeft = state.frame.left;
      var startTop = state.frame.top;

      function onMove(moveEvent) {
        var left = clamp(startLeft + (moveEvent.clientX - startX), 0, state.displayW - state.frame.width);
        var top = clamp(startTop + (moveEvent.clientY - startY), 0, state.displayH - state.frame.height);
        state.frame.left = left;
        state.frame.top = top;
        paintFrame();
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    cancelBtn.addEventListener('click', close);
    modal.addEventListener('click', function (event) {
      if (event.target === modal) {
        close();
      }
    });
    applyBtn.addEventListener('click', applyCrop);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function paintFrame() {
    frameEl.style.left = state.frame.left + 'px';
    frameEl.style.top = state.frame.top + 'px';
    frameEl.style.width = state.frame.width + 'px';
    frameEl.style.height = state.frame.height + 'px';
  }

  function applyZoom(zoomValue) {
    // 0 = zoomed out (frame covers as much of the image as the target ratio
    // allows), 100 = zoomed in (frame is 30% of that size).
    var scaleFactor = 1 - (zoomValue / 100) * 0.7;
    var centerX = state.frame.left + state.frame.width / 2;
    var centerY = state.frame.top + state.frame.height / 2;

    var width = state.maxFrameW * scaleFactor;
    var height = state.maxFrameH * scaleFactor;

    state.frame.width = width;
    state.frame.height = height;
    state.frame.left = clamp(centerX - width / 2, 0, state.displayW - width);
    state.frame.top = clamp(centerY - height / 2, 0, state.displayH - height);

    paintFrame();
  }

  function layout() {
    var naturalW = state.naturalWidth;
    var naturalH = state.naturalHeight;
    var fitScale = Math.min(STAGE_SIZE / naturalW, STAGE_SIZE / naturalH, 1);

    state.displayW = Math.round(naturalW * fitScale);
    state.displayH = Math.round(naturalH * fitScale);
    state.scale = state.displayW / naturalW;

    stage.style.width = state.displayW + 'px';
    stage.style.height = state.displayH + 'px';

    var ratio = state.cropWidth / state.cropHeight;
    if (state.displayW / state.displayH > ratio) {
      state.maxFrameH = state.displayH;
      state.maxFrameW = state.maxFrameH * ratio;
    } else {
      state.maxFrameW = state.displayW;
      state.maxFrameH = state.maxFrameW / ratio;
    }

    state.frame = {
      width: state.maxFrameW,
      height: state.maxFrameH,
      left: (state.displayW - state.maxFrameW) / 2,
      top: (state.displayH - state.maxFrameH) / 2
    };

    zoomInput.value = 0;
    paintFrame();
  }

  function applyCrop() {
    if (!window.tcnexusMedia) {
      showError('Cropper is not configured.');
      return;
    }

    // An exact-size upload already satisfies the requested crop. Keep the
    // original attachment instead of asking the server to re-encode it; this
    // also works on hosts without GD or Imagick enabled.
    if (Math.round(state.naturalWidth) === state.cropWidth && Math.round(state.naturalHeight) === state.cropHeight) {
      state.onDone({ id: state.attachmentId, url: state.attachmentUrl });
      close();
      return;
    }

    var cropRect = window.TCNexusCropRect.calculateCropRect(state);

    applyBtn.disabled = true;
    applyBtn.textContent = 'Cropping…';
    hideError();

    var body = new URLSearchParams({
      action: 'tcnexus_crop_image',
      nonce: window.tcnexusMedia.nonce,
      attachment_id: state.attachmentId,
      x: cropRect.x,
      y: cropRect.y,
      width: cropRect.width,
      height: cropRect.height,
      dst_width: state.cropWidth,
      dst_height: state.cropHeight
    });

    fetch(window.tcnexusMedia.ajaxUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
      .then(function (response) { return response.json(); })
      .then(function (json) {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply Crop';
        if (json && json.success) {
          state.onDone({ id: json.data.id, url: json.data.url });
          close();
        } else {
          showError((json && json.data && json.data.message) || 'Could not crop image.');
        }
      })
      .catch(function () {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply Crop';
        showError('Could not reach the server.');
      });
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function hideError() {
    errorEl.style.display = 'none';
  }

  function close() {
    modal.classList.remove('is-open');
    img.src = '';
    state = null;
  }

  function open(attachment, cropWidth, cropHeight, onDone) {
    ensureModal();
    hideError();

    state = {
      attachmentId: attachment.id,
      attachmentUrl: attachment.url,
      naturalWidth: attachment.width || cropWidth,
      naturalHeight: attachment.height || cropHeight,
      cropWidth: cropWidth,
      cropHeight: cropHeight,
      onDone: onDone
    };

    modal.classList.add('is-open');

    img.onload = function () {
      // Use the dimensions of the actual uploaded image, not only the media
      // model metadata. This keeps the exact-size fast path consistent for
      // every picker, including uploads whose metadata is incomplete.
      if (img.naturalWidth && img.naturalHeight) {
        state.naturalWidth = img.naturalWidth;
        state.naturalHeight = img.naturalHeight;
      }
      layout();
    };
    img.src = attachment.url;
  }

  return { open: open };
})();
