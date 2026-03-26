import { authSecurity, errorResponse, json, paginationSchema, successResponse } from '../helpers.js';

export const operationsPaths = {
  '/appointments': {
    post: {
      tags: ['Appointments'],
      summary: 'Create appointment request as patient',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            doctorId: { type: 'integer' },
            appointmentDate: { type: 'string', format: 'date' },
            window: { type: 'string', nullable: true },
            timeBlock: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['in_person', 'video', 'phone'], nullable: true },
            reason: { type: 'string', nullable: true },
            symptoms: { type: 'string', nullable: true },
            triageConfirmed: { type: 'boolean', nullable: true },
          },
          required: ['doctorId', 'appointmentDate'],
        }),
      },
      responses: {
        201: successResponse('Appointment created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointment: { $ref: '#/components/schemas/AppointmentRecord' },
                triage: { $ref: '#/components/schemas/TriageInfo' },
              },
            },
          },
        }),
        400: errorResponse('Validation, triage, or profile error'),
        403: errorResponse('Not a patient'),
        404: errorResponse('Doctor not found'),
        409: errorResponse('Booking conflict'),
        500: errorResponse('Failed'),
      },
    },
    get: {
      tags: ['Appointments'],
      summary: 'List appointments for authenticated patient',
      security: authSecurity,
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'sortBy', in: 'query', schema: { type: 'string' } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'] } },
      ],
      responses: {
        200: successResponse('Patient appointments', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointments: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AppointmentRecord' },
                },
              },
            },
            pagination: paginationSchema,
          },
        }),
        403: errorResponse('Not a patient'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/appointments/{id}': {
    get: {
      tags: ['Appointments'],
      summary: 'Get single appointment',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Appointment details', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointment: { $ref: '#/components/schemas/AppointmentRecord' },
              },
            },
          },
        }),
        403: errorResponse('Not authorized to view this appointment'),
        404: errorResponse('Appointment not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/appointments/{id}/cancel': {
    put: {
      tags: ['Appointments'],
      summary: 'Cancel appointment',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Appointment cancelled', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointment: { $ref: '#/components/schemas/AppointmentRecord' },
              },
            },
          },
        }),
        400: errorResponse('Appointment cannot be cancelled'),
        403: errorResponse('Not authorized to cancel'),
        404: errorResponse('Appointment not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/appointments/{id}/approve': {
    put: {
      tags: ['Appointments'],
      summary: 'Approve appointment as doctor',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Appointment approved', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointment: { $ref: '#/components/schemas/AppointmentRecord' },
              },
            },
          },
        }),
        400: errorResponse('Only requested appointments can be approved'),
        403: errorResponse('Not a doctor or not your appointment'),
        404: errorResponse('Appointment not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/appointments/{id}/reject': {
    put: {
      tags: ['Appointments'],
      summary: 'Reject appointment as doctor',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Appointment rejected', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointment: { $ref: '#/components/schemas/AppointmentRecord' },
              },
            },
          },
        }),
        400: errorResponse('Only requested appointments can be rejected'),
        403: errorResponse('Not a doctor or not your appointment'),
        404: errorResponse('Appointment not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/appointments/{id}/start': {
    put: {
      tags: ['Appointments'],
      summary: 'Start appointment as doctor',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Appointment started', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointment: { $ref: '#/components/schemas/AppointmentRecord' },
              },
            },
          },
        }),
        400: errorResponse('Only approved appointments can be started'),
        403: errorResponse('Not a doctor or not your appointment'),
        404: errorResponse('Appointment not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/appointments/{id}/complete': {
    put: {
      tags: ['Appointments'],
      summary: 'Complete appointment as doctor',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Appointment completed', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appointment: { $ref: '#/components/schemas/AppointmentRecord' },
              },
            },
          },
        }),
        400: errorResponse('Only in-progress appointments can be completed'),
        403: errorResponse('Not a doctor or not your appointment'),
        404: errorResponse('Appointment not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/prescriptions/history/patient': {
    get: {
      tags: ['Prescriptions'],
      summary: 'Get authenticated patient prescription history',
      security: authSecurity,
      responses: {
        200: successResponse('Patient prescription history', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                prescriptions: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PrescriptionRecord' },
                },
              },
            },
          },
        }),
        403: errorResponse('Not a patient'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/prescriptions/history/doctor': {
    get: {
      tags: ['Prescriptions'],
      summary: 'Get authenticated doctor continuity prescriptions',
      security: authSecurity,
      responses: {
        200: successResponse('Doctor continuity prescriptions', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                prescriptions: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PrescriptionRecord' },
                },
              },
            },
          },
        }),
        403: errorResponse('Not a doctor'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/prescriptions/appointment/{id}': {
    get: {
      tags: ['Prescriptions'],
      summary: 'Get prescription by appointment id',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Prescription for appointment', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                prescription: { $ref: '#/components/schemas/PrescriptionRecord' },
              },
            },
          },
        }),
        403: errorResponse('Not authorized'),
        404: errorResponse('Appointment or prescription not found'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/prescriptions': {
    post: {
      tags: ['Prescriptions'],
      summary: 'Create prescription as doctor',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            appointmentId: { type: 'integer' },
            diagnosis: { type: 'string', nullable: true },
            medicines: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
              },
            },
            notes: { type: 'string', nullable: true },
          },
          required: ['appointmentId'],
        }),
      },
      responses: {
        201: successResponse('Prescription created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                prescription: { $ref: '#/components/schemas/PrescriptionRecord' },
              },
            },
          },
        }),
        400: errorResponse('Validation error'),
        403: errorResponse('Not a doctor or not your appointment'),
        404: errorResponse('Appointment not found'),
        409: errorResponse('Prescription already exists'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/prescriptions/{id}': {
    put: {
      tags: ['Prescriptions'],
      summary: 'Edit prescription as doctor',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            diagnosis: { type: 'string', nullable: true },
            medicines: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
              },
            },
            notes: { type: 'string', nullable: true },
          },
        }),
      },
      responses: {
        200: successResponse('Prescription updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                prescription: { $ref: '#/components/schemas/PrescriptionRecord' },
              },
            },
          },
        }),
        400: errorResponse('Validation error'),
        403: errorResponse('Not a doctor or not your prescription'),
        404: errorResponse('Prescription not found'),
        500: errorResponse('Failed'),
      },
    },
  },
};
