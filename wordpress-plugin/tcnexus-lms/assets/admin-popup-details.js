(function () {
  function wireMediaType(select) {
    var section = select.closest('.tcn-popup-card');
    if (!section) return;
    var image = section.querySelector('.tcn-popup-media-image');
    var video = section.querySelector('.tcn-popup-media-video');
    function update() {
      if (image) image.style.display = select.value === 'image' ? '' : 'none';
      if (video) video.style.display = select.value === 'video' ? '' : 'none';
    }
    select.addEventListener('change', update);
    update();
  }
  document.querySelectorAll('.tcn-popup-media-type').forEach(wireMediaType);
}());
