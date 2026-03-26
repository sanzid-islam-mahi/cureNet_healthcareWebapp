import { authSecurity, errorResponse, json, successResponse } from '../helpers.js';

export const engagementPaths = {
  '/reminders/preview': {
    post: {
      tags: ['Reminders'],
      summary: 'Preview a medication reminder schedule for the authenticated patient',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            prescriptionId: { type: 'integer' },
            medicineIndex: { type: 'integer' },
            timezone: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date', nullable: true },
            scheduleTimes: {
              type: 'array',
              items: { type: 'string', example: '08:00' },
              description: 'Optional exact reminder times. If omitted, the backend derives defaults from the prescription frequency.',
            },
          },
          required: ['prescriptionId', 'medicineIndex', 'startDate'],
        }),
      },
      responses: {
        200: successResponse('Reminder preview', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                preview: {
                  type: 'object',
                  properties: {
                    medicineName: { type: 'string' },
                    dosage: { type: 'string', nullable: true },
                    frequencyLabel: { type: 'string', nullable: true },
                    instructions: { type: 'string', nullable: true },
                    timezone: { type: 'string' },
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date', nullable: true },
                    scheduleTimes: { type: 'array', items: { type: 'string' } },
                    suggestedTimes: { type: 'array', items: { type: 'string' } },
                    usedFrequencyDefault: { type: 'boolean' },
                    generatedUntil: { type: 'string', format: 'date' },
                    doseCount: { type: 'integer' },
                    doses: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          scheduledAt: { type: 'string', format: 'date-time' },
                          metadata: {
                            type: 'object',
                            properties: {
                              scheduledDate: { type: 'string', format: 'date', nullable: true },
                              scheduledTime: { type: 'string', nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        400: errorResponse('Invalid reminder payload'),
        403: errorResponse('Not authorized for this prescription'),
        404: errorResponse('Prescription not found'),
      },
    },
  },
  '/reminders': {
    post: {
      tags: ['Reminders'],
      summary: 'Create a medication reminder plan for the authenticated patient',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            prescriptionId: { type: 'integer' },
            medicineIndex: { type: 'integer' },
            timezone: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date', nullable: true },
            scheduleTimes: {
              type: 'array',
              items: { type: 'string', example: '08:00' },
              description: 'Optional exact reminder times. If omitted, the backend derives defaults from the prescription frequency.',
            },
          },
          required: ['prescriptionId', 'medicineIndex', 'startDate'],
        }),
      },
      responses: {
        201: successResponse('Reminder plan created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                reminderPlan: { $ref: '#/components/schemas/MedicationReminderPlan' },
              },
            },
          },
        }),
        400: errorResponse('Failed to create reminder'),
        403: errorResponse('Not authorized for this prescription'),
        404: errorResponse('Prescription not found'),
        409: errorResponse('An active reminder already exists for this medicine'),
      },
    },
    get: {
      tags: ['Reminders'],
      summary: 'List reminder plans for authenticated patient',
      security: authSecurity,
      parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: successResponse('Reminder plans', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                reminderPlans: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MedicationReminderPlan' },
                },
              },
            },
          },
        }),
        500: errorResponse('Failed to load reminders'),
      },
    },
  },
  '/reminders/doses': {
    get: {
      tags: ['Reminders'],
      summary: 'List reminder doses for authenticated patient',
      security: authSecurity,
      parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: successResponse('Reminder doses', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                doses: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MedicationReminderDose' },
                },
              },
            },
          },
        }),
        500: errorResponse('Failed to load reminder doses'),
      },
    },
  },
  '/reminders/doses/{id}/taken': {
    post: {
      tags: ['Reminders'],
      summary: 'Mark one reminder dose as taken',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Reminder dose updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                dose: { $ref: '#/components/schemas/MedicationReminderDose' },
              },
            },
          },
        }),
        404: errorResponse('Reminder dose not found'),
      },
    },
  },
  '/reminders/{id}/pause': {
    put: {
      tags: ['Reminders'],
      summary: 'Pause reminder plan',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Reminder paused', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', properties: { reminderPlan: { $ref: '#/components/schemas/MedicationReminderPlan' } } },
          },
        }),
        404: errorResponse('Reminder plan not found'),
      },
    },
  },
  '/reminders/{id}/resume': {
    put: {
      tags: ['Reminders'],
      summary: 'Resume reminder plan',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Reminder resumed', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', properties: { reminderPlan: { $ref: '#/components/schemas/MedicationReminderPlan' } } },
          },
        }),
        404: errorResponse('Reminder plan not found'),
      },
    },
  },
  '/reminders/{id}/stop': {
    put: {
      tags: ['Reminders'],
      summary: 'Stop reminder plan',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Reminder stopped', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', properties: { reminderPlan: { $ref: '#/components/schemas/MedicationReminderPlan' } } },
          },
        }),
        404: errorResponse('Reminder plan not found'),
      },
    },
  },
  '/ratings/doctor/{id}': {
    get: {
      tags: ['Ratings'],
      summary: 'Get ratings for doctor',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Doctor ratings', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                summary: {
                  type: 'object',
                  properties: {
                    averageRating: { type: 'number' },
                    totalRatings: { type: 'integer' },
                  },
                },
                ratings: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RatingRecord' },
                },
              },
            },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
  },
  '/ratings/my-ratings': {
    get: {
      tags: ['Ratings'],
      summary: 'Get ratings created by authenticated patient',
      security: authSecurity,
      responses: {
        200: successResponse('My ratings', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                ratings: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RatingRecord' },
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
  '/ratings': {
    post: {
      tags: ['Ratings'],
      summary: 'Create doctor rating as patient',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            doctorId: { type: 'integer' },
            appointmentId: { type: 'integer', nullable: true },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            review: { type: 'string', nullable: true },
          },
          required: ['doctorId', 'rating'],
        }),
      },
      responses: {
        201: successResponse('Rating created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                rating: { $ref: '#/components/schemas/RatingRecord' },
              },
            },
          },
        }),
        400: errorResponse('Validation error'),
        403: errorResponse('Not a patient'),
        409: errorResponse('Already rated this appointment'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'List notifications for authenticated user',
      security: authSecurity,
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: {
        200: successResponse('Notifications', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                notifications: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/NotificationRecord' },
                },
                unreadCount: { type: 'integer' },
              },
            },
          },
        }),
        401: errorResponse('Unauthorized'),
        500: errorResponse('Failed'),
      },
    },
  },
  '/notifications/read-all': {
    put: {
      tags: ['Notifications'],
      summary: 'Mark all notifications as read',
      security: authSecurity,
      responses: {
        200: successResponse('Notifications updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        }),
        500: errorResponse('Failed'),
      },
    },
  },
  '/notifications/{id}/read': {
    put: {
      tags: ['Notifications'],
      summary: 'Mark one notification as read',
      security: authSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: successResponse('Notification updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                notification: { $ref: '#/components/schemas/NotificationRecord' },
              },
            },
          },
        }),
        404: errorResponse('Notification not found'),
        500: errorResponse('Failed'),
      },
    },
  },
};
