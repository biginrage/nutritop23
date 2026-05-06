exports.handler = async () => {
  const vars = {
    AIRTABLE_API_KEY: !!process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: !!process.env.AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME || '(not set — defaults to "Orders")',
    RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
    MAKE_WEBHOOK_URL: !!process.env.MAKE_WEBHOOK_URL
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true, vars }, null, 2)
  };
};
