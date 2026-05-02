const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const createNetlifyEvent = (req) => ({
  httpMethod: req.method,
  path: req.path,
  queryStringParameters: req.query || {},
  headers: req.headers,
  body: req.body ? JSON.stringify(req.body) : null
});

const sendNetlifyResponse = (res, result) => {
  const body = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
  res.status(result.statusCode).set(result.headers || {}).send(body);
};

const functions = {
  'create-order': require('./netlify/functions/create-order'),
  'create-razorpay-order': require('./netlify/functions/create-razorpay-order'),
  'verify-payment': require('./netlify/functions/verify-payment'),
  'get-order': require('./netlify/functions/get-order')
};

app.all('/.netlify/functions/:name', async (req, res) => {
  const fn = functions[req.params.name];
  if (!fn) {
    return res.status(404).json({ success: false, message: 'Function not found' });
  }
  try {
    const event = createNetlifyEvent(req);
    const result = await fn.handler(event);
    sendNetlifyResponse(res, result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
