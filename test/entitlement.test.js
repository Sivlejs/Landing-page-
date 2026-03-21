'use strict';

/**
 * Unit tests for lib/entitlement.js and the /api/verify-access endpoint logic.
 *
 * Uses Node.js built-in test runner (node:test), available in Node >=18.
 * Run with:  npm test
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  recordPaidOrder,
  hasInMemoryAccess,
  clearAll,
  PAYPAL_ORDER_ID_PATTERN,
} = require('../lib/entitlement');

// ── PAYPAL_ORDER_ID_PATTERN ───────────────────────────────────────────────

describe('PAYPAL_ORDER_ID_PATTERN', () => {
  test('accepts a valid 17-char uppercase alphanumeric ID', () => {
    assert.ok(PAYPAL_ORDER_ID_PATTERN.test('1AB23456789ABCDEF'));
  });

  test('rejects an ID that is too short', () => {
    assert.ok(!PAYPAL_ORDER_ID_PATTERN.test('1AB2345678ABCDE'));
  });

  test('rejects an ID that is too long', () => {
    assert.ok(!PAYPAL_ORDER_ID_PATTERN.test('1AB23456789ABCDEFG'));
  });

  test('rejects an ID containing lowercase letters', () => {
    assert.ok(!PAYPAL_ORDER_ID_PATTERN.test('1ab23456789abcdef'));
  });

  test('rejects an empty string', () => {
    assert.ok(!PAYPAL_ORDER_ID_PATTERN.test(''));
  });

  test('rejects a string with special characters', () => {
    assert.ok(!PAYPAL_ORDER_ID_PATTERN.test('1AB2345678-ABCDE'));
  });
});

// ── recordPaidOrder / hasInMemoryAccess ───────────────────────────────────

describe('recordPaidOrder + hasInMemoryAccess', () => {
  beforeEach(() => {
    clearAll(); // start each test with a clean store
  });

  test('returns false when no order has been recorded', () => {
    assert.equal(hasInMemoryAccess('1AB23456789ABCDEF'), false);
  });

  test('returns true after a valid order ID is recorded', () => {
    recordPaidOrder('1AB23456789ABCDEF');
    assert.equal(hasInMemoryAccess('1AB23456789ABCDEF'), true);
  });

  test('returns false for a different order ID than the one recorded', () => {
    recordPaidOrder('1AB23456789ABCDEF');
    assert.equal(hasInMemoryAccess('BBBBBBBBBBBBBBBBB'), false);
  });

  test('ignores an invalid order ID format in recordPaidOrder', () => {
    recordPaidOrder('invalid');
    assert.equal(hasInMemoryAccess('invalid'), false);
  });

  test('ignores a null/undefined value in recordPaidOrder', () => {
    recordPaidOrder(null);
    recordPaidOrder(undefined);
    // Just ensure it does not throw and store anything queryable
    assert.equal(hasInMemoryAccess(''), false);
  });

  test('hasInMemoryAccess returns false for an invalid format even if something was recorded', () => {
    recordPaidOrder('1AB23456789ABCDEF');
    assert.equal(hasInMemoryAccess('bad'), false);
  });

  test('can record multiple order IDs independently', () => {
    recordPaidOrder('AAAAAAAAAAAAAAAAA');
    recordPaidOrder('BBBBBBBBBBBBBBBBB');
    assert.equal(hasInMemoryAccess('AAAAAAAAAAAAAAAAA'), true);
    assert.equal(hasInMemoryAccess('BBBBBBBBBBBBBBBBB'), true);
    assert.equal(hasInMemoryAccess('CCCCCCCCCCCCCCCCC'), false);
  });

  test('clearAll removes all recorded order IDs', () => {
    recordPaidOrder('AAAAAAAAAAAAAAAAA');
    clearAll();
    assert.equal(hasInMemoryAccess('AAAAAAAAAAAAAAAAA'), false);
  });
});

// ── verify-access logic (white-box integration) ───────────────────────────
// These tests exercise the same logic the /api/verify-access endpoint uses:
// in-memory cache hit → return true; cache miss + PayPal COMPLETED → return true.

describe('verify-access logic', () => {
  beforeEach(() => {
    clearAll();
  });

  test('grants access when the order is in the in-memory cache (simulates post-capture)', () => {
    const orderId = '1AB23456789ABCDEF';

    // Simulate what the capture-order endpoint does on success
    recordPaidOrder(orderId);

    // Simulate what verify-access does on a cache hit
    const hasAccess = hasInMemoryAccess(orderId);
    assert.equal(hasAccess, true);
  });

  test('denies access when order ID is not in cache and has invalid format', () => {
    const invalidId = 'not-a-valid-order';
    const patternOk = PAYPAL_ORDER_ID_PATTERN.test(invalidId);
    assert.equal(patternOk, false);
    // Endpoint returns { hasAccess: false } immediately without hitting PayPal
  });

  test('access persists across multiple hasInMemoryAccess calls', () => {
    const orderId = '1AB23456789ABCDEF';
    recordPaidOrder(orderId);

    // Simulate repeated page loads (e.g. refresh) re-verifying the same token
    assert.equal(hasInMemoryAccess(orderId), true);
    assert.equal(hasInMemoryAccess(orderId), true);
    assert.equal(hasInMemoryAccess(orderId), true);
  });
});
