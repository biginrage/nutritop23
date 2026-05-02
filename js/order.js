const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScitYhW6eHwJLcmTkhyiIidhXxFJw2wx9qG7SEP2CgtyDZ_lw/formResponse";

function sendOrder(d) {
  const f = new FormData();
  f.append("entry.1213099713", d.name);
  f.append("entry.1032424383", d.phone);
  f.append("entry.1941968398", d.product);
  f.append("entry.271094336", d.amount);
  f.append("entry.1465330029", d.influencer || "");
  f.append("entry.1605987054", d.coupon || "");
  f.append("entry.1143804846", d.packaging || "");
  fetch(FORM_URL, { method: "POST", body: f, mode: "no-cors" });
}

(() => {
  const form = document.getElementById('orderForm');
  if (!form) return;

  const payNowBtn = document.getElementById('payNowBtn');
  const codBtn = document.getElementById('codBtn');
  const successBox = document.getElementById('successMsg');
  const successText = document.getElementById('successText');
  const successOrderId = document.getElementById('successOrderId');
  const copyOrderIdBtn = document.getElementById('copyOrderIdBtn');
  const statusEl = document.getElementById('formStatus');
  const productCards = document.querySelectorAll('.product-card');
  const selectedProductInput = document.getElementById('selectedProduct');

  const PRODUCT_PRICES = {
    'Trial Pack - ₹99': 9900,
    '3 Pack Combo - ₹249': 24900,
    'Mega Pack - ₹399': 39900
  };

  const PRODUCT_AMOUNTS = {
    'Trial Pack - ₹99': 99,
    '3 Pack Combo - ₹249': 249,
    'Mega Pack - ₹399': 399
  };

  const setLoading = (isLoading, button, text) => {
    payNowBtn.disabled = isLoading;
    codBtn.disabled = isLoading;
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = text;
      statusEl.textContent = 'Processing your order...';
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
    }
  };

  const selectProductCard = (card) => {
    productCards.forEach((el) => {
      el.classList.remove('selected');
      el.setAttribute('aria-pressed', 'false');
    });
    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');
    selectedProductInput.value = card.dataset.product;
    const helper = card.dataset.helper || '';
    statusEl.textContent = helper || 'Choose payment method to place your order.';
  };

  productCards.forEach((card) => {
    card.addEventListener('click', () => selectProductCard(card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectProductCard(card);
      }
    });
  });

  const getFormData = () => {
    const name = document.getElementById('oName').value.trim();
    const phone = document.getElementById('oPhone').value.trim();
    const address = document.getElementById('oAddress').value.trim();
    const couponCode = document.getElementById('oCouponCode').value.trim().toUpperCase();
    const product = selectedProductInput.value;
    if (!name || !phone || !address || !product) throw new Error('Please fill all fields and select a pack.');
    if (!/^\d{10}$/.test(phone)) throw new Error('Phone number must be 10 digits.');
    return { name, phone, address, product, couponCode };
  };

  const postJson = async (url, payload) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Request failed');
    return data;
  };

  const showSuccess = (message, orderId) => {
    form.style.display = 'none';
    successBox.style.display = 'block';
    successText.textContent = message;
    successOrderId.textContent = orderId || '-';
    statusEl.textContent = '';
  };

  copyOrderIdBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(successOrderId.textContent.trim());
      copyOrderIdBtn.textContent = 'Copied';
      setTimeout(() => { copyOrderIdBtn.textContent = 'Copy ID'; }, 1000);
    } catch (_) {
      copyOrderIdBtn.textContent = 'Copy failed';
    }
  });

  payNowBtn.addEventListener('click', async () => {
    try {
      const input = getFormData();
      if (!PRODUCT_PRICES[input.product]) throw new Error('Invalid product selected');
      if (!window.Razorpay) throw new Error('Payment SDK failed to load.');
      setLoading(true, payNowBtn, 'Opening payment...');
      const rzOrder = await postJson('/.netlify/functions/create-razorpay-order', {
        product: input.product
      });
      const razorpay = new window.Razorpay({
        key: rzOrder.keyId,
        order_id: rzOrder.razorpayOrderId,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        name: 'Nutritop',
        description: input.product,
        prefill: { name: input.name, contact: input.phone },
        theme: { color: '#1A6B3C' },
        handler: async (paymentResult) => {
          try {
            setLoading(true, payNowBtn, 'Verifying payment...');
            const verifiedOrder = await postJson('/.netlify/functions/verify-payment', {
              ...paymentResult,
              ...input
            });
            sendOrder({
              name: input.name,
              phone: input.phone,
              product: input.product,
              amount: PRODUCT_AMOUNTS[input.product],
              coupon: input.couponCode,
              influencer: input.couponCode,
              packaging: input.product
            });
            showSuccess('Payment successful and order confirmed.', verifiedOrder.orderId);
          } catch (error) {
            statusEl.textContent = error.message;
          } finally {
            setLoading(false, payNowBtn, 'Buy Now');
          }
        },
        modal: {
          ondismiss: () => {
            statusEl.textContent = 'Payment cancelled. You can retry or choose COD.';
          }
        }
      });
      razorpay.on('payment.failed', () => {
        statusEl.textContent = 'Payment failed. No order was created. Please retry or choose COD.';
      });
      razorpay.open();
      setLoading(false, payNowBtn, 'Buy Now');
    } catch (error) {
      statusEl.textContent = error.message;
      setLoading(false, payNowBtn, 'Buy Now');
    }
  });

  codBtn.addEventListener('click', async () => {
    try {
      const input = getFormData();
      setLoading(true, codBtn, 'Placing COD order...');
      const response = await postJson('/.netlify/functions/create-order', {
        ...input,
        paymentType: 'COD'
      });
      sendOrder({
        name: input.name,
        phone: input.phone,
        product: input.product,
        amount: PRODUCT_AMOUNTS[input.product],
        coupon: input.couponCode,
        influencer: input.couponCode,
        packaging: input.product
      });
      showSuccess('COD order confirmed.', response.orderId);
    } catch (error) {
      statusEl.textContent = error.message;
    } finally {
      setLoading(false, codBtn, 'Cash on Delivery');
    }
  });
})();
