import test from 'node:test';
import assert from 'node:assert/strict';
import {blendReplacementPixels, composeReplacement} from '../lab/image-replacement-composite.js';

const pixels = values => new Uint8ClampedArray(values.flat());

test('every exterior pixel and excluded foreground hole retain exact original RGBA', () => {
  const original = pixels(Array.from({length: 35}, (_, index) => [index * 7, 255 - index * 5, index * 3, index % 2 ? 255 : 100]));
  const generated = pixels(Array.from({length: 35}, () => [250, 30, 80, 255]));
  const mask = new Uint8ClampedArray(original.length);
  for (const index of [8, 9, 10, 15, 17, 22, 23, 24]) mask.set([255, 255, 255, 255], index * 4);
  mask.set([80, 80, 80, 255], 7 * 4);
  mask.set([255, 0, 0, 0], 25 * 4);
  const before = new Uint8ClampedArray(original);
  const result = blendReplacementPixels(original, generated, mask);
  for (let index = 0; index < 35; index++) {
    if (!mask[index * 4] || !mask[index * 4 + 3]) {
      assert.deepEqual(result.slice(index * 4, index * 4 + 4), original.slice(index * 4, index * 4 + 4), 'Exterior or hole pixel ' + index);
    }
  }
  assert.deepEqual(result.slice(16 * 4, 16 * 4 + 4), original.slice(16 * 4, 16 * 4 + 4), 'Foreground exclusion stays intact');
  assert.deepEqual(result.slice(8 * 4, 8 * 4 + 4), generated.slice(8 * 4, 8 * 4 + 4));
  assert.deepEqual(original, before, 'Original buffer is never mutated');
});

test('red and gray masks blend inward according to their coverage and alpha', () => {
  const original = pixels([[0, 100, 200, 255], [0, 100, 200, 255], [0, 100, 200, 255]]);
  const generated = pixels([[200, 0, 100, 255], [200, 0, 100, 255], [200, 0, 100, 255]]);
  const mask = pixels([[128, 128, 128, 255], [255, 0, 0, 128], [255, 0, 0, 255]]);
  const result = blendReplacementPixels(original, generated, mask);
  assert.deepEqual(Array.from(result), [100, 50, 150, 255, 100, 50, 150, 255, 200, 0, 100, 255]);
});

test('generated transparency uses alpha compositing and preserves untouched hidden channels', () => {
  const original = pixels([[10, 20, 30, 255], [70, 80, 90, 0], [99, 88, 77, 0]]);
  const generated = pixels([[250, 50, 10, 0], [200, 100, 50, 128], [200, 100, 50, 255]]);
  const mask = pixels([[255, 255, 255, 255], [255, 255, 255, 255], [0, 0, 0, 255]]);
  assert.deepEqual(Array.from(blendReplacementPixels(original, generated, mask)), [10, 20, 30, 255, 200, 100, 50, 128, 99, 88, 77, 0]);
});

test('empty selections and malformed or differently sized buffers fail before compositing', () => {
  const original = pixels([[1, 2, 3, 255]]);
  assert.throws(() => blendReplacementPixels(original, original, pixels([[0, 0, 0, 255]])), /Select an area/);
  assert.throws(() => blendReplacementPixels(original, original, pixels([[255, 255, 255, 0]])), /Select an area/);
  assert.throws(() => blendReplacementPixels(original, new Uint8ClampedArray(8), original), /matching RGBA/);
  assert.throws(() => blendReplacementPixels([], [], []), /matching RGBA/);
  assert.throws(() => blendReplacementPixels(new Uint8Array(3), original, original), /matching RGBA/);
});

test('bitmap validation rejects invalid dimensions and incompatible proportions before canvas work', async () => {
  const valid = {width: 640, height: 480};
  await assert.rejects(composeReplacement({width: 0, height: 480}, valid, valid), /valid dimensions/);
  await assert.rejects(composeReplacement(valid, {width: 8193, height: 480}, valid), /valid dimensions/);
  await assert.rejects(composeReplacement(valid, {width: 640, height: 640}, valid), /proportions/);
});

test('canvas orchestration preserves strip boundaries and refuses lossy or oversized exports', async () => {
  const previous = globalThis.OffscreenCanvas;
  let exported, exportType = 'image/png', exportSize = 20;
  class TestCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
    getContext() {
      const owner = this;
      return {
        clearRect() { owner.data.fill(0); },
        drawImage(image, dx, dy, width = image.width, height = image.height) {
          for (let y = 0; y < owner.height; y++) for (let x = 0; x < owner.width; x++) {
            const sx = Math.floor((x - dx) * image.width / width);
            const sy = Math.floor((y - dy) * image.height / height);
            if (sx >= 0 && sx < image.width && sy >= 0 && sy < image.height) {
              owner.data.set(image.data.slice((sy * image.width + sx) * 4, (sy * image.width + sx + 1) * 4), (y * owner.width + x) * 4);
            }
          }
        },
        getImageData(x, y, width, height) {
          const data = new Uint8ClampedArray(width * height * 4);
          for (let row = 0; row < height; row++) data.set(owner.data.slice(((y + row) * owner.width + x) * 4, ((y + row) * owner.width + x + width) * 4), row * width * 4);
          return {data, width, height};
        },
        putImageData(image, x, y) {
          for (let row = 0; row < image.height; row++) owner.data.set(image.data.slice(row * image.width * 4, (row + 1) * image.width * 4), ((y + row) * owner.width + x) * 4);
        }
      };
    }
    async convertToBlob() {
      exported = {width: this.width, height: this.height, data: new Uint8ClampedArray(this.data)};
      return new Blob([new Uint8Array(exportSize)], {type: exportType});
    }
  }
  globalThis.OffscreenCanvas = TestCanvas;
  try {
    const make = color => ({width: 4, height: 260, data: pixels(Array.from({length: 1040}, () => color))});
    const original = make([12, 33, 57, 255]), generated = make([210, 160, 90, 255]), mask = make([0, 0, 0, 255]);
    mask.data.set([255, 255, 255, 255], (129 * 4 + 2) * 4);
    mask.data.set([255, 255, 255, 255], (259 * 4 + 1) * 4);
    const blob = await composeReplacement(original, generated, mask);
    assert.equal(blob.type, 'image/png');
    assert.equal(exported.width, original.width);
    assert.equal(exported.height, original.height);
    assert.deepEqual(exported.data, blendReplacementPixels(original.data, generated.data, mask.data));
    exportType = 'image/jpeg';
    await assert.rejects(composeReplacement(original, generated, mask), /Lossless PNG export failed/);
    exportType = 'image/png';
    exportSize = 20 * 1024 * 1024 + 1;
    await assert.rejects(composeReplacement(original, generated, mask), /exceeds 20 MB.*generated image is saved/);
    const empty = make([0, 0, 0, 255]);
    await assert.rejects(composeReplacement(original, generated, empty), /Select an area/);
  } finally {
    if (previous === undefined) delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas = previous;
  }
});
