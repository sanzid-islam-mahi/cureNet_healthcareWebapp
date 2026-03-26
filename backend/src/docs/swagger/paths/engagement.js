import { authSecurity, errorResponse, json, successResponse } from '../helpers.js';

export const engagementPaths = {
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
