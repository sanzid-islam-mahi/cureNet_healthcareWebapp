import { authSecurity, errorResponse, json, successResponse } from '../helpers.js';

export const adminPaths = {
  '/admin/stats': {
    get: {
      tags: ['Admin'],
      summary: 'Get admin dashboard stats',
      security: authSecurity,
      responses: {
        200: successResponse('Admin stats', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                stats: {
                  type: 'object',
                  properties: {
                    totalUsers: { type: 'integer' },
                    totalDoctors: { type: 'integer' },
                    totalPatients: { type: 'integer' },
                    totalAppointments: { type: 'integer' },
                    pendingDoctorCount: { type: 'integer' },
                    todayAppointments: { type: 'integer' },
                    completedToday: { type: 'integer' },
                    pendingToday: { type: 'integer' },
                    reportsGenerated: { type: 'integer' },
                    queue: {
                      type: 'object',
                      properties: {
                        pendingDoctorVerifications: { type: 'integer' },
                        pendingAppointmentApprovals: { type: 'integer' },
                        todaysOperationalLoad: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/analytics/appointments': {
    get: {
      tags: ['Admin'],
      summary: 'Get appointment analytics',
      security: authSecurity,
      parameters: [{ name: 'period', in: 'query', schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Appointment analytics', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                analytics: {
                  type: 'object',
                  properties: {
                    statusCounts: { type: 'object', additionalProperties: { type: 'integer' } },
                    typeCounts: { type: 'object', additionalProperties: { type: 'integer' } },
                    dailyCounts: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          count: { type: 'integer' },
                        },
                      },
                    },
                    period: { type: 'integer' },
                  },
                },
              },
            },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/doctor-verifications': {
    get: {
      tags: ['Admin'],
      summary: 'List doctor verification records',
      security: authSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'department', in: 'query', schema: { type: 'string' } },
        { name: 'verified', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: {
        200: successResponse('Doctor verification list', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                doctors: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/DoctorVerificationRecord' },
                },
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
              },
            },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/doctors/{id}/verify': {
    put: {
      tags: ['Admin'],
      summary: 'Verify doctor',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Doctor verified', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                doctor: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    verified: { type: 'boolean' },
                  },
                },
              },
            },
          },
        }),
        404: errorResponse('Doctor not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/doctors/{id}/unverify': {
    put: {
      tags: ['Admin'],
      summary: 'Remove doctor verification',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Doctor unverified', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                doctor: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    verified: { type: 'boolean' },
                  },
                },
              },
            },
          },
        }),
        404: errorResponse('Doctor not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/users': {
    get: {
      tags: ['Admin'],
      summary: 'List users for admin management',
      security: authSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'role', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
        { name: 'verified', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: {
        200: successResponse('User list', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AdminUser' },
                },
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
              },
            },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create user as admin',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'patient', 'doctor'] },
            phone: { type: 'string', nullable: true },
            dateOfBirth: { type: 'string', format: 'date', nullable: true },
            gender: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
            bmdcRegistrationNumber: { type: 'string', nullable: true },
            department: { type: 'string', nullable: true },
            experience: { type: 'integer', nullable: true },
          },
          required: ['email', 'password', 'firstName', 'lastName', 'role'],
        }),
      },
      responses: {
        201: successResponse('User created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/AdminUser' },
              },
            },
          },
        }),
        400: errorResponse('Validation error'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/users/{id}': {
    put: {
      tags: ['Admin'],
      summary: 'Update user as admin',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          additionalProperties: true,
        }),
      },
      responses: {
        200: successResponse('User updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/AdminUser' },
              },
            },
          },
        }),
        400: errorResponse('Validation or self-update protection error'),
        404: errorResponse('User not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/patients': {
    get: {
      tags: ['Admin'],
      summary: 'List patients for admin reporting',
      security: authSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: successResponse('Patient list', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                patients: {
                  type: 'array',
                  items: {
                    allOf: [
                      { $ref: '#/components/schemas/User' },
                      {
                        type: 'object',
                        properties: {
                          patientId: { type: 'integer', nullable: true },
                        },
                      },
                    ],
                  },
                },
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
              },
            },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/appointments': {
    get: {
      tags: ['Admin'],
      summary: 'List appointments for admin reporting',
      security: authSecurity,
      parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
      responses: {
        200: successResponse('Appointment list', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      appointmentDate: { type: 'string', format: 'date' },
                      timeBlock: { type: 'string', nullable: true },
                      type: { type: 'string' },
                      status: { type: 'string' },
                      patient: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          email: { type: 'string', nullable: true },
                        },
                      },
                      doctor: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                date: { type: 'string', format: 'date' },
              },
            },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
  },
  '/admin/logs': {
    get: {
      tags: ['Admin'],
      summary: 'Get audit logs',
      security: authSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'from', in: 'query', schema: { type: 'string' } },
        { name: 'to', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: successResponse('Audit logs', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                logs: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AuditLogRecord' },
                },
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
              },
            },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
  },
};
