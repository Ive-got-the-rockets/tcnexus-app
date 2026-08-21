(function () {
  // root is Course Builder's own wrapper — some sections below (tabs, slug
  // mirroring, the quick-create-person modal) only ever exist on that page
  // and are gated on it directly. The generic subsystems (custom selects,
  // media pickers, the lessons list) are NOT gated on root, since the
  // Global Lessons List page reuses this same script but has no
  // #tcnexus-builder wrapper of its own.
  var root = document.getElementById('tcnexus-builder');

  // ---------- Tabs ----------

  if (root) {
    var tabs = root.querySelectorAll('.tcn-tab');
    var panels = root.querySelectorAll('.tcn-panel');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
        panels.forEach(function (p) { p.classList.remove('is-active'); });

        tab.setAttribute('aria-selected', 'true');
        var panel = root.querySelector('#' + tab.getAttribute('aria-controls'));
        if (panel) {
          panel.classList.add('is-active');
        }
        window.location.hash = tab.getAttribute('data-tab');
      });
    });

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
      var courseFormDirty = false;
      var markCourseFormDirty = function () {
        if (courseFormDirty) {
          return;
        }
        courseFormDirty = true;
        saveCourseBtn.textContent = 'Pending Save';
      };
      courseForm.addEventListener('input', markCourseFormDirty);
      courseForm.addEventListener('change', markCourseFormDirty);
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

    var selectBtn = picker.querySelector('.tcn-media-select');
    var removeBtn = picker.querySelector('.tcn-media-remove');
    var input = document.getElementById(picker.getAttribute('data-input-id'));
    var preview = picker.querySelector('.tcn-media-picker__preview');
    var cropWidth = parseInt(picker.getAttribute('data-crop-width'), 10) || 0;
    var cropHeight = parseInt(picker.getAttribute('data-crop-height'), 10) || 0;

    if (!selectBtn || !input || !preview || !window.wp || !wp.Uploader) {
      return;
    }

    function renderPreview(url) {
      if (url) {
        preview.innerHTML = '<img src="' + url + '" alt="" />';
        return;
      }
      var empty = 'No image selected';
      if (cropWidth && cropHeight) {
        empty += '<br />Recommended size: ' + cropWidth + ' × ' + cropHeight + 'px';
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

    var uploader = new wp.Uploader({
      container: picker,
      browser: selectBtn,
      dropzone: picker,
      success: function (attachment) {
        var data = toPlainAttachment(attachment);
        if (cropWidth && cropHeight && window.TCNexusCropper) {
          window.TCNexusCropper.open(data, cropWidth, cropHeight, useAttachment);
        } else {
          useAttachment(data);
        }
      },
      error: function (message) {
        showUploadError(typeof message === 'string' ? message : 'Could not upload this image.');
      }
    });

    // wp.Uploader wraps a raw Plupload instance at .uploader — its own
    // success/error callbacks above only fire once the whole upload has
    // finished, with nothing shown while it's still in flight, so the
    // progress bar hooks the lower-level Plupload events directly instead.
    if (uploader.uploader && typeof uploader.uploader.bind === 'function') {
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
        quickTitleEl.textContent = quickRole === 'guest' ? 'Add Guest' : 'Add Instructor';
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
          panel.classList.add('tcn-lesson-expand__panel--settled');
        }
        panel.addEventListener('transitionend', function (event) {
          if (event.propertyName === 'max-height' && expandRow.classList.contains('is-open')) {
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
        .call(lessonsList.querySelectorAll('.tcn-lesson-card__order select'))
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

      var html = template.innerHTML.replace(/__INDEX__/g, String(newRowIndex++));
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
      if (orderSelect) {
        orderSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      expandRow.querySelectorAll('.tcn-media-picker').forEach(wireMediaPicker);
      expandRow.querySelectorAll('.tcn-select').forEach(enhanceSelect);
      updateLessonOrderAvailability();
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

    lessonsList.addEventListener('click', function (event) {
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
      if (!willOpen) {
        var closingPanel = expand.querySelector('.tcn-lesson-expand__panel');
        if (closingPanel) {
          closingPanel.classList.remove('tcn-lesson-expand__panel--settled');
        }
      }
    });

    lessonsList.addEventListener('change', function (event) {
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

    var x = Math.round(state.frame.left / state.scale);
    var y = Math.round(state.frame.top / state.scale);
    var width = Math.round(state.frame.width / state.scale);
    var height = Math.round(state.frame.height / state.scale);

    applyBtn.disabled = true;
    applyBtn.textContent = 'Cropping…';
    hideError();

    var body = new URLSearchParams({
      action: 'tcnexus_crop_image',
      nonce: window.tcnexusMedia.nonce,
      attachment_id: state.attachmentId,
      x: x,
      y: y,
      width: width,
      height: height,
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
      naturalWidth: attachment.width || cropWidth,
      naturalHeight: attachment.height || cropHeight,
      cropWidth: cropWidth,
      cropHeight: cropHeight,
      onDone: onDone
    };

    modal.classList.add('is-open');

    img.onload = layout;
    img.src = attachment.url;
  }

  return { open: open };
})();
