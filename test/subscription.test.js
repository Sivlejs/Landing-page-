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

// ── check-plan validation logic ───────────────────────────────────────────
// Tests the same plan-ID validation logic used by GET /api/paypal/check-plan.

const PLAN_ID_PATTERN = /^P-[A-Z0-9]{6,30}$/;

describe('check-plan plan ID validation', () => {
  const PLACEHOLDER_PLAN = 'your_subscription_plan_id_here';

  function planConfigured(planId) {
    if (!planId || planId === PLACEHOLDER_PLAN) return { configured: false, reason: 'not set' };
    if (!PLAN_ID_PATTERN.test(planId)) return { configured: false, reason: 'invalid format' };
    return { configured: true };
  }

  test('reports not configured when plan ID is empty', () => {
    assert.deepEqual(planConfigured(''), { configured: false, reason: 'not set' });
  });

  test('reports not configured when plan ID is the placeholder value', () => {
    assert.deepEqual(planConfigured(PLACEHOLDER_PLAN), { configured: false, reason: 'not set' });
  });

  test('reports invalid format when plan ID does not start with P-', () => {
    assert.deepEqual(planConfigured('ABCDEFGH12345678'), { configured: false, reason: 'invalid format' });
  });

  test('reports invalid format when plan ID has fewer than 6 chars after P-', () => {
    assert.deepEqual(planConfigured('P-ABCDE'), { configured: false, reason: 'invalid format' });
  });

  test('reports invalid format when plan ID has more than 30 chars after P-', () => {
    assert.deepEqual(planConfigured('P-' + 'A'.repeat(31)), { configured: false, reason: 'invalid format' });
  });

  test('reports configured for a typical live plan ID', () => {
    // Real PayPal plan IDs look like: P-5ML4271244454362WXNWU5NQ
    assert.deepEqual(planConfigured('P-5ML4271244454362WXNWU5NQ'), { configured: true });
  });

  test('reports configured for a sandbox plan ID', () => {
    assert.deepEqual(planConfigured('P-1AB23456CD789012EF3456'), { configured: true });
  });
});
