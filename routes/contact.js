const router  = require('express').Router();
const Message = require('../models/Message');

// POST /api/contact — save contact form submission to DB
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, category, residence, skills, institution, isUrgent } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    const newMessage = await Message.create({
      name:        name.trim(),
      email:       email.trim(),
      phone:       phone ? phone.trim() : '',
      subject:     subject ? subject.trim() : '',
      message:     message.trim(),
      category:    category || 'General Inquiry',
      residence:   residence ? residence.trim() : '',
      skills:      skills ? skills.trim() : '',
      institution: institution ? institution.trim() : '',
      isUrgent:    Boolean(isUrgent),
    });

    console.log(`\nNew contact received: ${name} <${email}> [${category || 'General Inquiry'}]`);
    res.json({ success: true, message: 'Message received. We will get back to you soon.', data: newMessage });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
