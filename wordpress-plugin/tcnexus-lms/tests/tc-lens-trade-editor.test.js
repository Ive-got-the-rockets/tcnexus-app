const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const requireFrontend = createRequire(process.cwd() + '/frontend/package.json');
const { JSDOM } = requireFrontend('jsdom');
const script = fs.readFileSync('wordpress-plugin/tcnexus-lms/assets/tc-lens-trade-editor.js', 'utf8');
const prefix = 'lessons[35][tc_lens_timeline][2][trade]';
const dom = new JSDOM(`<form><div data-tc-lens-trade-editor>
<input data-trade-ticker name="${prefix}[underlying]" value="AAPL"><span data-trade-symbol>AAPL</span>
<button type="button" data-trade-add>+</button><div data-trade-legs></div>
<template data-trade-leg-template><div class="tcn-trade-leg" data-side="call">
<select data-leg-field="side"><option value="call">Call</option><option value="put">Put</option></select>
<select data-leg-field="action"><option value="buy_to_open">Buy to Open</option><option value="sell_to_close">Sell to Close</option></select>
<input data-leg-field="quantity" type="number" value="1"><input data-leg-field="strike" type="number">
<input data-leg-field="expiration" type="date"><input data-leg-field="entryPrice" type="number">
<button type="button" data-trade-remove>Remove</button></div></template></div></form>`, { runScripts: 'outside-only' });
dom.window.eval(script);
const d = dom.window.document;
let changes = 0;
d.querySelector('form').addEventListener('input', () => changes++);
d.querySelector('[data-trade-add]').click();
d.querySelector('[data-trade-add]').click();
let rows = d.querySelectorAll('.tcn-trade-leg');
assert.equal(rows.length, 2);
assert.equal(rows[0].querySelector('[data-leg-field="entryPrice"]').name, `${prefix}[legs][0][entryPrice]`);
assert.equal(rows[1].querySelector('[data-leg-field="expiration"]').type, 'date');
const side = rows[1].querySelector('[data-leg-field="side"]');
side.value = 'put'; side.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(rows[1].dataset.side, 'put');
rows[0].querySelector('[data-trade-remove]').click();
d.querySelector('[data-trade-add]').click();
rows = d.querySelectorAll('.tcn-trade-leg');
assert.equal(rows.length, 2);
assert.notEqual(rows[0].querySelector('select').name, rows[1].querySelector('select').name);
const ticker = d.querySelector('[data-trade-ticker]');
ticker.value = '<spy>'; ticker.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
assert.equal(d.querySelector('[data-trade-symbol]').textContent, '<SPY>');
assert.equal(d.querySelector('[data-trade-symbol]').children.length, 0);
assert.ok(changes >= 4, 'row mutations notify the existing unsaved-change workflow');
// A newly cloned timeline must derive names from its own ticker field.
const clone = d.querySelector('[data-tc-lens-trade-editor]').cloneNode(true);
clone.querySelector('[data-trade-legs]').replaceChildren();
clone.querySelector('[data-trade-ticker]').name = prefix.replace('[2]', '[3]') + '[underlying]';
d.querySelector('form').append(clone);
clone.querySelector('[data-trade-add]').click();
assert.ok(clone.querySelector('[data-trade-legs] select').name.startsWith('lessons[35][tc_lens_timeline][3][trade]'));
const expiry = rows[0].querySelector('[data-leg-field="expiration"]');
expiry.value = '2026-11-20';
expiry.click();
let calendar = d.querySelector('.tcn-trade-calendar');
assert.ok(calendar, 'expiry opens the styled calendar');
assert.equal(calendar.querySelector('[data-calendar-month]').value, '10');
calendar.querySelector('[data-calendar-next]').click();
assert.equal(calendar.querySelector('[data-calendar-month]').value, '11');
calendar.querySelector('[data-calendar-date="2026-12-15"]').click();
assert.equal(expiry.value, '2026-12-15');
assert.equal(d.querySelector('.tcn-trade-calendar'), null);
expiry.click();
d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert.equal(d.querySelector('.tcn-trade-calendar'), null);
assert.equal(expiry.value, '2026-12-15', 'escape leaves the date intact');
expiry.click();
d.querySelector('[data-calendar-clear]').click();
assert.equal(expiry.value, '');
dom.window.close();
console.log('TC Lens trade editor behavior passes');
