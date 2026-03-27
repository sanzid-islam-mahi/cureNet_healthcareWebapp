import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import sequelize from './config/database.js';
import { runMigrations } from './migrate.js';
import authRoutes from './routes/auth.js';
import patientsRoutes from './routes/patients.js';
import doctorsRoutes from './routes/doctors.js';
import adminRoutes from './routes/admin.js';
import ratingsRoutes from './routes/ratings.js';
import appointmentsRoutes from './routes/appointments.js';
import prescriptionsRoutes from './routes/prescriptions.js';
import notificationsRoutes from './routes/notifications.js';
import remindersRoutes from './routes/reminders.js';
import imagingRoutes from './routes/imaging.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { getJwtSecret, getTrustProxyValue } from './config/security.js';
import { getUploadsDir } from './config/appPaths.js';
import { registerSwagger } from './docs/swagger.js';

const app = express();
const PORT = process.env.PORT || 5000;

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];
const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin not allowed'));
  },
};

const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 120 });

getJwtSecret();

const trustProxy = getTrustProxyValue();
if (trustProxy) {
  app.set('trust proxy', trustProxy);
}

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

const uploadsDir = getUploadsDir();
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/imaging', imagingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CureNet API' });
});

registerSwagger(app);

app.use((err, req, res, next) => {
  if (err && /CORS/.test(err.message || '')) {
    return res.status(403).json({ success: false, message: 'Origin is not allowed' });
  }
  return next(err);
});

async function start() {
  try {
    await sequelize.authenticate();
    await runMigrations();
    console.log('Database connected and migrations up to date.');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
