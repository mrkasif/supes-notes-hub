const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'pdfs');
const DEMO_USERNAME = 'klabnotes';
const DEMO_PASSWORD = '123456';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRY_DAYS = 30;
const TOP_CONTRIBUTOR_EXPIRY_DAYS = 60;
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 20);
const JSON_LIMIT = process.env.JSON_LIMIT || '1mb';
const allowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: JSON_LIMIT }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

function sanitizeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '') || 'file';
}

function validateRequiredText(value, field, min = 3, max = 120) {
  const cleaned = String(value || '').trim();
  if (!cleaned) return `${field} is required`;
  if (cleaned.length < min) return `${field} must be at least ${min} characters`;
  if (cleaned.length > max) return `${field} must be at most ${max} characters`;
  return null;
}

async function readDb() {
  const raw = await fsp.readFile(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeDb(data) {
  await fsp.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function ensureCollections(db) {
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.notes)) db.notes = [];
  if (!Array.isArray(db.notifications)) db.notifications = [];
}

function calcBadge(points) {
  if (points >= 300) return 'Top 10%';
  if (points >= 180) return 'Gold Contributor';
  if (points >= 80) return 'Silver Contributor';
  return 'Bronze Contributor';
}

function isTopContributor(user) {
  return (user.points || 0) >= 180;
}

function computeExpiry(user, isVerified) {
  if (isVerified) return null;
  const days = isTopContributor(user) ? TOP_CONTRIBUTOR_EXPIRY_DAYS : DEFAULT_EXPIRY_DAYS;
  return Date.now() + days * DAY_MS;
}

function normalizeExistingExpiry(note) {
  if (note.expiresAt === null) return;
  if (typeof note.expiresAt === 'number') return;
  const baseTime = new Date(note.createdAt || Date.now()).getTime();
  note.expiresAt = baseTime + DEFAULT_EXPIRY_DAYS * DAY_MS;
}

function isExpired(note, nowMs = Date.now()) {
  return typeof note.expiresAt === 'number' && note.expiresAt <= nowMs;
}

function getActiveStatus(note, nowMs = Date.now()) {
  if (note.status === 'rejected') return 'rejected';
  if (isExpired(note, nowMs)) return 'expired';
  return note.status || 'pending';
}

function issueToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role || 'user',
    points: user.points || 0,
    badge: calcBadge(user.points || 0),
  };
}

async function ensureSeedUsers() {
  const db = await readDb();
  ensureCollections(db);

  const demo = db.users.find((u) => u.username.toLowerCase() === DEMO_USERNAME);
  if (!demo) {
    db.users.push({
      id: uuidv4(),
      username: DEMO_USERNAME,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      role: 'user',
      points: 0,
      banned: false,
      createdAt: new Date().toISOString(),
    });
  }

  const admin = db.users.find((u) => u.username.toLowerCase() === ADMIN_USERNAME);
  if (!admin) {
    db.users.push({
      id: uuidv4(),
      username: ADMIN_USERNAME,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: 'admin',
      points: 999,
      banned: false,
      createdAt: new Date().toISOString(),
    });
  }

  for (const user of db.users) {
    if (!user.role) user.role = 'user';
    if (typeof user.points !== 'number') user.points = 0;
    if (typeof user.banned !== 'boolean') user.banned = false;
  }

  for (const note of db.notes) {
    if (typeof note.status !== 'string') note.status = 'approved';
    if (typeof note.verified !== 'boolean') note.verified = false;
    if (typeof note.recommended !== 'boolean') note.recommended = false;
    if (typeof note.downloads !== 'number') note.downloads = 0;
    if (typeof note.views !== 'number') note.views = 0;
    if (typeof note.ratingSum !== 'number') note.ratingSum = 0;
    if (typeof note.ratingCount !== 'number') note.ratingCount = 0;
    normalizeExistingExpiry(note);
    note.status = getActiveStatus(note);
  }

  await writeDb(db);
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

function authOptional(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function addNotification(db, { userId, type, message }) {
  db.notifications.push({
    id: uuidv4(),
    userId,
    type,
    message,
    createdAt: new Date().toISOString(),
  });
  console.log(`[email-mock] user:${userId} type:${type} ${message}`);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username must be 3+ chars and password 6+ chars' });
  }

  const db = await readDb();
  const exists = db.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    username,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'user',
    points: 0,
    banned: false,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  await writeDb(db);

  const token = issueToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  const db = await readDb();
  const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  if (user.banned) {
    return res.status(403).json({ error: 'This account is banned' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = issueToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/notes', async (_req, res) => {
  const db = await readDb();
  ensureCollections(db);
  for (const note of db.notes) {
    normalizeExistingExpiry(note);
    note.status = getActiveStatus(note);
  }
  const authUser = authOptional(_req);
  const notes = db.notes
    .filter((n) => n.status === 'approved' || (authUser && n.ownerId === authUser.id && n.status !== 'expired'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  await writeDb(db);
  return res.json({ notes });
});

app.get('/api/analytics', async (_req, res) => {
  const db = await readDb();
  ensureCollections(db);
  for (const note of db.notes) {
    normalizeExistingExpiry(note);
    note.status = getActiveStatus(note);
  }
  const approved = db.notes.filter((n) => n.status === 'approved');
  const contributors = new Set(approved.map((n) => n.ownerId));
  const downloads = approved.reduce((sum, n) => sum + (n.downloads || 0), 0);
  return res.json({
    totalNotes: approved.length,
    totalDownloads: downloads,
    activeContributors: contributors.size,
  });
});

app.post('/api/notes/upload', authRequired, upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'PDF file is required' });
  }

  const title = (req.body.title || '').trim();
  const subject = (req.body.subject || '').trim();

  const titleError = validateRequiredText(title, 'Title');
  const subjectError = validateRequiredText(subject, 'Subject');
  if (titleError || subjectError) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: titleError || subjectError });
  }

  const db = await readDb();
  ensureCollections(db);
  for (const existingNote of db.notes) {
    normalizeExistingExpiry(existingNote);
    existingNote.status = getActiveStatus(existingNote);
  }
  const duplicate = db.notes.find(
    (n) =>
      n.status !== 'rejected' &&
      n.status !== 'expired' &&
      n.title.trim().toLowerCase() === title.toLowerCase() &&
      n.subject.trim().toLowerCase() === subject.toLowerCase()
  );
  if (duplicate) {
    fs.unlink(req.file.path, () => {});
    return res.status(409).json({
      error: 'Possible duplicate note exists',
      existingNotes: [duplicate],
    });
  }

  const note = {
    id: uuidv4(),
    title,
    subject,
    ownerId: req.user.id,
    ownerUsername: req.user.username,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    fileUrl: `/uploads/pdfs/${sanitizeName(path.parse(req.file.filename).name)}${path.extname(req.file.filename)}`,
    status: 'pending',
    verified: false,
    recommended: false,
    expiresAt: computeExpiry(db.users.find((u) => u.id === req.user.id) || { points: 0 }, false),
    downloads: 0,
    views: 0,
    ratingSum: 0,
    ratingCount: 0,
    createdAt: new Date().toISOString(),
  };

  const currentPath = req.file.path;
  const targetPath = path.join(UPLOAD_DIR, path.basename(note.fileUrl));
  await fsp.rename(currentPath, targetPath);

  db.notes.push(note);
  const owner = db.users.find((u) => u.id === req.user.id);
  if (owner) owner.points += 10;
  await addNotification(db, {
    userId: req.user.id,
    type: 'upload',
    message: `Uploaded "${note.title}" (+10 points)`,
  });
  await writeDb(db);

  return res.status(201).json({ note });
});

app.post('/api/notes/:id/view', async (req, res) => {
  const db = await readDb();
  ensureCollections(db);
  for (const n of db.notes) {
    normalizeExistingExpiry(n);
    n.status = getActiveStatus(n);
  }
  const note = db.notes.find((n) => n.id === req.params.id && n.status === 'approved');
  if (!note) return res.status(404).json({ error: 'Note not found' });
  note.views = (note.views || 0) + 1;
  await writeDb(db);
  return res.json({ ok: true, views: note.views });
});

app.post('/api/notes/:id/download', authRequired, async (req, res) => {
  const db = await readDb();
  ensureCollections(db);
  for (const n of db.notes) {
    normalizeExistingExpiry(n);
    n.status = getActiveStatus(n);
  }
  const note = db.notes.find((n) => n.id === req.params.id && n.status === 'approved');
  if (!note) return res.status(404).json({ error: 'Note not found' });
  note.downloads = (note.downloads || 0) + 1;
  const owner = db.users.find((u) => u.id === note.ownerId);
  if (owner && note.downloads % 10 === 0) owner.points += 1;
  if (owner) {
    await addNotification(db, {
      userId: owner.id,
      type: 'download',
      message: `"${note.title}" got a new download`,
    });
  }
  await writeDb(db);
  return res.json({ ok: true, downloads: note.downloads, fileUrl: note.fileUrl });
});

app.post('/api/notes/:id/rate', authRequired, async (req, res) => {
  const rating = Number(req.body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be 1 to 5' });
  }
  const db = await readDb();
  ensureCollections(db);
  for (const n of db.notes) {
    normalizeExistingExpiry(n);
    n.status = getActiveStatus(n);
  }
  const note = db.notes.find((n) => n.id === req.params.id && n.status === 'approved');
  if (!note) return res.status(404).json({ error: 'Note not found' });
  note.ratingSum = (note.ratingSum || 0) + rating;
  note.ratingCount = (note.ratingCount || 0) + 1;
  if (rating >= 4) {
    const owner = db.users.find((u) => u.id === note.ownerId);
    if (owner) owner.points += 5;
    if (owner) {
      await addNotification(db, {
        userId: owner.id,
        type: 'rating',
        message: `"${note.title}" received a ${rating}-star rating`,
      });
    }
  }
  await writeDb(db);
  return res.json({
    ok: true,
    rating: Number((note.ratingSum / note.ratingCount).toFixed(1)),
    ratingCount: note.ratingCount,
  });
});

app.get('/api/users/me/dashboard', authRequired, async (req, res) => {
  const db = await readDb();
  ensureCollections(db);
  for (const note of db.notes) {
    normalizeExistingExpiry(note);
    note.status = getActiveStatus(note);
  }
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user || user.banned) return res.status(403).json({ error: 'User unavailable' });
  const ownNotes = db.notes.filter((n) => n.ownerId === req.user.id);
  const totalUploads = ownNotes.length;
  const totalDownloads = ownNotes.reduce((sum, n) => sum + (n.downloads || 0), 0);
  const totalViews = ownNotes.reduce((sum, n) => sum + (n.views || 0), 0);
  const recentActivity = ownNotes
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map((n) => `${n.title} (${n.status})`);
  const notifications = db.notifications
    .filter((n) => n.userId === req.user.id)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  return res.json({
    user: sanitizeUser(user),
    stats: {
      totalUploads,
      totalDownloads,
      totalViews,
      reputation: user.points || 0,
      badge: calcBadge(user.points || 0),
      recentActivity,
    },
    notifications,
  });
});

app.get('/api/admin/pending', authRequired, adminRequired, async (_req, res) => {
  const db = await readDb();
  ensureCollections(db);
  for (const note of db.notes) {
    normalizeExistingExpiry(note);
    note.status = getActiveStatus(note);
  }
  await writeDb(db);
  return res.json({
    notes: db.notes.filter((n) => n.status === 'pending'),
    expired: db.notes.filter((n) => n.status === 'expired'),
  });
});

app.get('/api/admin/stats', authRequired, adminRequired, async (_req, res) => {
  const db = await readDb();
  ensureCollections(db);
  for (const note of db.notes) {
    normalizeExistingExpiry(note);
    note.status = getActiveStatus(note);
  }
  const pending = db.notes.filter((n) => n.status === 'pending').length;
  const approved = db.notes.filter((n) => n.status === 'approved').length;
  const rejected = db.notes.filter((n) => n.status === 'rejected').length;
  const expired = db.notes.filter((n) => n.status === 'expired').length;
  const bannedUsers = db.users.filter((u) => u.banned).length;
  return res.json({ pending, approved, rejected, expired, users: db.users.length, bannedUsers });
});

app.post('/api/admin/notes/:id/approve', authRequired, adminRequired, async (req, res) => {
  const db = await readDb();
  ensureCollections(db);
  const note = db.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  note.status = 'approved';
  if (note.verified) note.expiresAt = null;
  else note.expiresAt = computeExpiry(db.users.find((u) => u.id === note.ownerId) || { points: 0 }, false);
  await writeDb(db);
  return res.json({ ok: true, note });
});

app.post('/api/admin/notes/:id/reject', authRequired, adminRequired, async (req, res) => {
  const db = await readDb();
  ensureCollections(db);
  const note = db.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  note.status = 'rejected';
  await writeDb(db);
  return res.json({ ok: true, note });
});

app.post('/api/admin/notes/:id/verify', authRequired, adminRequired, async (req, res) => {
  const db = await readDb();
  ensureCollections(db);
  const note = db.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  note.verified = Boolean(req.body.verified);
  note.recommended = Boolean(req.body.recommended);
  note.expiresAt = note.verified ? null : computeExpiry(db.users.find((u) => u.id === note.ownerId) || { points: 0 }, false);
  note.status = getActiveStatus(note);
  await writeDb(db);
  return res.json({ ok: true, note });
});

app.post('/api/admin/users/:id/ban', authRequired, adminRequired, async (req, res) => {
  const db = await readDb();
  ensureCollections(db);
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.banned = true;
  await writeDb(db);
  return res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File too large. Max ${MAX_UPLOAD_MB}MB allowed.` });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message || 'Request failed' });
  }
  return res.status(500).json({ error: 'Unexpected server error' });
});

ensureSeedUsers()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Notes backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize demo user:', error);
    process.exit(1);
  });
