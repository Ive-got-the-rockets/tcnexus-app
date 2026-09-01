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

(function () {
  function wireBulletControls() {
    document.querySelectorAll('.tcn-pricing-bullet__remove').forEach(function (button) {
      button.addEventListener('click', function () {
        var row = button.closest('.tcn-pricing-bullet');
        if (row) row.remove();
      });
    });
    document.querySelectorAll('.tcn-pricing-bullet__add').forEach(function (button) {
      button.addEventListener('click', function () {
        var bullets = button.closest('.tcn-pricing-bullets');
        var tier = button.closest('.tcn-pricing-tier');
        if (!bullets || !tier) return;
        var indexMatch = tier.querySelector('input[name*="[tiers]"]')?.name.match(/tiers]\[(\d+)\]/);
        if (!indexMatch) return;
        var row = document.createElement('div');
        row.className = 'tcn-pricing-bullet';
        row.innerHTML = '<input name="paid_membership[tiers][' + indexMatch[1] + '][bullets][]" value="" placeholder="New bullet point" /><button type="button" class="tcn-pricing-bullet__remove" aria-label="Remove bullet">−</button>';
        button.before(row);
        row.querySelector('.tcn-pricing-bullet__remove').addEventListener('click', function () { row.remove(); });
        row.querySelector('input').focus();
      });
    });
  }
  wireBulletControls();
}());
