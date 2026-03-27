import swaggerUi from 'swagger-ui-express';
import { securitySchemes, schemas } from './swagger/schemas.js';
import { authPaths } from './swagger/paths/auth.js';
import { carePaths } from './swagger/paths/care.js';
import { operationsPaths } from './swagger/paths/operations.js';
import { engagementPaths } from './swagger/paths/engagement.js';
import { adminPaths } from './swagger/paths/admin.js';

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CureNET API',
    version: '1.0.0',
    description: 'OpenAPI documentation for the CureNET backend.',
  },
  servers: [
    {
      url: '/api',
      description: 'Same-origin API',
    },
    {
      url: `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api`,
      description: 'Configured application origin',
    },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Patients' },
    { name: 'Doctors' },
    { name: 'Appointments' },
    { name: 'Prescriptions' },
    { name: 'Reminders' },
    { name: 'Ratings' },
    { name: 'Notifications' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes,
    schemas,
  },
  paths: {
    ...authPaths,
    ...carePaths,
    ...operationsPaths,
    ...engagementPaths,
    ...adminPaths,
  },
};

export function registerSwagger(app) {
  app.get('/openapi.json', (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'CureNET API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );
}
