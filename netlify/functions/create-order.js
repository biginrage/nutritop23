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

async function saveToAirtable(order) {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME = 'Orders' } = process.env;
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { saved: false, reason: 'Airtable env vars missing' };
  }

  const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      records: [{
        fields: {
          OrderId: order.orderId,
          Name: order.name,
          Phone: order.phone,
          Address: order.address,
          Product: order.product,
          Payment: order.payment,
          Status: order.status,
          CreatedAt: order.createdAt,
          RazorpayOrderId: order.razorpayOrderId || '',
          RazorpayPaymentId: order.razorpayPaymentId || '',
          CouponCode: order.couponCode || ''
        }
      }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable save failed: ${response.status} ${text}`);
  }

  return { saved: true };
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

  const storageResult = await saveToAirtable(order);

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

module.exports = { processOrder };
