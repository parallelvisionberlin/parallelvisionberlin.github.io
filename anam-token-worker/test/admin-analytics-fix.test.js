import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinTodayStart, NINA_ANALYTICS_TIME_ZONE } from '../src/analytics.js';

test('Today resets at Berlin midnight during CEST',()=>{
  assert.equal(NINA_ANALYTICS_TIME_ZONE,'Europe/Berlin');
  assert.equal(berlinTodayStart(Date.parse('2026-09-09T00:30:00Z')),'2026-09-08T22:00:00.000Z');
});

test('Today resets at Berlin midnight during CET',()=>{
  assert.equal(berlinTodayStart(Date.parse('2026-12-09T00:30:00Z')),'2026-12-08T23:00:00.000Z');
});
