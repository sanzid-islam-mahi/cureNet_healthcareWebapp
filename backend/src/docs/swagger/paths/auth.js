import { authSecurity, errorResponse, json, successResponse } from '../helpers.js';

export const authPaths = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a patient or doctor account',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string', nullable: true },
            dateOfBirth: { type: 'string', format: 'date', nullable: true },
            gender: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['patient', 'doctor'] },
            bmdcRegistrationNumber: { type: 'string', nullable: true },
            department: { type: 'string', nullable: true },
            experience: { type: 'integer', nullable: true },
          },
          required: ['email', 'password', 'firstName', 'lastName'],
        }),
      },
      responses: {
        201: successResponse('Account created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        }),
        400: errorResponse('Validation error'),
        500: errorResponse('Registration failed'),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Log in with email or phone',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            password: { type: 'string', format: 'password' },
          },
          required: ['password'],
        }),
      },
      responses: {
        200: successResponse('Logged in', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        }),
        400: errorResponse('Missing credentials'),
        401: errorResponse('Invalid credentials'),
        403: errorResponse('Account is deactivated'),
        500: errorResponse('Login failed'),
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Clear the auth cookie and log out',
      security: authSecurity,
      responses: {
        200: successResponse('Logged out', { $ref: '#/components/schemas/SuccessMessage' }),
      },
    },
  },
  '/auth/profile': {
    get: {
      tags: ['Auth'],
      summary: 'Get the authenticated user profile',
      security: authSecurity,
      responses: {
        200: successResponse('Authenticated user profile', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        }),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Token invalid or account inactive'),
        500: errorResponse('Failed to get profile'),
      },
    },
    put: {
      tags: ['Auth'],
      summary: 'Update the authenticated user profile',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string', nullable: true },
            dateOfBirth: { type: 'string', format: 'date', nullable: true },
            gender: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
          },
        }),
      },
      responses: {
        200: successResponse('Updated user profile', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        }),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        500: errorResponse('Update failed'),
      },
    },
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Start password reset flow',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
          },
          required: ['email'],
        }),
      },
      responses: {
        200: successResponse('Reset flow started', { $ref: '#/components/schemas/SuccessMessage' }),
        400: errorResponse('Email is required'),
        500: errorResponse('Request failed'),
      },
    },
  },
  '/auth/verify-reset-token': {
    get: {
      tags: ['Auth'],
      summary: 'Verify password reset token',
      parameters: [
        { name: 'token', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: successResponse('Token is valid', { $ref: '#/components/schemas/SuccessMessage' }),
        400: errorResponse('Invalid or expired token'),
        500: errorResponse('Verification failed'),
      },
    },
  },
  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password with reset token',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            token: { type: 'string' },
            password: { type: 'string', format: 'password' },
          },
          required: ['token', 'password'],
        }),
      },
      responses: {
        200: successResponse('Password reset', { $ref: '#/components/schemas/SuccessMessage' }),
        400: errorResponse('Validation or token error'),
        500: errorResponse('Reset failed'),
      },
    },
  },
};
