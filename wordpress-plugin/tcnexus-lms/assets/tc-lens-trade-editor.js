(function () {
  'use strict';

  var calendar = null;
  var dateInput = null;
  var viewMonth = null;
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function dateKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function closeCalendar(focus) {
    if (calendar) calendar.remove();
    if (dateInput) {
      dateInput.setAttribute('aria-expanded', 'false');
      if (focus && dateInput.isConnected) dateInput.focus();
    }
    calendar = null;
    dateInput = null;
  }

  function positionCalendar() {
    if (!calendar || !dateInput) return;
    if (!dateInput.isConnected) { closeCalendar(false); return; }
    var rect = dateInput.getBoundingClientRect();
    var height = calendar.offsetHeight || 340;
    calendar.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 310)) + 'px';
    calendar.style.top = Math.max(8, rect.bottom + height + 8 > window.innerHeight ? rect.top - height - 6 : rect.bottom + 6) + 'px';
  }

  function renderCalendar() {
    var year = viewMonth.getFullYear();
    var month = viewMonth.getMonth();
    var first = new Date(year, month, 1).getDay();
    var days = new Date(year, month + 1, 0).getDate();
    var today = dateKey(new Date());
    calendar.innerHTML = '<div class="tcn-trade-calendar__header">' +
      '<button type="button" data-calendar-prev aria-label="Previous month">‹</button>' +
      '<select data-calendar-month aria-label="Month">' + months.map(function (name, index) {
        return '<option value="' + index + '"' + (index === month ? ' selected' : '') + '>' + name + '</option>';
      }).join('') + '</select><input type="number" data-calendar-year aria-label="Year" min="1" max="9999" value="' + year + '">' +
      '<button type="button" data-calendar-next aria-label="Next month">›</button></div>' +
      '<div class="tcn-trade-calendar__week" aria-hidden="true">' + ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function (day) { return '<span>' + day + '</span>'; }).join('') + '</div>' +
      '<div class="tcn-trade-calendar__days" role="group" aria-label="' + months[month] + ' ' + year + '"></div>' +
      '<div class="tcn-trade-calendar__footer"><button type="button" data-calendar-clear>Clear</button><button type="button" data-calendar-today>Today</button><button type="button" data-calendar-close>Close</button></div>';
    var grid = calendar.querySelector('.tcn-trade-calendar__days');
    for (var i = 0; i < first; i++) grid.appendChild(document.createElement('span'));
    for (var day = 1; day <= days; day++) {
      var key = dateKey(new Date(year, month, day));
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(day);
      button.dataset.calendarDate = key;
      button.setAttribute('aria-label', months[month] + ' ' + day + ', ' + year);
      if (key === today) button.setAttribute('aria-current', 'date');
      if (key === dateInput.value) button.classList.add('is-selected');
      if (dateInput.min && key < dateInput.min || dateInput.max && key > dateInput.max) button.disabled = true;
      grid.appendChild(button);
    }
    positionCalendar();
  }

  function openCalendar(input) {
    if (dateInput === input && calendar) return;
    closeCalendar(false);
    dateInput = input;
    var parts = input.value.split('-').map(Number);
    var date = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    viewMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    calendar = document.createElement('div');
    calendar.className = 'tcn-trade-calendar';
    calendar.setAttribute('role', 'dialog');
    calendar.setAttribute('aria-label', 'Choose expiry date');
    input.setAttribute('aria-expanded', 'true');
    document.body.appendChild(calendar);
    renderCalendar();
    (calendar.querySelector('.is-selected') || calendar.querySelector('[data-calendar-date]:not([disabled])')).focus();
  }

  function selectDate(value) {
    var input = dateInput;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    closeCalendar(true);
  }

  document.addEventListener('click', function (event) {
    var input = event.target.closest('[data-tc-lens-trade-editor] input[data-leg-field="expiration"]');
    if (input && !input.disabled) { event.preventDefault(); openCalendar(input); return; }
    if (!calendar) return;
    if (!calendar.contains(event.target)) { closeCalendar(false); return; }
    var button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-calendar-date')) selectDate(button.dataset.calendarDate);
    else if (button.hasAttribute('data-calendar-clear')) selectDate('');
    else if (button.hasAttribute('data-calendar-today')) {
      var today = dateKey(new Date());
      if ((!dateInput.min || today >= dateInput.min) && (!dateInput.max || today <= dateInput.max)) selectDate(today);
    } else if (button.hasAttribute('data-calendar-close')) closeCalendar(true);
    else {
      var previous = button.hasAttribute('data-calendar-prev');
      viewMonth.setMonth(viewMonth.getMonth() + (previous ? -1 : 1));
      renderCalendar();
      calendar.querySelector(previous ? '[data-calendar-prev]' : '[data-calendar-next]').focus();
    }
  });

  document.addEventListener('change', function (event) {
    if (!calendar || !calendar.contains(event.target)) return;
    if (event.target.matches('[data-calendar-month]')) viewMonth.setMonth(Number(event.target.value));
    else if (event.target.matches('[data-calendar-year]') && event.target.validity.valid && event.target.value) viewMonth.setFullYear(Number(event.target.value));
    else return;
    var selector = event.target.matches('select') ? '[data-calendar-month]' : '[data-calendar-year]';
    renderCalendar();
    calendar.querySelector(selector).focus();
  });

  document.addEventListener('keydown', function (event) {
    if (event.target.matches && event.target.matches('[data-tc-lens-trade-editor] input[data-leg-field="expiration"]') && (event.key === ' ' || event.key === 'F4' || event.altKey && event.key === 'ArrowDown')) {
      event.preventDefault(); openCalendar(event.target);
    } else if (calendar && event.key === 'Escape') { event.preventDefault(); closeCalendar(true); }
    else if (calendar && event.target.matches && event.target.matches('[data-calendar-date]') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      var parts = event.target.dataset.calendarDate.split('-').map(Number);
      var date = new Date(parts[0], parts[1] - 1, parts[2]);
      date.setDate(date.getDate() + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 })[event.key]);
      viewMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCalendar();
      calendar.querySelector('[data-calendar-date="' + dateKey(date) + '"]').focus();
    }
  });
  document.addEventListener('focusin', function (event) {
    if (calendar && event.target !== dateInput && !calendar.contains(event.target)) closeCalendar(false);
  });
  window.addEventListener('resize', positionCalendar);
  document.addEventListener('scroll', positionCalendar, true);

  function refresh(editor, notify) {
    var panel = editor.closest('.tcn-lesson-expand__panel');
    if (panel && panel.closest('.is-open')) {
      requestAnimationFrame(function () { panel.style.maxHeight = panel.scrollHeight + 'px'; });
    }
    if (notify) editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  document.addEventListener('click', function (event) {
    var add = event.target.closest('[data-trade-add]');
    var remove = event.target.closest('[data-trade-remove]');
    if (!add && !remove) return;
    var editor = event.target.closest('[data-tc-lens-trade-editor]');
    if (!editor) return;
    event.preventDefault();
    event.stopPropagation();
    if (remove) {
      var row = remove.closest('.tcn-trade-leg');
      var next = row.nextElementSibling || row.previousElementSibling;
      row.remove();
      (next ? next.querySelector('select') : editor.querySelector('[data-trade-add]')).focus();
    } else {
      var list = editor.querySelector('[data-trade-legs]');
      var template = editor.querySelector('[data-trade-leg-template]');
      var prefix = editor.querySelector('[data-trade-ticker]').name.replace(/\[underlying\]$/, '');
      var index = Number(editor.dataset.nextLegIndex || 0);
      list.querySelectorAll('[name]').forEach(function (field) {
        var match = field.name.match(/\[legs\]\[(\d+)\]/);
        if (match) index = Math.max(index, Number(match[1]) + 1);
      });
      editor.dataset.nextLegIndex = String(index + 1);
      var fragment = template.content.cloneNode(true);
      fragment.querySelectorAll('[data-leg-field]').forEach(function (field) {
        field.name = prefix + '[legs][' + index + '][' + field.dataset.legField + ']';
        field.disabled = false;
      });
      var row = fragment.querySelector('.tcn-trade-leg');
      list.appendChild(fragment);
      row.querySelector('select').focus();
    }
    refresh(editor, true);
  });

  document.addEventListener('input', function (event) {
    if (!event.target.matches('[data-trade-ticker]')) return;
    var editor = event.target.closest('[data-tc-lens-trade-editor]');
    editor.querySelector('[data-trade-symbol]').textContent = event.target.value.trim().toUpperCase() || 'No ticker';
  });

  document.addEventListener('change', function (event) {
    if (!event.target.matches('[data-leg-field="side"]')) return;
    event.target.closest('.tcn-trade-leg').dataset.side = event.target.value;
  });
})();
