'use strict';

/**
 * Entitlement store for one-time birth chart purchases.
 *
 * Completed PayPal order IDs are stored in an in-memory Set so that the
 * /api/verify-access endpoint can answer immediately without a round-trip to
 * PayPal.  On server restart the Set is empty; the verify-access endpoint
 * falls back to a live PayPal API check in that case so the grant survives
 * across restarts as long as the order ID is held by the client (localStorage).
 */

// PayPal order IDs are exactly 17 uppercase alphanumeric characters.
const PAYPAL_ORDER_ID_PATTERN = /^[A-Z0-9]{17}$/;

// PayPal subscription IDs start with "I-" followed by 4–30 uppercase alphanumeric characters.
// Examples: I-BW452GLLEP1G, I-1234ABCDEF56
const PAYPAL_SUBSCRIPTION_ID_PATTERN = /^I-[A-Z0-9]{4,30}$/;

const paidOrderIds = new Set();

/**
 * Record a successfully-captured PayPal order ID.
 * @param {string} orderID
 */
function recordPaidOrder(orderID) {
  if (typeof orderID === 'string' && PAYPAL_ORDER_ID_PATTERN.test(orderID)) {
    paidOrderIds.add(orderID);
  }
}

/**
 * Check whether the given order ID is in the in-memory grant cache.
 * Returns false for any value that doesn't match the expected format.
 * @param {string} orderID
 * @returns {boolean}
 */
function hasInMemoryAccess(orderID) {
  if (typeof orderID !== 'string' || !PAYPAL_ORDER_ID_PATTERN.test(orderID)) {
    return false;
  }
  return paidOrderIds.has(orderID);
}

/**
 * Clear all recorded order IDs.  Only used in tests.
 */
function clearAll() {
  paidOrderIds.clear();
}

module.exports = { recordPaidOrder, hasInMemoryAccess, clearAll, PAYPAL_ORDER_ID_PATTERN, PAYPAL_SUBSCRIPTION_ID_PATTERN };
