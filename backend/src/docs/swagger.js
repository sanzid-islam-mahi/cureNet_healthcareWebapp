import swaggerUi from 'swagger-ui-express';

const authSecurity = [{ bearerAuth: [] }, { cookieAuth: [] }];

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CureNET API',
    version: '1.0.0',
    description: 'OpenAPI documentation for the CureNET backend.',
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Patients' },
    { name: 'Doctors' },
    { name: 'Appointments' },
    { name: 'Prescriptions' },
    { name: 'Ratings' },
    { name: 'Notifications' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'curenet_auth',
      },
    },
    schemas: {
      SuccessMessage: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
        },
        required: ['success'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          code: { type: 'string' },
        },
        required: ['success', 'message'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 12 },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string', nullable: true },
          dateOfBirth: { type: 'string', format: 'date', nullable: true },
          gender: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['patient', 'doctor', 'admin'] },
          doctorId: { type: 'integer', nullable: true },
          patientId: { type: 'integer', nullable: true },
          profileImage: { type: 'string', nullable: true },
        },
        required: ['id', 'email', 'firstName', 'lastName', 'role'],
      },
      DoctorPublic: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          department: { type: 'string', nullable: true },
          experience: { type: 'integer', nullable: true },
          hospital: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          consultationFee: { type: 'number', nullable: true },
          bio: { type: 'string', nullable: true },
          profileImage: { type: 'string', nullable: true },
          verified: { type: 'boolean', nullable: true },
          averageRating: { type: 'number', nullable: true },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          patientId: { type: 'integer' },
          doctorId: { type: 'integer' },
          appointmentDate: { type: 'string', format: 'date' },
          timeBlock: { type: 'string', nullable: true },
          window: { type: 'string', nullable: true },
          serial: { type: 'integer', nullable: true },
          type: { type: 'string', enum: ['in_person', 'video', 'phone'] },
          reason: { type: 'string', nullable: true },
          symptoms: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['requested', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Prescription: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          appointmentId: { type: 'integer' },
          diagnosis: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          medications: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          type: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          link: { type: 'string', nullable: true },
          metadata: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
          readAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Rating: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          doctorId: { type: 'integer' },
          patientId: { type: 'integer' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          review: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a patient or doctor account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  phone: { type: 'string' },
                  dateOfBirth: { type: 'string', format: 'date' },
                  gender: { type: 'string' },
                  address: { type: 'string' },
                  role: { type: 'string', enum: ['patient', 'doctor'] },
                  bmdcRegistrationNumber: { type: 'string' },
                  department: { type: 'string' },
                  experience: { type: 'integer' },
                },
                required: ['email', 'password', 'firstName', 'lastName'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created',
            content: {
              'application/json': {
                schema: {
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
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email or phone',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                },
                required: ['password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged in',
            content: {
              'application/json': {
                schema: {
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
                },
              },
            },
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Clear auth cookie and end the current session',
        security: authSecurity,
        responses: {
          200: { description: 'Logged out', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        },
      },
    },
    '/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated user profile',
        security: authSecurity,
        responses: {
          200: {
            description: 'Authenticated profile',
            content: {
              'application/json': {
                schema: {
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
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Auth'],
        summary: 'Update the authenticated user profile',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  phone: { type: 'string' },
                  dateOfBirth: { type: 'string', format: 'date' },
                  gender: { type: 'string' },
                  address: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated profile',
            content: {
              'application/json': {
                schema: {
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
                },
              },
            },
          },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Start the password reset flow',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Reset flow accepted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        },
      },
    },
    '/auth/verify-reset-token': {
      get: {
        tags: ['Auth'],
        summary: 'Verify a password reset token',
        parameters: [
          { name: 'token', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Token verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset a password using a reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        },
      },
    },
    '/patients/profile': {
      get: {
        tags: ['Patients'],
        summary: 'Get the authenticated patient profile',
        security: authSecurity,
        responses: { 200: { description: 'Patient profile' } },
      },
      put: {
        tags: ['Patients'],
        summary: 'Update the authenticated patient profile',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  bloodType: { type: 'string' },
                  allergies: { type: 'string' },
                  emergencyContact: { type: 'string' },
                  emergencyPhone: { type: 'string' },
                  insuranceProvider: { type: 'string' },
                  insuranceNumber: { type: 'string' },
                  profileImage: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Patient profile updated' } },
      },
    },
    '/patients/{id}/dashboard/stats': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient dashboard stats',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Dashboard stats' } },
      },
    },
    '/patients/{id}/appointments': {
      get: {
        tags: ['Patients'],
        summary: 'Get appointments for a patient dashboard view',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Patient appointments' } },
      },
    },
    '/doctors': {
      get: {
        tags: ['Doctors'],
        summary: 'List public doctors',
        parameters: [
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Doctor list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        doctors: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/DoctorPublic' },
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
    },
    '/doctors/profile': {
      get: {
        tags: ['Doctors'],
        summary: 'Get the authenticated doctor profile',
        security: authSecurity,
        responses: { 200: { description: 'Doctor profile' } },
      },
      put: {
        tags: ['Doctors'],
        summary: 'Update the authenticated doctor profile',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
        responses: { 200: { description: 'Doctor profile updated' } },
      },
    },
    '/doctors/upload-image': {
      post: {
        tags: ['Doctors'],
        summary: 'Upload a doctor profile image',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['profileImage'],
                properties: {
                  profileImage: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Image uploaded' } },
      },
    },
    '/doctors/{id}': {
      get: {
        tags: ['Doctors'],
        summary: 'Get public doctor profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Doctor profile' } },
      },
    },
    '/doctors/{id}/available-slots': {
      get: {
        tags: ['Doctors'],
        summary: 'Get bookable slots for a doctor',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Available slots' } },
      },
    },
    '/doctors/{id}/upcoming-slots': {
      get: {
        tags: ['Doctors'],
        summary: 'Get upcoming availability previews for a doctor',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'days', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Upcoming slots' } },
      },
    },
    '/doctors/{id}/ratings': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor ratings',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Doctor ratings' } },
      },
    },
    '/doctors/{id}/dashboard/stats': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor dashboard stats',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Doctor dashboard stats' } },
      },
    },
    '/doctors/{id}/appointments': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor appointments',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Doctor appointments' } },
      },
    },
    '/doctors/{id}/patients': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor patient roster',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Doctor patients' } },
      },
    },
    '/doctors/{id}/patients/{patientId}/context': {
      get: {
        tags: ['Doctors'],
        summary: 'Get continuity context for one patient',
        security: authSecurity,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'patientId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Patient context' } },
      },
    },
    '/appointments': {
      post: {
        tags: ['Appointments'],
        summary: 'Create an appointment request as a patient',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  doctorId: { type: 'integer' },
                  appointmentDate: { type: 'string', format: 'date' },
                  window: { type: 'string' },
                  timeBlock: { type: 'string' },
                  type: { type: 'string', enum: ['in_person', 'video', 'phone'] },
                  reason: { type: 'string' },
                  symptoms: { type: 'string' },
                  triageConfirmed: { type: 'boolean' },
                },
                required: ['doctorId', 'appointmentDate'],
              },
            },
          },
        },
        responses: { 201: { description: 'Appointment created' } },
      },
      get: {
        tags: ['Appointments'],
        summary: 'List appointments for the authenticated patient',
        security: authSecurity,
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'] } },
        ],
        responses: {
          200: {
            description: 'Appointment list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        appointments: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Appointment' },
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
    },
    '/appointments/{id}': {
      get: {
        tags: ['Appointments'],
        summary: 'Get a single appointment',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Appointment details' } },
      },
    },
    '/appointments/{id}/cancel': {
      put: {
        tags: ['Appointments'],
        summary: 'Cancel an appointment',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Appointment cancelled' } },
      },
    },
    '/appointments/{id}/approve': {
      put: {
        tags: ['Appointments'],
        summary: 'Approve an appointment as a doctor',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Appointment approved' } },
      },
    },
    '/appointments/{id}/reject': {
      put: {
        tags: ['Appointments'],
        summary: 'Reject an appointment as a doctor',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Appointment rejected' } },
      },
    },
    '/appointments/{id}/start': {
      put: {
        tags: ['Appointments'],
        summary: 'Mark an appointment in progress',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Appointment started' } },
      },
    },
    '/appointments/{id}/complete': {
      put: {
        tags: ['Appointments'],
        summary: 'Complete an appointment',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Appointment completed' } },
      },
    },
    '/prescriptions/history/patient': {
      get: {
        tags: ['Prescriptions'],
        summary: 'Get prescription history for the authenticated patient',
        security: authSecurity,
        responses: {
          200: {
            description: 'Patient prescription history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        prescriptions: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Prescription' },
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
    },
    '/prescriptions/history/doctor': {
      get: {
        tags: ['Prescriptions'],
        summary: 'Get continuity-of-care prescriptions for the authenticated doctor',
        security: authSecurity,
        responses: { 200: { description: 'Doctor continuity prescriptions' } },
      },
    },
    '/prescriptions/appointment/{id}': {
      get: {
        tags: ['Prescriptions'],
        summary: 'Get prescription by appointment id',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Prescription for appointment' } },
      },
    },
    '/prescriptions': {
      post: {
        tags: ['Prescriptions'],
        summary: 'Create a prescription as a doctor',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['appointmentId'],
                properties: {
                  appointmentId: { type: 'integer' },
                  diagnosis: { type: 'string' },
                  notes: { type: 'string' },
                  medications: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: true,
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Prescription created' } },
      },
    },
    '/prescriptions/{id}': {
      put: {
        tags: ['Prescriptions'],
        summary: 'Edit a prescription as a doctor',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
        responses: { 200: { description: 'Prescription updated' } },
      },
    },
    '/ratings/doctor/{id}': {
      get: {
        tags: ['Ratings'],
        summary: 'Get ratings for a doctor',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Doctor ratings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        ratings: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Rating' },
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
    },
    '/ratings/my-ratings': {
      get: {
        tags: ['Ratings'],
        summary: 'Get ratings created by the authenticated patient',
        security: authSecurity,
        responses: { 200: { description: 'My ratings' } },
      },
    },
    '/ratings': {
      post: {
        tags: ['Ratings'],
        summary: 'Create a doctor rating as a patient',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['doctorId', 'rating'],
                properties: {
                  doctorId: { type: 'integer' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  review: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Rating created' } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for the authenticated user',
        security: authSecurity,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Notification list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        notifications: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Notification' },
                        },
                        unreadCount: { type: 'integer' },
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
    '/notifications/read-all': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        security: authSecurity,
        responses: { 200: { description: 'Notifications updated' } },
      },
    },
    '/notifications/{id}/read': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark one notification as read',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Notification updated' } },
      },
    },
    '/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get admin dashboard stats',
        security: authSecurity,
        responses: { 200: { description: 'Admin stats' } },
      },
    },
    '/admin/analytics/appointments': {
      get: {
        tags: ['Admin'],
        summary: 'Get appointment analytics',
        security: authSecurity,
        responses: { 200: { description: 'Appointment analytics' } },
      },
    },
    '/admin/doctor-verifications': {
      get: {
        tags: ['Admin'],
        summary: 'List doctor verification candidates',
        security: authSecurity,
        responses: { 200: { description: 'Doctor verification list' } },
      },
    },
    '/admin/doctors/{id}/verify': {
      put: {
        tags: ['Admin'],
        summary: 'Verify a doctor',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Doctor verified' } },
      },
    },
    '/admin/doctors/{id}/unverify': {
      put: {
        tags: ['Admin'],
        summary: 'Remove doctor verification',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Doctor unverified' } },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users for admin management',
        security: authSecurity,
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'User list' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a user as admin',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string', enum: ['patient', 'doctor', 'admin'] },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'User created' } },
      },
    },
    '/admin/users/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Update a user as admin',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
        responses: { 200: { description: 'User updated' } },
      },
    },
    '/admin/patients': {
      get: {
        tags: ['Admin'],
        summary: 'List patients for admin reporting',
        security: authSecurity,
        responses: { 200: { description: 'Patient list' } },
      },
    },
    '/admin/appointments': {
      get: {
        tags: ['Admin'],
        summary: 'List appointments for admin reporting',
        security: authSecurity,
        responses: { 200: { description: 'Appointment list' } },
      },
    },
    '/admin/logs': {
      get: {
        tags: ['Admin'],
        summary: 'Get audit logs',
        security: authSecurity,
        responses: { 200: { description: 'Audit logs' } },
      },
    },
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
