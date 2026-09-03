import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Headers Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());

// XSS Sanitizer helper
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Admin Password Hash (bcrypt with 10 rounds)
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('KEMTkemt', 10);

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const eventsFilePath = path.join(dataDir, 'events.json');
const messagesFilePath = path.join(dataDir, 'messages.json');
const teamsFilePath = path.join(dataDir, 'teams.json');
const bibleGroupsFilePath = path.join(dataDir, 'bible_groups.json');

// --- EVENTS HELPERS ---
const getEvents = () => {
  if (!fs.existsSync(eventsFilePath)) {
    const initial = [
      {
        _id: 'event-1',
        title: 'Kingdom Outreach Revival & Leadership Conference',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Methodist Church Grounds, Meru Central',
        description: 'A powerful gathering of believers, youths and community leaders for spiritual renewal, prayer vigils and missionary training.',
        posterUrl: '',
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(eventsFilePath, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(eventsFilePath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading events:', err);
    return [];
  }
};

const saveEvents = (events) => {
  fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2));
};

// --- MESSAGES HELPERS ---
const getMessages = () => {
  if (!fs.existsSync(messagesFilePath)) {
    const initial = [
      {
        _id: 'msg-sample-1',
        name: 'Pastor Peter Mwangi',
        email: 'petermwangi@example.com',
        subject: 'Partnership in upcoming Machakos Mission',
        message: 'Calvary greetings! We would love to collaborate with KEMT in hosting the youth mission and distributing Bibles to local secondary schools.',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    fs.writeFileSync(messagesFilePath, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(messagesFilePath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading messages:', err);
    return [];
  }
};

const saveMessages = (messages) => {
  fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2));
};

app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration for event posters
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'poster-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Email Transporter for Contact Messages
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

// --- AUTH ROUTE ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Secure bcrypt password verification
  if (password && typeof password === 'string' && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.json({
      success: true,
      token: 'kemt_token_' + Date.now(),
      user: {
        name: 'KEMT Administrator',
        email: email ? sanitize(email) : 'info@kingdomenlightenment.org',
        role: 'Super Admin',
        profileImageUrl: '/kemt-favicon.jpg'
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials. Please verify your email and password.'
  });
});

// --- PROFILE ROUTE ---
app.get('/api/profile', (req, res) => {
  res.json({
    name: 'KEMT Administrator',
    email: 'info@kingdomenlightenment.org',
    role: 'Super Admin',
    profileImageUrl: '/kemt-favicon.jpg'
  });
});

// --- ADMIN STATS ROUTE ---
app.get('/api/admin/stats', (req, res) => {
  const events = getEvents();
  const messages = getMessages();
  const unreadMessages = messages.filter(m => !m.isRead).length;

  res.json({
    totalEvents: events.length,
    totalMessages: messages.length,
    unreadMessages: unreadMessages
  });
});

// --- CONTACT FORM ROUTE (Saves to DB and forwards to Team Email) ---
app.post('/api/contact', async (req, res) => {
  const { 
    name, 
    email, 
    subject, 
    message, 
    category = 'General Inquiry',
    phone = '',
    residence = '',
    skills = '',
    institution = '',
    isUrgent = false
  } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and message are required.'
    });
  }

  // 1. Save message persistently for the Admin Dashboard
  const messages = getMessages();
  const newMessage = {
    _id: 'msg-' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : '',
    category: category.trim(),
    subject: (subject || category || 'General Inquiry').trim(),
    message: message.trim(),
    residence: residence ? residence.trim() : '',
    skills: skills ? skills.trim() : '',
    institution: institution ? institution.trim() : '',
    isUrgent: Boolean(isUrgent),
    allocation: null, // For Discipleship / Bible Study allocation
    isRead: false,
    createdAt: new Date().toISOString()
  };
  messages.unshift(newMessage);
  saveMessages(messages);

  const destinationEmail = process.env.CONTACT_EMAIL || 'info@kingdomenlightenment.org';
  console.log(`[Contact Form - ${newMessage.category}] Received message from "${name}" <${email}>: "${newMessage.subject}"`);

  // 2. Dispatch email to team
  try {
    const transporter = createTransporter();
    
    if (transporter) {
      await transporter.sendMail({
        from: `"${name}" <${process.env.SMTP_FROM || process.env.SMTP_USER || email}>`,
        replyTo: email,
        to: destinationEmail,
        subject: `[KEMT ${newMessage.category}] ${newMessage.subject}`,
        text: `You have received a new ${newMessage.category} from the KEMT Website:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nCategory: ${newMessage.category}\nResidence: ${residence || 'N/A'}\nSubject: ${newMessage.subject}\n\nMessage:\n${message}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background-color: #E87D1E; color: white; padding: 14px 18px; border-radius: 6px 6px 0 0;">
              <h2 style="margin: 0; font-size: 1.25rem;">Kingdom Enlightenment Missions Team</h2>
              <p style="margin: 4px 0 0; font-size: 0.9rem;">Department Inflow: <strong>${newMessage.category}</strong></p>
            </div>
            <div style="padding: 18px 0;">
              <p><strong>From:</strong> ${name} &lt;<a href="mailto:${email}">${email}</a>&gt;</p>
              ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
              ${residence ? `<p><strong>Residence/Area:</strong> ${residence}</p>` : ''}
              ${skills ? `<p><strong>Skills/Role:</strong> ${skills}</p>` : ''}
              ${institution ? `<p><strong>School/Institution:</strong> ${institution}</p>` : ''}
              <p><strong>Subject:</strong> ${newMessage.subject}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;" />
              <p><strong>Details:</strong></p>
              <div style="background: #f9f9f9; padding: 14px; border-left: 4px solid #E87D1E; border-radius: 4px; white-space: pre-wrap;">${message}</div>
            </div>
            <p style="font-size: 0.8rem; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
              Automatically dispatched from the KEMT Web Platform.
            </p>
          </div>
        `
      });
      console.log(`[Contact Form] Email successfully forwarded to ${destinationEmail}`);
    } else {
      console.log(`[Contact Form] SMTP not configured. Stored in dashboard and ready for delivery to ${destinationEmail}.`);
    }

    return res.json({
      success: true,
      message: `Your ${newMessage.category.toLowerCase()} has been sent successfully to ${destinationEmail} and recorded in the ministry portal!`,
      data: newMessage
    });
  } catch (err) {
    console.error('[Contact Form Error]:', err);
    return res.json({
      success: true,
      message: 'Your submission has been received and stored in the admin portal.',
      data: newMessage
    });
  }
});

// --- MESSAGES API (For Admin Portal) ---

// GET /api/messages - List all messages
app.get('/api/messages', (req, res) => {
  const { category } = req.query;
  const messages = getMessages();
  if (category && category !== 'all') {
    const filtered = messages.filter(m => (m.category || '').toLowerCase() === category.toLowerCase());
    return res.json(filtered);
  }
  res.json(messages);
});

// PATCH /api/messages/:id/allocate - Assign Discipleship group and team leader
app.patch('/api/messages/:id/allocate', (req, res) => {
  const { id } = req.params;
  const { groupName, teamLeader } = req.body;
  const messages = getMessages();
  const index = messages.findIndex(m => m._id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }

  messages[index].allocation = {
    groupName: groupName || 'General Bible Study',
    teamLeader: teamLeader || 'Unassigned',
    allocatedAt: new Date().toISOString()
  };
  saveMessages(messages);

  res.json({ success: true, message: messages[index] });
});

// PATCH /api/messages/:id/read - Mark message as read/unread
app.patch('/api/messages/:id/read', (req, res) => {
  const { id } = req.params;
  const { isRead } = req.body;
  const messages = getMessages();
  const index = messages.findIndex(m => m._id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }

  messages[index].isRead = isRead !== undefined ? isRead : true;
  saveMessages(messages);

  res.json({ success: true, message: messages[index] });
});

// DELETE /api/messages/:id - Delete a message
app.delete('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const messages = getMessages();
  const filtered = messages.filter(m => m._id !== id);

  if (messages.length === filtered.length) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }

  saveMessages(filtered);
  res.json({ success: true, message: 'Message deleted successfully.' });
});

// --- EVENTS CRUD ROUTES ---

// GET /api/events - List all upcoming events
app.get('/api/events', (req, res) => {
  const events = getEvents();
  res.json(events);
});

// POST /api/events - Create a new event
app.post('/api/events', upload.single('poster'), (req, res) => {
  const { title, date, location, description } = req.body;

  if (!title || !date || !location || !description) {
    return res.status(400).json({
      success: false,
      message: 'Title, date, location, and description are required.'
    });
  }

  const events = getEvents();
  const newEvent = {
    _id: 'event-' + Date.now(),
    title,
    date,
    location,
    description,
    posterUrl: req.file ? `uploads/${req.file.filename}` : '',
    createdAt: new Date().toISOString()
  };

  events.unshift(newEvent);
  saveEvents(events);

  res.status(201).json(newEvent);
});

// PUT /api/events/:id - Update an event
app.put('/api/events/:id', upload.single('poster'), (req, res) => {
  const { id } = req.params;
  const { title, date, location, description } = req.body;

  const events = getEvents();
  const index = events.findIndex(e => e._id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }

  const existing = events[index];
  const updatedEvent = {
    ...existing,
    title: title || existing.title,
    date: date || existing.date,
    location: location || existing.location,
    description: description || existing.description,
    posterUrl: req.file ? `uploads/${req.file.filename}` : existing.posterUrl,
    updatedAt: new Date().toISOString()
  };

  events[index] = updatedEvent;
  saveEvents(events);

  res.json(updatedEvent);
});

// DELETE /api/events/:id - Delete an event
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const events = getEvents();
  const filtered = events.filter(e => e._id !== id);

  if (events.length === filtered.length) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }

  saveEvents(filtered);
  res.json({ success: true, message: 'Event deleted successfully.' });
});

// --- INITIAL MINISTRY TEAMS SEED DATA ---
const INITIAL_TEAMS = [
  {
    _id: 'team-lead-media',
    name: 'Kennedy Mutuku',
    email: 'kennedymutuku@kingdomenlightenment.org',
    phone: '+254 714 476 295',
    department: 'Media & Tech',
    role: 'Media Director & Tech Lead',
    skills: 'Livestream, Video Editing, Infrastructure',
    joinedAt: new Date().toISOString()
  },
  {
    _id: 'team-lead-prayer',
    name: 'Raymond Ewoi',
    email: 'raymondewoi@kingdomenlightenment.org',
    phone: '+254 714 476 295',
    department: 'Prayer Intercession',
    role: 'Prayer Coordinator',
    skills: 'Intercession, Vigils, Fasting Coordinator',
    joinedAt: new Date().toISOString()
  },
  {
    _id: 'team-lead-worship',
    name: 'Victor Muriungi',
    email: 'victormuriungi@kingdomenlightenment.org',
    phone: '+254 714 476 295',
    department: 'Praise & Worship',
    role: 'Worship Coordinator',
    skills: 'Music Direction, Keyboard, Vocal Ministry',
    joinedAt: new Date().toISOString()
  },
  {
    _id: 'team-lead-outreach',
    name: 'Mwanzia David',
    email: 'mwanziadavid@kingdomenlightenment.org',
    phone: '+254 714 476 295',
    department: 'Outreach',
    role: 'Outreach Incharge',
    skills: 'Rural Missions, Evangelism, Crusade Planning',
    joinedAt: new Date().toISOString()
  },
  {
    _id: 'team-lead-discipleship',
    name: 'Morice Mutharimi',
    email: 'moricemutharimi@kingdomenlightenment.org',
    phone: '+254 714 476 295',
    department: 'Bible Study',
    role: 'Chairperson & Teaching Lead',
    skills: 'Bible Exegesis, Small Group Mentorship',
    joinedAt: new Date().toISOString()
  },
  {
    _id: 'team-lead-highschool',
    name: 'Vincent Mwendwa',
    email: 'vincentmwendwa@kingdomenlightenment.org',
    phone: '+254 714 476 295',
    department: 'High School',
    role: 'Director & Speaker',
    skills: 'School Weekend Challenges, Student Empowerment',
    joinedAt: new Date().toISOString()
  },
  {
    _id: 'team-lead-secretary',
    name: 'Everylne Mukami',
    email: 'everylnemukami@kingdomenlightenment.org',
    phone: '+254 714 476 295',
    department: 'Secretariat & Welfare',
    role: 'Secretary',
    skills: 'Administration, Compassion Coordination',
    joinedAt: new Date().toISOString()
  }
];

// --- TEAMS HELPERS ---
const getTeams = () => {
  if (!fs.existsSync(teamsFilePath)) {
    fs.writeFileSync(teamsFilePath, JSON.stringify(INITIAL_TEAMS, null, 2));
    return INITIAL_TEAMS;
  }
  try {
    const raw = fs.readFileSync(teamsFilePath, 'utf-8');
    const parsed = JSON.parse(raw || '[]');
    if (parsed.length === 0) {
      fs.writeFileSync(teamsFilePath, JSON.stringify(INITIAL_TEAMS, null, 2));
      return INITIAL_TEAMS;
    }
    return parsed;
  } catch {
    return INITIAL_TEAMS;
  }
};
const saveTeams = (data) => fs.writeFileSync(teamsFilePath, JSON.stringify(data, null, 2));

// --- BIBLE GROUPS HELPERS ---
const getBibleGroups = () => {
  if (!fs.existsSync(bibleGroupsFilePath)) {
    fs.writeFileSync(bibleGroupsFilePath, JSON.stringify([], null, 2));
    return [];
  }
  try { return JSON.parse(fs.readFileSync(bibleGroupsFilePath, 'utf-8') || '[]'); } catch { return []; }
};
const saveBibleGroups = (data) => fs.writeFileSync(bibleGroupsFilePath, JSON.stringify(data, null, 2));

// ── LEADERSHIP members (act as "experienced" — spread across groups)
const LEADERSHIP_EMAILS = [
  'vincentmwendwa@kingdomenlightenment.org',
  'everylnemukami@kingdomenlightenment.org',
  'raymondewoi@kingdomenlightenment.org',
  'kennedymutuku@kingdomenlightenment.org',
];

// Smart grouping: max 5 per group, mix residences, spread leadership
function autoArrangeGroups(members) {
  const MAX = 5;
  const shuffled = [...members].sort(() => Math.random() - 0.5);
  const leaders = shuffled.filter(m => LEADERSHIP_EMAILS.includes(m.email));
  const others  = shuffled.filter(m => !LEADERSHIP_EMAILS.includes(m.email));
  const total   = shuffled.length;
  const numGroups = Math.max(1, Math.ceil(total / MAX));
  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: `bg-${Date.now()}-${i}`,
    name: `Study Group ${i + 1}`,
    members: [],
    createdAt: new Date().toISOString(),
  }));

  // Distribute leaders one per group first
  leaders.forEach((leader, i) => {
    groups[i % numGroups].members.push(leader);
  });

  // Fill remaining slots — rotate through groups while avoiding same residence
  let gi = 0;
  for (const member of others) {
    // Find next group that doesn't already have someone from same residence
    let attempts = 0;
    while (attempts < numGroups) {
      const g = groups[gi % numGroups];
      const sameRes = member.residence && g.members.some(m => m.residence === member.residence);
      const full = g.members.length >= MAX;
      if (!full && !sameRes) {
        g.members.push(member);
        gi++;
        break;
      }
      gi++;
      attempts++;
    }
    // Fallback: put anywhere there's space
    if (attempts >= numGroups) {
      const g = groups.find(g => g.members.length < MAX) || groups[0];
      g.members.push(member);
    }
  }

  return groups.filter(g => g.members.length > 0);
}

// DELETE /api/messages - Delete ALL messages
app.delete('/api/messages', (req, res) => {
  saveMessages([]);
  res.json({ success: true, message: 'All messages deleted.' });
});

// ── MINISTRY TEAMS ROUTES ──────────────────────────────────────────────────

// GET /api/teams - List all team members
app.get('/api/teams', (req, res) => {
  const { department } = req.query;
  const teams = getTeams();
  if (department && department !== 'all') {
    return res.json(teams.filter(m => (m.department || '').toLowerCase() === department.toLowerCase()));
  }
  res.json(teams);
});

// POST /api/teams - Add a member to a ministry team
app.post('/api/teams', (req, res) => {
  const { name, email, phone, skills, department = 'Media & Tech', role = 'Volunteer Member', messageId } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required.' });

  const teams = getTeams();
  if (teams.find(m => m.email === email && m.department === department)) {
    return res.status(409).json({ success: false, message: `This person is already in the ${department} team.` });
  }

  const member = {
    _id: 'team-' + Date.now(),
    name: sanitize(name),
    email: sanitize(email),
    phone: phone ? sanitize(phone) : '',
    skills: skills ? sanitize(skills) : '',
    department: sanitize(department),
    role: sanitize(role),
    messageId: messageId || null,
    joinedAt: new Date().toISOString(),
  };
  teams.push(member);
  saveTeams(teams);
  res.status(201).json({ success: true, member });
});

// DELETE /api/teams/:id - Remove a team member
app.delete('/api/teams/:id', (req, res) => {
  const teams = getTeams().filter(m => m._id !== req.params.id);
  saveTeams(teams);
  res.json({ success: true });
});

// ── BIBLE STUDY GROUPS ROUTES ─────────────────────────────────────────────

// GET /api/bible-groups - List all saved groups
app.get('/api/bible-groups', (req, res) => res.json(getBibleGroups()));

// POST /api/bible-groups/arrange - Auto-arrange Bible Study submissions into groups
app.post('/api/bible-groups/arrange', (req, res) => {
  // Gather all Bible Study category messages as candidate members
  const messages = getMessages();
  const candidates = messages
    .filter(m => m.category === 'Bible Study')
    .map(m => ({
      _id: m._id,
      name: m.name,
      email: m.email,
      phone: m.phone || '',
      residence: m.residence || '',
    }));

  if (candidates.length === 0) {
    return res.status(400).json({ success: false, message: 'No Bible Study submissions found to arrange.' });
  }

  const groups = autoArrangeGroups(candidates);
  saveBibleGroups(groups);
  res.json({ success: true, groups });
});

// POST /api/bible-groups - Save manually edited groups
app.post('/api/bible-groups', (req, res) => {
  const { groups } = req.body;
  if (!Array.isArray(groups)) return res.status(400).json({ success: false, message: 'groups must be an array.' });
  saveBibleGroups(groups);
  res.json({ success: true, groups });
});

// DELETE /api/bible-groups/:id - Delete a specific group
app.delete('/api/bible-groups/:id', (req, res) => {
  const groups = getBibleGroups().filter(g => g.id !== req.params.id);
  saveBibleGroups(groups);
  res.json({ success: true });
});

// Start Server
app.listen(PORT, () => {
  console.log(`KEMT Backend running on http://localhost:${PORT}`);
  console.log(`Target Contact Email: ${process.env.CONTACT_EMAIL || 'info@kingdomenlightenment.org'}`);
});
