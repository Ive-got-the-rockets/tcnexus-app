(function () {
  var list = document.getElementById('tcnexus-global-lessons-list');
  if (!list) {
    return;
  }

  // ---------- Filters ----------
  // Purely client-side — every row is already rendered with its course/
  // instructor ids on it, so filtering just shows/hides row pairs instead
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
      countEl.textContent = visible + ' lesson' + (visible === 1 ? '' : 's');
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

  function wireLessonRow(row, expand) {
    var titleInput = expand.querySelector('.tcn-lesson-card__title input');
    var titleSpan = row.querySelector('.tcn-lesson-row__title span');
    if (titleInput && titleSpan) {
      titleInput.addEventListener('input', function () {
        titleSpan.textContent = titleInput.value.trim() || 'Untitled lesson';
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
    var levelChip = row.querySelector('.tcn-level-chip');
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

    row.addEventListener('click', function () {
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

  // ---------- Save (ajax, one lesson at a time) ----------

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
    var saveBtn = event.target;

    saveBtn.disabled = true;
    var originalLabel = saveBtn.textContent;
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
      tier: tierRadio ? tierRadio.value : 'free',
      thumbnail_id: thumbnailInput ? thumbnailInput.value : ''
    });

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
          setTimeout(function () { saveBtn.textContent = originalLabel; }, 1500);
        } else {
          saveBtn.textContent = originalLabel;
          window.alert((json && json.data && json.data.message) || 'Could not save this lesson.');
        }
      })
      .catch(function () {
        saveBtn.disabled = false;
        saveBtn.textContent = originalLabel;
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
      deleteMessage.textContent = 'Are you sure you want to delete "' + (titleSpan ? titleSpan.textContent : 'this lesson') + '"? This will move it to the trash.';
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
            window.alert((json && json.data && json.data.message) || 'Could not delete this lesson.');
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
