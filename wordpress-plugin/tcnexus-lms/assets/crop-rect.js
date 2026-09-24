(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TCNexusCropRect = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function calculateCropRect(state) {
    var sourceWidth = Math.max(1, Math.round(state.naturalWidth));
    var sourceHeight = Math.max(1, Math.round(state.naturalHeight));
    if (sourceWidth === state.cropWidth && sourceHeight === state.cropHeight) {
      return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
    }
    var x = clamp(Math.round(state.frame.left / state.scale), 0, sourceWidth - 1);
    var y = clamp(Math.round(state.frame.top / state.scale), 0, sourceHeight - 1);
    var width = clamp(Math.round(state.frame.width / state.scale), 1, sourceWidth - x);
    var height = clamp(Math.round(state.frame.height / state.scale), 1, sourceHeight - y);

    return { x: x, y: y, width: width, height: height };
  }

  return { calculateCropRect: calculateCropRect };
});
