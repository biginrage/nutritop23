# NUTRITOP – Static Landing Page with Serverless Functions

## Overview
A product landing page for NUTRITOP, a premium dry fruit, nut & seed breakfast topping. The site includes an order form with Razorpay (online payment) and COD support, integrated with Airtable for order storage and Make.com webhooks.

## Architecture
- **Frontend**: Single static HTML file (`index.html`) with embedded CSS and a separate JS file (`js/order.js`)
- **Backend**: Express.js server (`server.js`) that:
  - Serves all static assets on port 5000 (host: 0.0.0.0)
  - Proxies Netlify-style serverless functions at `/.netlify/functions/:name`

## Netlify Functions (served locally via Express)
Located in `netlify/functions/`:
- `create-order.js` — Creates COD or verified PAID orders, saves to Airtable, triggers Make webhook
- `create-razorpay-order.js` — Creates a Razorpay order for online payment
- `verify-payment.js` — Verifies Razorpay payment signature, then calls `create-order`
- `get-order.js` — Fetches an order by orderId or phone from Airtable

## Environment Variables Required
- `RAZORPAY_KEY_ID` — Razorpay public key
- `RAZORPAY_KEY_SECRET` — Razorpay secret key
- `AIRTABLE_API_KEY` — Airtable personal access token
- `AIRTABLE_BASE_ID` — Airtable base ID
- `AIRTABLE_TABLE_NAME` — Airtable table name (default: "Orders")
- `MAKE_WEBHOOK_URL` — Make.com webhook URL for order notifications

## Running
- Workflow: `Start application` → `node server.js` on port 5000
- Deployment: autoscale, run `node server.js`

## Key Files
- `index.html` — Full landing page (1302 lines, CSS + HTML)
- `js/order.js` — Order form logic
- `server.js` — Express server + function proxy
- `netlify/functions/` — Serverless function handlers
- `images/` — Product images (logo, bowl, product-pack, ad images)
- `track.html` — Order tracking page
