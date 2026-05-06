const ALLOWED_PAYMENT_TYPES = new Set(['PAID', 'COD']);

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

function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

async function sendToGoogleForms(order) {
  const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScitYhW6eHwJLcmTkhyiIidhXxFJw2wx9qG7SEP2CgtyDZ_lw/formResponse';
  const body = new URLSearchParams();
  body.set('entry.1213099713', order.name);
  body.set('entry.1032424383', order.phone);
  body.set('entry.1941968398', order.product);
  body.set('entry.271094336', String(order.amount || ''));
  body.set('entry.1465330029', order.couponCode || '');
  body.set('entry.1605987054', order.couponCode || '');
  body.set('entry.1143804846', order.product || '');

  const response = await fetch(formUrl, {
    method: 'POST',
    mode: 'no-cors',
    body
  });

  return { sent: true };
}

async function sendWebhook(order) {
  const { MAKE_WEBHOOK_URL } = process.env;
  if (!MAKE_WEBHOOK_URL) {
    return { sent: false, reason: 'MAKE_WEBHOOK_URL missing' };
  }

  const response = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webhook failed: ${response.status} ${text}`);
  }

  return { sent: true };
}

async function processOrder(data) {
  const name = sanitize(data.name);
  const phone = sanitize(data.phone);
  const address = sanitize(data.address);
  const product = sanitize(data.product);
  const paymentType = sanitize(data.paymentType).toUpperCase();
  const couponCode = sanitize(data.couponCode || '').toUpperCase();
  const razorpayOrderId = sanitize(data.razorpayOrderId || '');
  const razorpayPaymentId = sanitize(data.razorpayPaymentId || '');

  if (!name || !phone || !address || !product || !paymentType) {
    return { statusCode: 400, body: { success: false, message: 'All fields are required' } };
  }

  if (!isValidPhone(phone)) {
    return { statusCode: 400, body: { success: false, message: 'Invalid phone number' } };
  }

  if (!ALLOWED_PAYMENT_TYPES.has(paymentType)) {
    return { statusCode: 400, body: { success: false, message: 'Invalid payment type' } };
  }

  if (paymentType === 'PAID' && (!razorpayOrderId || !razorpayPaymentId)) {
    return { statusCode: 400, body: { success: false, message: 'Missing verified payment details' } };
  }

  const orderId = `NT${Date.now()}`;
  const createdAt = new Date().toISOString();

  const order = {
    orderId,
    name,
    phone,
    address,
    product,
    payment: paymentType,
    status: 'CONFIRMED',
    createdAt,
    couponCode,
    razorpayOrderId,
    razorpayPaymentId
  };

  let storageResult;
  try {
    storageResult = await sendToGoogleForms(order);
  } catch (error) {
    storageResult = { sent: false, reason: error.message };
  }

  let webhookResult;
  try {
    webhookResult = await sendWebhook(order);
  } catch (error) {
    webhookResult = { sent: false, reason: error.message };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      orderId,
      status: order.status,
      storage: storageResult,
      webhook: webhookResult
    }
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, message: 'Method not allowed' });
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const result = await processOrder(data);
    return json(result.statusCode, result.body);
  } catch (error) {
    return json(500, {
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

exports.processOrder = processOrder;
