const PRODUCT_PRICES = {
  'Trial Pack - ₹99': 9900,
  '3 Pack Combo - ₹249': 24900,
  'Mega Pack - ₹399': 39900
};

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
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return json(500, { success: false, message: 'Razorpay keys are missing' });
    }

    const payload = JSON.parse(event.body || '{}');
    const product = sanitize(payload.product);
    const amount = PRODUCT_PRICES[product];

    if (!amount) {
      return json(400, { success: false, message: 'Invalid product' });
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const receipt = `nt_${Date.now()}`;

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount, currency: 'INR', receipt })
    });

    const data = await response.json();
    if (!response.ok) {
      return json(500, { success: false, message: data.error?.description || 'Failed to create Razorpay order' });
    }

    return json(200, {
      success: true,
      keyId: RAZORPAY_KEY_ID,
      razorpayOrderId: data.id,
      amount: data.amount,
      currency: data.currency
    });
  } catch (error) {
    return json(500, { success: false, message: 'Failed to create Razorpay order', error: error.message });
  }
};
