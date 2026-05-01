const crypto = require('crypto');
const { processOrder } = require('./create-order');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

function sanitize(value = '') {
  return String(value).replace(/[<>]/g, '').trim();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { success: false, message: 'Method not allowed' });

  try {
    const { RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_SECRET) {
      return json(500, { success: false, message: 'Razorpay secret missing' });
    }

    const payload = JSON.parse(event.body || '{}');

    const razorpayOrderId = sanitize(payload.razorpay_order_id);
    const razorpayPaymentId = sanitize(payload.razorpay_payment_id);
    const razorpaySignature = sanitize(payload.razorpay_signature);

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return json(400, { success: false, message: 'Incomplete payment payload' });
    }

    const expected = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expected !== razorpaySignature) {
      return json(400, { success: false, message: 'Payment signature verification failed' });
    }

    const result = await processOrder({
      ...payload,
      paymentType: 'PAID',
      razorpayOrderId,
      razorpayPaymentId
    });

    return json(result.statusCode, {
      ...result.body,
      paymentVerified: true
    });
  } catch (error) {
    return json(500, { success: false, message: 'Verification failed', error: error.message });
  }
};
