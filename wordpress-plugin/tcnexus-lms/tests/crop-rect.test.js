const assert = require('node:assert/strict');
const { calculateCropRect } = require('../assets/crop-rect');

const rect = calculateCropRect({
  naturalWidth: 1920,
  naturalHeight: 1080,
  displayW: 440,
  displayH: 248,
  scale: 440 / 1920,
  cropWidth: 1920,
  cropHeight: 1080,
  frame: { left: 0, top: 0.25, width: 440, height: 247.5 }
});

assert.deepEqual(rect, { x: 0, y: 0, width: 1920, height: 1080 });

const boundedRect = calculateCropRect({
  naturalWidth: 2000,
  naturalHeight: 1200,
  scale: 0.22,
  cropWidth: 1920,
  cropHeight: 1080,
  frame: { left: 176, top: 264, width: 440, height: 240 }
});

assert.deepEqual(boundedRect, { x: 800, y: 1200 - 1, width: 1200, height: 1 });
