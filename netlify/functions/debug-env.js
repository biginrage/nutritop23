exports.handler = async () => {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Orders';

  const vars = {
    AIRTABLE_API_KEY: !!AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: AIRTABLE_BASE_ID || '(not set)',
    AIRTABLE_TABLE_NAME,
    RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
    MAKE_WEBHOOK_URL: !!process.env.MAKE_WEBHOOK_URL
  };

  let airtableTest = null;
  if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
    try {
      const res = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?maxRecords=1`,
        { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } }
      );
      const body = await res.json();
      if (res.ok) {
        airtableTest = { success: true, message: 'Connected to Airtable Orders table OK' };
      } else {
        airtableTest = { success: false, status: res.status, error: body.error };
      }
    } catch (e) {
      airtableTest = { success: false, error: e.message };
    }
  } else {
    airtableTest = { success: false, error: 'Missing API key or Base ID' };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true, vars, airtableTest }, null, 2)
  };
};
