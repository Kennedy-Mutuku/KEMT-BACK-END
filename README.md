# KEMT Backend API

> **Kingdom Enlightenment Missions Team (KEMT)** — Production-ready REST API backend built with Node.js & Express.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM modules) |
| Framework | Express.js v4 |
| Storage | File-based JSON (no database required) |
| Auth | bcrypt password hashing |
| Security | Helmet, CORS, XSS sanitization |
| Email | Nodemailer (SMTP) |
| File Uploads | Multer |

---

## ⚙️ Setup & Running

### 1. Clone & Install

```bash
git clone https://github.com/Kennedy-Mutuku/KEMT-BACK-END.git
cd KEMT-BACK-END
npm install
```

### 2. Configure Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=5000
CONTACT_EMAIL=info@kingdomenlightenment.org

# Optional — SMTP for live email delivery
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
SMTP_FROM=your@email.com

# Optional — override default admin password hash
ADMIN_PASSWORD_HASH=<bcrypt hash>
```

> **Note:** If SMTP is not configured, contact form submissions are still saved to the admin dashboard. Email delivery is simply skipped.

### 3. Run

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5000` (or the port you configured).

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Admin login (returns token) |

**Login body:**
```json
{ "email": "admin@kemt.org", "password": "KEMTkemt" }
```

---

### Contact Form

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/contact` | Submit a contact/inquiry form |

**Body fields:** `name`, `email`, `subject`, `message`, `category`, `phone`, `residence`, `skills`, `institution`, `isUrgent`

Categories: `General Inquiry`, `Volunteering`, `Bible Study`, `Partnership`, `Prayer Request`

---

### Messages (Admin Portal)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/messages` | List all messages (filter: `?category=Bible Study`) |
| `PATCH` | `/api/messages/:id/read` | Mark message as read/unread |
| `PATCH` | `/api/messages/:id/allocate` | Assign to Bible Study group & team leader |
| `DELETE` | `/api/messages/:id` | Delete a single message |
| `DELETE` | `/api/messages` | Delete all messages |

---

### Events

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/events` | List all events |
| `POST` | `/api/events` | Create event (multipart: `title`, `date`, `location`, `description`, `poster`) |
| `PUT` | `/api/events/:id` | Update an event |
| `DELETE` | `/api/events/:id` | Delete an event |

---

### Ministry Teams

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/teams` | List all team members (filter: `?department=Media`) |
| `POST` | `/api/teams` | Add a team member |
| `DELETE` | `/api/teams/:id` | Remove a team member |

---

### Bible Study Groups

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bible-groups` | List all saved Bible study groups |
| `POST` | `/api/bible-groups/arrange` | Auto-arrange Bible Study submissions into balanced groups |
| `POST` | `/api/bible-groups` | Save manually edited groups |
| `DELETE` | `/api/bible-groups/:id` | Delete a specific group |

---

### Admin Stats & Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Total events, messages, unread count |
| `GET` | `/api/profile` | Admin profile info |

---

### Static Files

Event poster images are served at:
```
GET /uploads/<filename>
```

---

## 📁 Data Storage

All data is stored as JSON files in the `data/` directory (auto-created on first run):

```
data/
  events.json       — ministry events
  messages.json     — contact form submissions
  teams.json        — ministry team members
  bible_groups.json — Bible study group arrangements
```

Uploaded poster images are stored in `uploads/` (auto-created).

Both `data/` and `uploads/` are excluded from git (only `.gitkeep` placeholders are tracked).

---

## 🔐 Security

- **Helmet** sets secure HTTP response headers
- **bcrypt** (10 rounds) for admin password hashing
- **XSS sanitizer** on all user inputs
- **CORS** enabled for cross-origin frontend requests

---

## 🤝 Contributing

1. Fork or clone this repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: your feature description"`
4. Push and open a PR to `main`

---

*Built with ❤️ for Kingdom Enlightenment Missions Team*
