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

async function fetchFromAirtable(query) {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME = 'Orders' } = process.env;
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return null;
  }

  const filterFormula = query.orderId
    ? `{OrderId}='${query.orderId.replace(/'/g, "\\'")}'`
    : `{Phone}='${query.phone.replace(/'/g, "\\'")}'`;

  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.set('sort[0][field]', 'CreatedAt');
  url.searchParams.set('sort[0][direction]', 'desc');
  url.searchParams.set('filterByFormula', filterFormula);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
  });

  if (!response.ok) {
    throw new Error(`Airtable fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  const row = payload.records?.[0]?.fields;
  if (!row) return null;

  return {
    orderId: row.OrderId,
    phone: row.Phone,
    product: row.Product,
    payment: row.Payment,
    couponCode: row.CouponCode || '',
    status: row.Status,
    createdAt: row.CreatedAt
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { success: false, message: 'Method not allowed' });
  }

  try {
    const params = event.queryStringParameters || {};
    const orderId = sanitize(params.orderId || '');
    const phone = sanitize(params.phone || '');

    if (!orderId && !phone) {
      return json(400, { success: false, message: 'Pass orderId or phone' });
    }

    const order = await fetchFromAirtable({ orderId, phone });

    if (!order) {
      return json(404, { success: false, message: 'Order not found' });
    }

    return json(200, { success: true, order });
  } catch (error) {
    return json(500, { success: false, message: 'Failed to fetch order', error: error.message });
  }
};
