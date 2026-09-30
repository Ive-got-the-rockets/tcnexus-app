(function () {
  var list = document.getElementById('tcnexus-global-lessons-list');
  if (!list) {
    return;
  }

  // ---------- Filters ----------
  // Purely client-side — every row is already rendered with its course/
  // instructor and parent ids on it, so filtering just shows/hides row pairs instead
  // of round-tripping to the server.

  var instructorFilter = document.getElementById('tcn-filter-instructor');
  var courseFilter = document.getElementById('tcn-filter-course');
  var clearBtn = document.getElementById('tcn-filter-clear');
  var countEl = document.getElementById('tcn-filter-count');

  function allRowPairs() {
    return Array.prototype.filter.call(list.children, function (el) {
      return el.classList.contains('tcn-lesson-row');
    }).map(function (row) {
      return { row: row, expand: row.nextElementSibling };
    });
  }

  function applyFilters() {
    var instructorId = instructorFilter.value;
    var courseId = courseFilter.value;
    var visible = 0;

    allRowPairs().forEach(function (pair) {
      var matches =
        (!instructorId || pair.row.getAttribute('data-instructor-id') === instructorId) &&
        (!courseId || pair.row.getAttribute('data-course-id') === courseId);

      pair.row.style.display = matches ? '' : 'none';
      if (pair.expand) {
        pair.expand.style.display = matches ? '' : 'none';
      }
      if (matches) {
        visible++;
      }
    });

    if (countEl) {
      countEl.textContent = visible + ' item' + (visible === 1 ? '' : 's');
    }
  }

  if (instructorFilter && courseFilter) {
    instructorFilter.addEventListener('change', applyFilters);
    courseFilter.addEventListener('change', applyFilters);

    // enhanceSelect() (see course-builder.js, loaded document-wide) swaps
    // these <select>s for a custom trigger + list and dispatches a native
    // 'change' event on the real <select> when an option is picked, so this
    // listener fires the same way whether the user used the real select or
    // the enhanced one.
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      instructorFilter.value = '';
      courseFilter.value = '';
      if (instructorFilter._tcnRefresh) {
        instructorFilter._tcnRefresh();
      }
      if (courseFilter._tcnRefresh) {
        courseFilter._tcnRefresh();
      }
      applyFilters();
    });
  }

  applyFilters();

  // ---------- Expand / collapse + live summary sync ----------

  function renderTier(row, tier) {
    var badge = row.querySelector('[data-tier-badge]');
    var toggle = row.querySelector('[data-tier-toggle]');
    var expand = row.nextElementSibling;
    if (badge) {
      badge.textContent = tier === 'paid' ? 'Paid' : 'Free';
      badge.className = 'tcn-level-chip tcn-level-chip--' + tier;
    }
    if (toggle) {
      toggle.setAttribute('data-tier', tier);
      toggle.setAttribute('aria-pressed', tier === 'free' ? 'true' : 'false');
      toggle.setAttribute('aria-label', 'Make episode ' + (tier === 'free' ? 'paid' : 'free'));
    }
    if (expand) {
      var radio = expand.querySelector('.tcn-lesson-card__row--meta input[type="radio"][value="' + tier + '"]');
      if (radio) radio.checked = true;
    }
  }

  function markPending(row) {
    var expand = row ? row.nextElementSibling : null;
    var saveBtn = expand ? expand.querySelector('.tcn-global-lesson-save') : null;
    if (!saveBtn) return;
    saveBtn.classList.add('is-pending');
    saveBtn.textContent = 'Pending Save';
  }

  function saveInlineTier(toggle, row) {
    if (!window.tcnexusGlobalLessons) return;
    var previousTier = toggle.getAttribute('data-tier') === 'paid' ? 'paid' : 'free';
    var nextTier = previousTier === 'free' ? 'paid' : 'free';
    toggle.disabled = true;
    renderTier(row, nextTier);

    var body = new URLSearchParams({
      action: 'tcnexus_set_global_lesson_tier',
      nonce: window.tcnexusGlobalLessons.tierNonce,
      lesson_id: row.getAttribute('data-lesson-id'),
      tier: nextTier
    });

    fetch(window.tcnexusGlobalLessons.ajaxUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
      .then(function (response) { return response.json(); })
      .then(function (json) {
        toggle.disabled = false;
        if (json && json.success && json.data && json.data.tier) {
          renderTier(row, json.data.tier);
        } else {
          renderTier(row, previousTier);
          window.alert((json && json.data && json.data.message) || 'Could not update the episode tier.');
        }
      })
      .catch(function () {
        toggle.disabled = false;
        renderTier(row, previousTier);
        window.alert('Could not reach the server.');
      });
  }

  function wireLessonRow(row, expand) {
    expand.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () { markPending(row); });
      field.addEventListener('change', function () { markPending(row); });
    });

    var titleInput = expand.querySelector('.tcn-lesson-card__title input');
    var titleSpan = row.querySelector('.tcn-lesson-row__title span');
    if (titleInput && titleSpan) {
      titleInput.addEventListener('input', function () {
        titleSpan.textContent = titleInput.value.trim() || 'Untitled episode';
      });
    }

    var orderSelect = expand.querySelector('.tcn-lesson-card__order select');
    var orderCell = row.querySelector('.tcn-lessons-overview__order');
    if (orderSelect && orderCell) {
      orderSelect.addEventListener('change', function () {
        orderCell.textContent = ('0' + orderSelect.value).slice(-2);
      });
    }

    var durationInput = expand.querySelector('.tcn-duration-input');
    var durationCell = row.querySelector('.tcn-lessons-overview__duration');
    if (durationInput && durationCell) {
      durationInput.addEventListener('input', function () {
        durationCell.textContent = durationInput.value.trim() || '—';
      });
    }

    var tierRadios = expand.querySelectorAll('.tcn-lesson-card__row--meta input[type="radio"]');
    tierRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.checked) renderTier(row, radio.value);
      });
    });

    var videoSourceRadios = expand.querySelectorAll('.tcn-lesson-card__row--video input[type="radio"]');
    var videoIdInput = expand.querySelector('.tcn-video-id-input');
    if (videoIdInput) {
      videoSourceRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
          if (radio.checked) {
            videoIdInput.placeholder = radio.value === 'youtube' ? 'YouTube Video ID' : 'Vimeo Video ID';
          }
        });
      });
    }

    // .tcn-lesson-expand__panel needs overflow:hidden for its max-height
    // open/close animation, but that clips the Order field's dropdown list
    // once the row is open — so overflow only switches to visible once the
    // open transition has actually finished, and back to hidden the instant
    // a close starts so the collapse animation still clips (see the same
    // pattern, with the same reasoning, in course-builder.js).
    var panel = expand.querySelector('.tcn-lesson-expand__panel');
    if (panel) {
      panel.addEventListener('transitionend', function (event) {
        if (event.propertyName === 'max-height' && expand.classList.contains('is-open')) {
          panel.classList.add('tcn-lesson-expand__panel--settled');
        }
      });
    }

    row.addEventListener('click', function (event) {
      if (event.target.closest('[data-tier-toggle]')) return;
      var willOpen = !row.classList.contains('is-open');
      row.classList.toggle('is-open', willOpen);
      expand.classList.toggle('is-open', willOpen);
      if (!willOpen && panel) {
        panel.classList.remove('tcn-lesson-expand__panel--settled');
      }
    });
  }

  allRowPairs().forEach(function (pair) {
    if (pair.expand && pair.expand.classList.contains('tcn-lesson-expand')) {
      wireLessonRow(pair.row, pair.expand);
    }
  });

  list.addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-tier-toggle]');
    if (!toggle) return;
    event.preventDefault();
    event.stopPropagation();
    var row = toggle.closest('.tcn-lesson-row');
    if (row) saveInlineTier(toggle, row);
  });

  list.addEventListener('click', function (event) {
    if (event.target.classList.contains('tcn-lesson-guest__remove')) {
      var guestItem = event.target.closest('.tcn-lesson-guest');
      var expand = guestItem ? guestItem.closest('.tcn-lesson-expand') : null;
      var row = expand ? expand.previousElementSibling : null;
      if (guestItem) guestItem.remove();
      if (row) markPending(row);
    }
  });

  list.addEventListener('change', function (event) {
    if (!event.target.matches('.tcn-lesson-guest-picker')) return;
    var picker = event.target;
    var guestId = picker.value;
    var guestGroup = picker.closest('.tcn-lesson-card__guests');
    var guestList = guestGroup ? guestGroup.querySelector('.tcn-lesson-guest-list') : null;
    if (guestId && guestList && !guestList.querySelector('[data-guest-id="' + guestId + '"]')) {
      var option = picker.options[picker.selectedIndex];
      var item = document.createElement('div');
      item.className = 'tcn-lesson-guest';
      item.setAttribute('data-guest-id', guestId);
      item.innerHTML = '<span class="tcn-lesson-guest__avatar-wrap"></span>' +
        '<span class="tcn-lesson-guest__name"></span>' +
        '<input type="hidden" name="guest_ids[]" value="' + guestId + '" />' +
        '<button type="button" class="tcn-lesson-guest__remove" aria-label="Remove guest">×</button>';
      item.querySelector('.tcn-lesson-guest__name').textContent = option ? option.textContent : 'Guest';
      if (option && option.getAttribute('data-photo')) {
        var avatar = document.createElement('img');
        avatar.className = 'tcn-lesson-guest__avatar';
        avatar.src = option.getAttribute('data-photo');
        avatar.alt = '';
        item.querySelector('.tcn-lesson-guest__avatar-wrap').appendChild(avatar);
      }
      guestList.appendChild(item);
    }
    picker.value = '';
    if (picker._tcnRefresh) picker._tcnRefresh();
    var expand = guestGroup ? guestGroup.closest('.tcn-lesson-expand') : null;
    var row = expand ? expand.previousElementSibling : null;
    if (row) markPending(row);
  });

  // ---------- Save (ajax, one lesson at a time) ----------

  function parseTcLensTime(value, allowBlank) {
    var text = String(value || '').trim();
    if (!text && allowBlank) return null;
    var match = text.match(/^(\d+):(\d{1,2})$/);
    if (!match || Number(match[2]) > 59) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function serializeTcLensTimeline(expand) {
    var timeline = [];
    expand.querySelectorAll('[data-global-tc-lens-event]').forEach(function (eventRow, index) {
      var startTime = parseTcLensTime(eventRow.querySelector('[data-tc-lens-start]')?.value, false);
      var endTime = parseTcLensTime(eventRow.querySelector('[data-tc-lens-end]')?.value, true);
      var message = eventRow.querySelector('[data-tc-lens-message]')?.value.trim() || '';
      if (startTime === null || endTime !== null && endTime < startTime || !message) return;
      timeline.push({
        id: eventRow.querySelector('[data-tc-lens-id]')?.value || ('event-new-' + Date.now() + '-' + index),
        messageType: eventRow.querySelector('[data-tc-lens-type]')?.value === 'trade' ? 'trade' : 'llm',
        message: message,
        startTime: startTime,
        endTime: endTime
      });
    });
    return timeline;
  }

  list.addEventListener('click', function (event) {
    var add = event.target.closest('.tcn-global-tc-lens-add');
    if (add) {
      var timeline = add.closest('[data-global-tc-lens-timeline]');
      var template = timeline ? timeline.querySelector('.tcn-global-tc-lens-template') : null;
      var events = timeline ? timeline.querySelector('.tcn-global-tc-lens-events') : null;
      if (template && events) events.appendChild(template.content.cloneNode(true));
      return;
    }
    var remove = event.target.closest('.tcn-global-tc-lens-remove');
    if (remove) {
      var row = remove.closest('[data-global-tc-lens-event]');
      if (row) row.remove();
    }
  });

  list.addEventListener('click', function (event) {
    if (!event.target.classList.contains('tcn-global-lesson-save')) {
      return;
    }
    var expand = event.target.closest('.tcn-lesson-expand');
    var row = expand ? expand.previousElementSibling : null;
    if (!expand || !row || !window.tcnexusGlobalLessons) {
      return;
    }

    var lessonId = row.getAttribute('data-lesson-id');
    var titleInput = expand.querySelector('.tcn-lesson-card__title input');
    var orderSelect = expand.querySelector('.tcn-lesson-card__order select');
    var videoSourceRadio = expand.querySelector('.tcn-lesson-card__row--video input[type="radio"]:checked');
    var videoIdInput = expand.querySelector('.tcn-video-id-input');
    var durationInput = expand.querySelector('.tcn-duration-input');
    var tierRadio = expand.querySelector('.tcn-lesson-card__row--meta input[type="radio"]:checked');
    var thumbnailInput = expand.querySelector('.tcn-lesson-card__media input[type="hidden"]');
    var guestInputs = expand.querySelectorAll('.tcn-lesson-guest input[type="hidden"]');
    var saveBtn = event.target;

    saveBtn.disabled = true;
    saveBtn.classList.remove('is-pending');
    saveBtn.textContent = 'Saving…';

    var body = new URLSearchParams({
      action: 'tcnexus_save_global_lesson',
      nonce: window.tcnexusGlobalLessons.saveNonce,
      lesson_id: lessonId,
      title: titleInput ? titleInput.value : '',
      order: orderSelect ? orderSelect.value : '1',
      video_source: videoSourceRadio ? videoSourceRadio.value : 'vimeo',
      vimeo_id: videoIdInput ? videoIdInput.value : '',
      duration: durationInput ? durationInput.value : '',
      tc_lens_timeline: JSON.stringify(serializeTcLensTimeline(expand)),
      tier: tierRadio ? tierRadio.value : 'free',
      thumbnail_id: thumbnailInput ? thumbnailInput.value : ''
    });
    guestInputs.forEach(function (input) { body.append('guest_ids[]', input.value); });

    fetch(window.tcnexusGlobalLessons.ajaxUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
      .then(function (response) { return response.json(); })
      .then(function (json) {
        saveBtn.disabled = false;
        if (json && json.success) {
          saveBtn.textContent = 'Saved';
          setTimeout(function () { saveBtn.textContent = 'Save'; }, 1500);
        } else {
          saveBtn.classList.add('is-pending');
          saveBtn.textContent = 'Pending Save';
          window.alert((json && json.data && json.data.message) || 'Could not save this episode.');
        }
      })
      .catch(function () {
        saveBtn.disabled = false;
        saveBtn.classList.add('is-pending');
        saveBtn.textContent = 'Pending Save';
        window.alert('Could not reach the server.');
      });
  });

  // ---------- Remove (ajax, with confirm modal) ----------

  var deleteModal = document.getElementById('tcn-global-lesson-delete-modal');
  var deleteMessage = document.getElementById('tcn-global-lesson-delete-message');
  var deleteConfirmBtn = document.getElementById('tcn-global-lesson-delete-confirm');
  var deleteCancelBtn = document.getElementById('tcn-global-lesson-delete-cancel');
  var pendingDelete = null;

  function closeDeleteModal() {
    if (deleteModal) {
      deleteModal.classList.remove('is-open');
    }
    pendingDelete = null;
  }

  if (deleteModal) {
    list.addEventListener('click', function (event) {
      if (!event.target.classList.contains('tcn-global-lesson-remove')) {
        return;
      }
      var expand = event.target.closest('.tcn-lesson-expand');
      var row = expand ? expand.previousElementSibling : null;
      if (!expand || !row) {
        return;
      }
      var titleSpan = row.querySelector('.tcn-lesson-row__title span');
      deleteMessage.textContent = 'Are you sure you want to delete "' + (titleSpan ? titleSpan.textContent : 'this episode') + '"? This will move it to the trash.';
      pendingDelete = { row: row, expand: expand };
      deleteModal.classList.add('is-open');
    });

    deleteCancelBtn.addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', function (event) {
      if (event.target === deleteModal) {
        closeDeleteModal();
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && deleteModal.classList.contains('is-open')) {
        closeDeleteModal();
      }
    });

    deleteConfirmBtn.addEventListener('click', function () {
      if (!pendingDelete || !window.tcnexusGlobalLessons) {
        return;
      }
      var lessonId = pendingDelete.row.getAttribute('data-lesson-id');
      var target = pendingDelete;

      deleteConfirmBtn.disabled = true;
      deleteConfirmBtn.textContent = 'Deleting…';

      var body = new URLSearchParams({
        action: 'tcnexus_delete_global_lesson',
        nonce: window.tcnexusGlobalLessons.deleteNonce,
        lesson_id: lessonId
      });

      fetch(window.tcnexusGlobalLessons.ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
        .then(function (response) { return response.json(); })
        .then(function (json) {
          deleteConfirmBtn.disabled = false;
          deleteConfirmBtn.textContent = 'Delete';
          if (json && json.success) {
            target.row.remove();
            target.expand.remove();
            closeDeleteModal();
            applyFilters();
          } else {
            window.alert((json && json.data && json.data.message) || 'Could not delete this episode.');
          }
        })
        .catch(function () {
          deleteConfirmBtn.disabled = false;
          deleteConfirmBtn.textContent = 'Delete';
          window.alert('Could not reach the server.');
        });
    });
  }
})();
