(function () {
  'use strict';
  var button = document.getElementById('tcn-media-library-upload');
  var root = document.querySelector('.tcn-media-library-wrap');
  if (!root) return;
  var mediaData = window.tcnexusMediaLibraryData || { nonce: '', items: [] };
  var nonce = mediaData.nonce;
  function post(action, data) {
    var body = new URLSearchParams(Object.assign({ action: action, nonce: nonce }, data || {}));
    return fetch(window.ajaxurl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }).then(function (r) { return r.json(); });
  }
  function deleteMedia(id, onSuccess) {
    if (!id || !window.confirm('Delete this media file permanently?')) return;
    post('tcnexus_media_library_delete', { attachment_id: id }).then(function (r) {
      if (r.success) onSuccess();
      else window.alert(r.data && r.data.message ? r.data.message : 'Media could not be deleted.');
    });
  }
  function details(id) {
    post('tcnexus_media_library_details', { attachment_id: id }).then(function (r) {
      if (!r.success) return;
      var d = r.data, modal = document.createElement('div');
      modal.className = 'tcn-media-details';
      modal.innerHTML = '<div class="tcn-media-details__panel"><button class="tcn-media-details__close" type="button">×</button>' + (d.url ? '<img src="' + d.url + '" alt="">' : '') + '<h2>' + d.title + '</h2><dl><dt>Type</dt><dd>' + d.type + '</dd><dt>Dimensions</dt><dd>' + d.dimensions + '</dd><dt>File size</dt><dd>' + d.size + '</dd><dt>Uploaded</dt><dd>' + d.date + '</dd><dt>Folder</dt><dd>' + d.folder + '</dd><dt>File URL</dt><dd><a class="tcn-media-details__file-url" href="' + d.file_url + '" data-copy-url>' + d.file_url + '</a></dd></dl><button class="tcn-media-details__delete" type="button">Delete Media</button></div>';
      document.body.appendChild(modal);
      modal.querySelector('button').onclick = function () { modal.remove(); };
      modal.querySelector('.tcn-media-details__delete').onclick = function () { deleteMedia(id, function () { modal.remove(); window.location.reload(); }); };
      var fileLink = modal.querySelector('[data-copy-url]');
      if (fileLink) fileLink.onclick = function (e) {
        e.preventDefault();
        var copied = function () { fileLink.textContent = 'Copied'; window.setTimeout(function () { fileLink.textContent = d.file_url; }, 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(d.file_url).then(copied);
        else { var input = document.createElement('textarea'); input.value = d.file_url; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove(); copied(); }
      };
      modal.onclick = function (e) { if (e.target === modal) modal.remove(); };
    });
  }
  document.querySelectorAll('.tcn-media-library-item').forEach(function (item, index) {
    item.dataset.id = mediaData.items[index] || '';
    item.draggable = true;
    var trash = document.createElement('button');
    trash.type = 'button';
    trash.className = 'tcn-media-library-item__delete';
    trash.setAttribute('aria-label', 'Delete media');
    trash.title = 'Delete media';
    trash.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"></path><path d="M6 7l1 13a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-13"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';
    item.appendChild(trash);
    trash.addEventListener('click', function (e) { e.stopPropagation(); deleteMedia(item.dataset.id, function () { item.remove(); }); });
    item.addEventListener('dragstart', function (e) { item.classList.add('is-dragging'); e.dataTransfer.setData('text/plain', item.dataset.id); });
    item.addEventListener('dragend', function () { item.classList.remove('is-dragging'); });
    item.addEventListener('click', function () { details(item.dataset.id); });
  });
  document.querySelectorAll('.tcn-media-folder').forEach(function (folder) {
    var folderUrl = new URL(folder.href, window.location.href);
    folder.dataset.folderKey = folderUrl.searchParams.get('folder') || 'unsorted';
    folder.addEventListener('dragover', function (e) { e.preventDefault(); folder.classList.add('is-drop-target'); });
    folder.addEventListener('dragleave', function () { folder.classList.remove('is-drop-target'); });
    folder.addEventListener('drop', function (e) { e.preventDefault(); folder.classList.remove('is-drop-target'); post('tcnexus_media_library_move', { attachment_id: e.dataTransfer.getData('text/plain'), folder: folder.dataset.folderKey }).then(function (r) { if (r.success) window.location.reload(); }); });
  });
  if (button && window.wp && wp.media) button.addEventListener('click', function () { var frame = wp.media({ title: 'Upload Media', button: { text: 'Use this media' }, multiple: true }); frame.on('select', function () { window.location.reload(); }); frame.open(); });
}());
