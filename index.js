const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kingdom_enlightenment')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// ─────────────────────────────────────────────
//  ROOT
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Kingdom Enlightenment Missions Team Backend is running!');
});

// ─────────────────────────────────────────────
//  CONTACT FORM
// ─────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    // Log the message (extend here to send email via Nodemailer/SendGrid)
    console.log(`\n📩 New Contact Message\nFrom: ${name} <${email}>\nSubject: ${subject}\nMessage: ${message}\n`);
    res.json({ success: true, message: 'Message received. We will get back to you soon.' });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────
//  M-PESA HELPERS
// ─────────────────────────────────────────────
const MPESA_BASE = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const getMpesaToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const { data } = await axios.get(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
};

const formatPhone = (phone) => {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+254')) return cleaned.slice(1);
  if (cleaned.startsWith('254'))  return cleaned;
  if (cleaned.startsWith('0'))    return `254${cleaned.slice(1)}`;
  return cleaned;
};

// ─────────────────────────────────────────────
//  M-PESA STK PUSH  — POST /api/donate/mpesa
// ─────────────────────────────────────────────
app.post('/api/donate/mpesa', async (req, res) => {
  try {
    const { amount, phone } = req.body;

    if (!amount || !phone) {
      return res.status(400).json({ success: false, message: 'Amount and phone number are required.' });
    }

    const token     = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password  = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const { data } = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            parseInt(amount),
        PartyA:            formatPhone(phone),
        PartyB:            process.env.MPESA_SHORTCODE,
        PhoneNumber:       formatPhone(phone),
        CallBackURL:       process.env.MPESA_CALLBACK_URL,
        AccountReference:  'KEMT Ministries',
        TransactionDesc:   'Support KEMT Ministries',
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`\n💰 M-Pesa STK Push sent | Amount: KES ${amount} | Phone: ${formatPhone(phone)}`);
    res.json({ success: true, data });

  } catch (err) {
    const mpesaErr = err.response?.data;
    console.error('M-Pesa STK Push error:', mpesaErr || err.message);
    res.status(500).json({
      success: false,
      message: mpesaErr?.errorMessage || 'Payment initiation failed. Please try again.',
    });
  }
});

// ─────────────────────────────────────────────
//  M-PESA CALLBACK  — POST /api/donate/callback
// ─────────────────────────────────────────────
app.post('/api/donate/callback', (req, res) => {
  const callback = req.body?.Body?.stkCallback;
  if (callback) {
    const { ResultCode, ResultDesc, CallbackMetadata } = callback;
    if (ResultCode === 0) {
      const meta = CallbackMetadata?.Item || [];
      const get  = (name) => meta.find(i => i.Name === name)?.Value;
      console.log(`\n✅ Payment Successful`);
      console.log(`   Amount:  KES ${get('Amount')}`);
      console.log(`   Receipt: ${get('MpesaReceiptNumber')}`);
      console.log(`   Phone:   ${get('PhoneNumber')}`);
    } else {
      console.log(`\n❌ Payment Failed: ${ResultDesc}`);
    }
  }
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`   M-Pesa environment: ${process.env.MPESA_ENV || 'sandbox'}`);
});
