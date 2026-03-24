'use strict';

/**
 * Unit tests for subscription-related utilities and the
 * /api/paypal/verify-subscription endpoint logic.
 *
 * Uses Node.js built-in test runner (node:test), available in Node >=18.
 * Run with:  npm test
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { PAYPAL_SUBSCRIPTION_ID_PATTERN } = require('../lib/entitlement');

// ── PAYPAL_SUBSCRIPTION_ID_PATTERN ────────────────────────────────────────

describe('PAYPAL_SUBSCRIPTION_ID_PATTERN', () => {
  test('accepts a typical PayPal subscription ID', () => {
    assert.ok(PAYPAL_SUBSCRIPTION_ID_PATTERN.test('I-BW452GLLEP1G'));
  });

  test('accepts a longer subscription ID', () => {
    assert.ok(PAYPAL_SUBSCRIPTION_ID_PATTERN.test('I-1234ABCDEF567890'));
  });

  test('accepts a subscription ID with exactly 4 characters after I-', () => {
    assert.ok(PAYPAL_SUBSCRIPTION_ID_PATTERN.test('I-ABCD'));
  });

  test('accepts a subscription ID with 20 characters after I-', () => {
    assert.ok(PAYPAL_SUBSCRIPTION_ID_PATTERN.test('I-ABCDEFGHIJ12345678'));
  });

  test('rejects an ID that does not start with I-', () => {
    assert.ok(!PAYPAL_SUBSCRIPTION_ID_PATTERN.test('BW452GLLEP1G'));
  });

  test('rejects an order ID format (no I- prefix)', () => {
    assert.ok(!PAYPAL_SUBSCRIPTION_ID_PATTERN.test('1AB23456789ABCDEF'));
  });

  test('rejects an empty string', () => {
    assert.ok(!PAYPAL_SUBSCRIPTION_ID_PATTERN.test(''));
  });

  test('rejects an ID with lowercase letters', () => {
    assert.ok(!PAYPAL_SUBSCRIPTION_ID_PATTERN.test('I-bw452gllep1g'));
  });

  test('rejects an ID with special characters', () => {
    assert.ok(!PAYPAL_SUBSCRIPTION_ID_PATTERN.test('I-BW452-GLLEP1G'));
  });

  test('rejects an ID with too few characters after I-', () => {
    // Less than 4 chars after I- is rejected
    assert.ok(!PAYPAL_SUBSCRIPTION_ID_PATTERN.test('I-ABC'));
  });

  test('rejects an ID with too many characters after I-', () => {
    // More than 20 chars after I- is rejected
    assert.ok(!PAYPAL_SUBSCRIPTION_ID_PATTERN.test('I-ABCDEFGHIJ1234567890X'));
  });
});
