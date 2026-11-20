const router = require('express').Router();
const axios  = require('axios');

const MPESA_BASE = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const getMpesaToken = async () => {
  const key    = (process.env.MPESA_CONSUMER_KEY    || '').trim();
  const secret = (process.env.MPESA_CONSUMER_SECRET || '').trim();
  if (!key || !secret) throw new Error('M-Pesa credentials missing in environment variables.');
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const { data } = await axios.get(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
};

const formatPhone = (phone) => {
  let p = String(phone).replace(/[\s+]/g, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  else if (!p.startsWith('254')) p = '254' + p;
  return p;
};

// POST /api/donate/mpesa
router.post('/mpesa', async (req, res) => {
  try {
    const { amount, phone } = req.body;
    if (!amount || !phone) {
      return res.status(400).json({ success: false, message: 'Amount and phone number are required.' });
    }

    const parsedAmount = Math.round(Number(amount));
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      return res.status(400).json({ success: false, message: 'Please enter a valid donation amount.' });
    }

    const formattedPhone = formatPhone(phone);
    if (!/^254[71]\d{8}$/.test(formattedPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid Safaricom phone number.' });
    }

    const shortCode       = (process.env.MPESA_SHORTCODE       || '').trim();
    const passKey         = (process.env.MPESA_PASSKEY         || '').trim();
    const callbackUrl     = (process.env.MPESA_CALLBACK_URL    || '').trim();
    const transactionType =  process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline';
    const partyB          = (process.env.MPESA_PARTY_B         || shortCode).trim();

    if (!shortCode || !passKey) {
      return res.status(500).json({ success: false, message: 'M-Pesa gateway not configured on server.' });
    }

    const token     = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password  = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');

    const { data } = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortCode,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   transactionType,
        Amount:            parsedAmount,
        PartyA:            formattedPhone,
        PartyB:            partyB,
        PhoneNumber:       formattedPhone,
        CallBackURL:       callbackUrl || 'https://example.com/api/donate/callback',
        AccountReference:  process.env.MPESA_ACCOUNT_REF || 'KEMT Ministries',
        TransactionDesc:   'Support KEMT Ministries',
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`M-Pesa STK Push | KES ${parsedAmount} | ${formattedPhone}`);
    res.json({ success: true, data });
  } catch (err) {
    const mpesaErr = err.response?.data;
    console.error('M-Pesa error:', mpesaErr || err.message);
    res.status(500).json({
      success: false,
      message: mpesaErr?.errorMessage || mpesaErr?.ResponseDescription || err.message || 'Payment initiation failed.',
    });
  }
});

// POST /api/donate/callback — M-Pesa callback
router.post('/callback', (req, res) => {
  const cb = req.body?.Body?.stkCallback;
  if (cb) {
    const { ResultCode, ResultDesc, CallbackMetadata } = cb;
    if (ResultCode === 0) {
      const meta = CallbackMetadata?.Item || [];
      const get  = (name) => meta.find(i => i.Name === name)?.Value;
      console.log(`Payment OK | KES ${get('Amount')} | Receipt: ${get('MpesaReceiptNumber')} | ${get('PhoneNumber')}`);
    } else {
      console.log(`Payment failed: ${ResultDesc}`);
    }
  }
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

module.exports = router;
