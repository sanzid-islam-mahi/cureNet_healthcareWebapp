/**
 * AdminJS panel at /admin. Backend-only; admin users log in here (same User table, role=admin).
 */

import AdminJS, { ComponentLoader } from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSSequelize from '@adminjs/sequelize';
import db from './models/index.js';
import { dashboardHandler } from './adminjs-dashboard-handler.js';
import { getAdminSessionSecret } from './config/security.js';

const { User, Doctor, Patient, Appointment, Prescription, Rating, AuditLog } = db;

const componentLoader = new ComponentLoader();
const Components = {
  Dashboard: componentLoader.add('Dashboard', './adminjs-components/Dashboard.jsx'),
};

AdminJS.registerAdapter({
  Resource: AdminJSSequelize.Resource,
  Database: AdminJSSequelize.Database,
});

async function authenticate(email, password) {
  if (!email || !password) return null;
  const user = await User.findOne({ where: { email: email.trim() } });
  if (!user || user.role !== 'admin' || !user.isActive) return null;
  const ok = await user.comparePassword(password);
  if (!ok) return null;
  return { email: user.email, id: user.id };
}

const sessionSecret = getAdminSessionSecret();

const sessionOptions = {
  resave: false,
  saveUninitialized: false,
  secret: sessionSecret,
  name: 'adminjs.sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
};

const simpleLoginLocale = {
  translations: {
    en: {
      components: {
        Login: {
          welcomeHeader: 'Sign in',
          welcomeMessage: 'Enter your email and password.',
          properties: { email: 'Email', password: 'Password' },
          loginButton: 'Log in',
        },
      },
    },
  },
};

export function buildAdminRouter() {
  const admin = new AdminJS({
    rootPath: '/admin',
    componentLoader,
    dashboard: {
      component: Components.Dashboard,
      handler: async () => dashboardHandler(),
    },
    branding: {
      companyName: 'Admin',
      logo: false,
      withMadeWithLove: false,
      favicon: false,
    },
    locale: simpleLoginLocale,
    assets: {
      styles: ['/admin-simple.css'],
    },
    resources: [
      // User management group
      {
        resource: User, 
        options: { 
          navigation: { icon: 'User', name: 'User Management', group: 'User Management' } 
        } 
      },
      {
        resource: Patient,
        options: { 
          navigation: { icon: 'User', name: 'Patients', group: 'User Management' }
        }
      },
      // Doctors group
      { 
        resource: Doctor, 
        options: { 
          navigation: { name: 'Doctors', group: 'Doctor Management' } 
        } 
      },
      // Appointments & Prescriptions
      {
        resource: Appointment,
        options: { 
          navigation: { icon: 'Calendar', name: 'Appointments', group: 'Care & Activity' }
        }
      },
      {
        resource: Prescription,
        options: { 
          navigation: { icon: 'PrescriptionBottle', name: 'Prescriptions', group: 'Care & Activity' }
        }
      },
      // Additional
      {
        resource: Rating,
        options: { 
          navigation: { icon: 'Star', name: 'Ratings', group: 'Other' }
        }
      },
      // Audit logs
      {
        resource: AuditLog,
        options: {
          navigation: { icon: 'DocumentSearch', name: 'Audit Logs', group: 'Audit & Analytics' }
        }
      },
    ],
  });

  const router = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate,
      cookieName: 'adminjs',
      cookiePassword: sessionSecret,
    },
    null,
    sessionOptions
  );

  return { admin, router };
}
