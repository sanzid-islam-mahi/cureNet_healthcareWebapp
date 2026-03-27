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
      summary: 'Verify doctor and publish clinic assignment',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: false,
        content: json({
          type: 'object',
          properties: {
            clinicId: {
              type: 'integer',
              nullable: true,
              description: 'Required if the doctor does not already have a clinic assignment.',
            },
          },
        }),
      },
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
                    clinicId: { type: 'integer', nullable: true },
                  },
                },
              },
            },
          },
        }),
        400: errorResponse('Doctor must be assigned to an active clinic before approval'),
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
          allOf: [
            { $ref: '#/components/schemas/AdminUserUpsert' },
            { type: 'object', required: ['email', 'password', 'firstName', 'lastName', 'role'] },
          ],
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
        400: errorResponse('Validation error, including receptionist clinic assignment rules'),
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
        content: json({ $ref: '#/components/schemas/AdminUserUpsert' }),
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
  '/admin/clinics': {
    get: {
      tags: ['Admin'],
      summary: 'List clinics with optional doctor roster',
      security: authSecurity,
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'includeDoctors', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: {
        200: successResponse('Clinic list', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                clinics: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ClinicRecord' },
                },
              },
            },
          },
        }),
        500: errorResponse('Failed to load clinics'),
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create clinic and optionally assign doctors',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['hospital', 'clinic', 'diagnostic_center'] },
            code: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            addressLine: { type: 'string', nullable: true },
            city: { type: 'string', nullable: true },
            area: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'inactive'], nullable: true },
            departments: { oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }], nullable: true },
            services: { oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }], nullable: true },
            operatingHours: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            doctorIds: { type: 'array', items: { type: 'integer' }, nullable: true },
          },
          required: ['name'],
        }),
      },
      responses: {
        201: successResponse('Clinic created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                clinic: { $ref: '#/components/schemas/ClinicRecord' },
              },
            },
          },
        }),
        400: errorResponse('Clinic name is required'),
        500: errorResponse('Failed to create clinic'),
      },
    },
  },
  '/admin/clinics/{id}': {
    put: {
      tags: ['Admin'],
      summary: 'Update clinic and doctor roster',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            name: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['hospital', 'clinic', 'diagnostic_center'], nullable: true },
            code: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            addressLine: { type: 'string', nullable: true },
            city: { type: 'string', nullable: true },
            area: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'inactive'], nullable: true },
            departments: { oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }], nullable: true },
            services: { oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }], nullable: true },
            operatingHours: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            doctorIds: { type: 'array', items: { type: 'integer' }, nullable: true },
          },
        }),
      },
      responses: {
        200: successResponse('Clinic updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                clinic: { $ref: '#/components/schemas/ClinicRecord' },
              },
            },
          },
        }),
        400: errorResponse('Clinic name is required'),
        404: errorResponse('Clinic not found'),
        500: errorResponse('Failed to update clinic'),
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
