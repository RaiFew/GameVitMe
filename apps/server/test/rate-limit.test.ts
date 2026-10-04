import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createTokenBucket } from '../src/socket/rate-limit.js';

describe('createTokenBucket', () => {
  test('a burst is allowed up to the cap and then refused', () => {
    const b = createTokenBucket(5, 1);
    const at = (n: number) => Array.from({ length: n }, () => b.take(1000)).every(Boolean);
    assert.equal(at(5), true);
    assert.equal(b.take(1000), false);
  });

  test('tokens refill over time', () => {
    const b = createTokenBucket(2, 10);
    assert.equal(b.take(0), true);
    assert.equal(b.take(0), true);
    assert.equal(b.take(0), false);
    assert.equal(b.take(50), false, '50ms buys half a token');
    assert.equal(b.take(100), true, '100ms buys one');
  });

  test('the cap holds — an idle client cannot bank an unbounded burst', () => {
    const b = createTokenBucket(3, 10);
    b.take(0);
    assert.equal(b.take(60_000), true);
    assert.equal(b.take(60_000), true);
    assert.equal(b.take(60_000), true);
    assert.equal(b.take(60_000), false);
  });

  test('a clock that goes backwards does not mint tokens', () => {
    const b = createTokenBucket(3, 10);
    b.take(10_000);
    b.take(10_000);
    b.take(10_000);
    assert.equal(b.take(10_000), false);
    assert.equal(b.take(5_000), false, 'no refill, and no negative refill');
  });
});