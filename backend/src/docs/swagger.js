import swaggerUi from 'swagger-ui-express';

const authSecurity = [{ bearerAuth: [] }, { cookieAuth: [] }];

function json(schema) {
  return {
    'application/json': {
      schema,
    },
  };
}

function successResponse(description, schema) {
  return {
    description,
    content: json(schema),
  };
}

function errorResponse(description = 'Error') {
  return successResponse(description, { $ref: '#/components/schemas/ErrorResponse' });
}

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
  },
  required: ['page', 'limit', 'total'],
};

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
          code: { type: 'string', nullable: true },
          errors: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          data: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
        },
        required: ['success', 'message'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string', nullable: true },
          dateOfBirth: { type: 'string', format: 'date', nullable: true },
          gender: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['patient', 'doctor', 'admin'] },
          isActive: { type: 'boolean', nullable: true },
          doctorId: { type: 'integer', nullable: true },
          patientId: { type: 'integer', nullable: true },
          profileImage: { type: 'string', nullable: true },
        },
        required: ['id', 'email', 'firstName', 'lastName', 'role'],
      },
      PatientMedicalProfile: {
        type: 'object',
        properties: {
          bloodType: { type: 'string', nullable: true },
          allergies: { type: 'string', nullable: true },
          emergencyContact: { type: 'string', nullable: true },
          emergencyPhone: { type: 'string', nullable: true },
          insuranceProvider: { type: 'string', nullable: true },
          insuranceNumber: { type: 'string', nullable: true },
          profileImage: { type: 'string', nullable: true },
        },
      },
      PatientProfile: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          bloodType: { type: 'string', nullable: true },
          allergies: { type: 'string', nullable: true },
          emergencyContact: { type: 'string', nullable: true },
          emergencyPhone: { type: 'string', nullable: true },
          insuranceProvider: { type: 'string', nullable: true },
          insuranceNumber: { type: 'string', nullable: true },
          profileImage: { type: 'string', nullable: true },
          user: { $ref: '#/components/schemas/User' },
        },
        required: ['id', 'userId', 'user'],
      },
      DoctorProfile: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          bmdcRegistrationNumber: { type: 'string', nullable: true },
          department: { type: 'string', nullable: true },
          experience: { type: 'integer', nullable: true },
          education: { type: 'string', nullable: true },
          certifications: { type: 'string', nullable: true },
          hospital: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          consultationFee: { type: 'number', nullable: true },
          bio: { type: 'string', nullable: true },
          chamberTimes: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
          chamberWindows: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
          degrees: {
            type: 'array',
            nullable: true,
            items: { type: 'string' },
          },
          awards: {
            type: 'array',
            nullable: true,
            items: { type: 'string' },
          },
          languages: {
            type: 'array',
            nullable: true,
            items: { type: 'string' },
          },
          services: {
            type: 'array',
            nullable: true,
            items: { type: 'string' },
          },
          unavailableDates: {
            type: 'array',
            nullable: true,
            items: { type: 'string', format: 'date' },
          },
          profileImage: { type: 'string', nullable: true },
          verified: { type: 'boolean', nullable: true },
          averageRating: { type: 'number', nullable: true },
          user: { $ref: '#/components/schemas/User' },
        },
        required: ['id', 'userId', 'user'],
      },
      PublicDoctorProfile: {
        allOf: [
          { $ref: '#/components/schemas/DoctorProfile' },
          {
            type: 'object',
            properties: {
              patientCount: { type: 'integer', nullable: true },
            },
          },
        ],
      },
      AppointmentDoctorRef: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      AppointmentPatientRef: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      AppointmentRecord: {
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
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
          doctor: { $ref: '#/components/schemas/AppointmentDoctorRef' },
          patient: { $ref: '#/components/schemas/AppointmentPatientRef' },
        },
        required: ['id', 'patientId', 'doctorId', 'appointmentDate', 'type', 'status'],
      },
      TriageInfo: {
        type: 'object',
        properties: {
          redFlagDetected: { type: 'boolean' },
          matchedTerms: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['redFlagDetected', 'matchedTerms'],
      },
      AvailableWindow: {
        type: 'object',
        properties: {
          window: { type: 'string' },
          label: { type: 'string' },
          timeRange: { type: 'string' },
          enabled: { type: 'boolean' },
          maxPatients: { type: 'integer', nullable: true },
          booked: { type: 'integer' },
          spotsLeft: { type: 'integer' },
          available: { type: 'boolean' },
        },
      },
      UpcomingSlot: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
          weekday: { type: 'string' },
          windows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                window: { type: 'string' },
                label: { type: 'string' },
                timeRange: { type: 'string' },
              },
            },
          },
        },
      },
      DashboardQueue: {
        type: 'object',
        additionalProperties: true,
      },
      PrescriptionRecord: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          appointmentId: { type: 'integer' },
          diagnosis: { type: 'string', nullable: true },
          medicines: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
          appointment: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              appointmentDate: { type: 'string', format: 'date' },
              status: { type: 'string' },
              type: { type: 'string' },
              window: { type: 'string', nullable: true },
              serial: { type: 'integer', nullable: true },
              timeBlock: { type: 'string', nullable: true },
              reason: { type: 'string', nullable: true },
              symptoms: { type: 'string', nullable: true },
              doctor: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'integer', nullable: true },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                },
              },
              patient: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'integer', nullable: true },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                  email: { type: 'string', nullable: true },
                  phone: { type: 'string', nullable: true },
                  dateOfBirth: { type: 'string', format: 'date', nullable: true },
                  gender: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
      RatingRecord: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          doctorId: { type: 'integer', nullable: true },
          patientId: { type: 'integer', nullable: true },
          appointmentId: { type: 'integer', nullable: true },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          review: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      NotificationRecord: {
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
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      AdminUser: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string', nullable: true },
          dateOfBirth: { type: 'string', format: 'date', nullable: true },
          gender: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['admin', 'patient', 'doctor'] },
          isActive: { type: 'boolean' },
          doctorId: { type: 'integer', nullable: true },
          patientId: { type: 'integer', nullable: true },
          doctorProfile: {
            type: 'object',
            nullable: true,
            properties: {
              department: { type: 'string', nullable: true },
              verified: { type: 'boolean', nullable: true },
              bmdcRegistrationNumber: { type: 'string', nullable: true },
              experience: { type: 'integer', nullable: true },
            },
          },
        },
      },
      DoctorVerificationRecord: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          bmdcRegistrationNumber: { type: 'string', nullable: true },
          department: { type: 'string', nullable: true },
          experience: { type: 'integer', nullable: true },
          verified: { type: 'boolean' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      AuditLogRecord: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          action: { type: 'string' },
          userId: { type: 'integer', nullable: true },
          entityType: { type: 'string', nullable: true },
          entityId: { type: 'string', nullable: true },
          details: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
          ip: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              email: { type: 'string' },
              name: { type: 'string' },
            },
          },
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
    '/patients/profile': {
      get: {
        tags: ['Patients'],
        summary: 'Get authenticated patient profile',
        security: authSecurity,
        responses: {
          200: successResponse('Patient profile', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  patient: { $ref: '#/components/schemas/PatientProfile' },
                },
              },
            },
          }),
          403: errorResponse('Not a patient'),
          404: errorResponse('Patient profile not found'),
          500: errorResponse('Failed to get profile'),
        },
      },
      put: {
        tags: ['Patients'],
        summary: 'Update authenticated patient profile',
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  bloodType: { type: 'string', nullable: true },
                  allergies: { type: 'string', nullable: true },
                  emergencyContact: { type: 'string', nullable: true },
                  emergencyPhone: { type: 'string', nullable: true },
                  insuranceProvider: { type: 'string', nullable: true },
                  insuranceNumber: { type: 'string', nullable: true },
                  profileImage: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse('Updated patient profile', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  patient: { $ref: '#/components/schemas/PatientProfile' },
                },
              },
            },
          }),
          403: errorResponse('Not a patient'),
          404: errorResponse('Patient profile not found'),
          500: errorResponse('Update failed'),
        },
      },
    },
    '/patients/{id}/dashboard/stats': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient dashboard stats',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: successResponse('Patient dashboard stats', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  totalAppointments: { type: 'integer' },
                  todayAppointments: { type: 'integer' },
                  completedAppointments: { type: 'integer' },
                  pendingAppointments: { type: 'integer' },
                  requestedAppointments: { type: 'integer' },
                  scheduledAppointments: { type: 'integer' },
                  queue: {
                    type: 'object',
                    properties: {
                      profileComplete: { type: 'boolean' },
                      pendingActions: { type: 'integer' },
                      needsProfileCompletion: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          }),
          403: errorResponse('Unauthorized'),
          500: errorResponse('Failed'),
        },
      },
    },
    '/patients/{id}/appointments': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient appointments for dashboard',
        security: authSecurity,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
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
          403: errorResponse('Unauthorized'),
          500: errorResponse('Failed'),
        },
      },
    },
    '/doctors': {
      get: {
        tags: ['Doctors'],
        summary: 'List public verified doctors',
        parameters: [
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: successResponse('Doctor list', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  doctors: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PublicDoctorProfile' },
                  },
                },
              },
            },
          }),
          500: errorResponse('Failed'),
        },
      },
    },
    '/doctors/profile': {
      get: {
        tags: ['Doctors'],
        summary: 'Get authenticated doctor profile',
        security: authSecurity,
        responses: {
          200: successResponse('Doctor profile', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  doctor: { $ref: '#/components/schemas/DoctorProfile' },
                },
              },
            },
          }),
          403: errorResponse('Not a doctor'),
          404: errorResponse('Doctor profile not found'),
          500: errorResponse('Failed'),
        },
      },
      put: {
        tags: ['Doctors'],
        summary: 'Update authenticated doctor profile',
        security: authSecurity,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            additionalProperties: true,
          }),
        },
        responses: {
          200: successResponse('Updated doctor profile', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  doctor: { $ref: '#/components/schemas/DoctorProfile' },
                },
              },
            },
          }),
          403: errorResponse('Not a doctor'),
          404: errorResponse('Doctor profile not found'),
          500: errorResponse('Update failed'),
        },
      },
    },
    '/doctors/upload-image': {
      post: {
        tags: ['Doctors'],
        summary: 'Upload doctor profile image',
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
        responses: {
          200: successResponse('Image uploaded', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  imageUrl: { type: 'string' },
                },
              },
            },
          }),
          400: errorResponse('No image file uploaded'),
          403: errorResponse('Not a doctor'),
          404: errorResponse('Doctor profile not found'),
          500: errorResponse('Upload failed'),
        },
      },
    },
    '/doctors/{id}': {
      get: {
        tags: ['Doctors'],
        summary: 'Get public doctor profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: successResponse('Public doctor profile', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  doctor: { $ref: '#/components/schemas/PublicDoctorProfile' },
                },
              },
            },
          }),
          400: errorResponse('Invalid doctor id'),
          404: errorResponse('Doctor not found'),
          500: errorResponse('Failed'),
        },
      },
    },
    '/doctors/{id}/available-slots': {
      get: {
        tags: ['Doctors'],
        summary: 'Get available booking windows for a doctor on a date',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: successResponse('Available booking windows', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  windows: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/AvailableWindow' },
                  },
                  blackout: { type: 'boolean', nullable: true },
                  message: { type: 'string', nullable: true },
                },
              },
            },
          }),
          400: errorResponse('Valid date required'),
          404: errorResponse('Doctor not found'),
          500: errorResponse('Failed'),
        },
      },
    },
    '/doctors/{id}/upcoming-slots': {
      get: {
        tags: ['Doctors'],
        summary: 'Get upcoming availability preview for a doctor',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'days', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: successResponse('Upcoming slots', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  slots: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/UpcomingSlot' },
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
    '/doctors/{id}/ratings': {
      get: {
        tags: ['Doctors'],
        summary: 'Get ratings for a doctor',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: successResponse('Doctor ratings', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  averageRating: { type: 'number' },
                  totalRatings: { type: 'integer' },
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
    '/doctors/{id}/dashboard/stats': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor dashboard stats',
        security: authSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: successResponse('Doctor dashboard stats', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  stats: {
                    type: 'object',
                    properties: {
                      totalAppointments: { type: 'integer' },
                      todayAppointments: { type: 'integer' },
                      completedAppointments: { type: 'integer' },
                      pendingAppointments: { type: 'integer' },
                      requestedAppointments: { type: 'integer' },
                      inProgressAppointments: { type: 'integer' },
                      totalPatients: { type: 'integer' },
                      queue: {
                        type: 'object',
                        properties: {
                          pendingApprovals: { type: 'integer' },
                          todaysCareTasks: { type: 'integer' },
                          outstandingFollowUps: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
          403: errorResponse('Unauthorized'),
          500: errorResponse('Failed'),
        },
      },
    },
    '/doctors/{id}/appointments': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor appointments',
        security: authSecurity,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: successResponse('Doctor appointments', {
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
          403: errorResponse('Unauthorized'),
          500: errorResponse('Failed'),
        },
      },
    },
    '/doctors/{id}/patients': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor patient roster',
        security: authSecurity,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse('Doctor patients', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  patients: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        patientId: { type: 'integer' },
                        user: { $ref: '#/components/schemas/User' },
                        profile: { $ref: '#/components/schemas/PatientMedicalProfile' },
                        totalVisits: { type: 'integer' },
                        lastVisitDate: { type: 'string', format: 'date', nullable: true },
                        nextVisitDate: { type: 'string', format: 'date', nullable: true },
                      },
                    },
                  },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                },
              },
            },
          }),
          403: errorResponse('Unauthorized'),
          500: errorResponse('Failed'),
        },
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
        responses: {
          200: successResponse('Patient context', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  patient: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      user: { $ref: '#/components/schemas/User' },
                      medical: { $ref: '#/components/schemas/PatientMedicalProfile' },
                      summary: {
                        type: 'object',
                        properties: {
                          totalVisitsWithDoctor: { type: 'integer' },
                          recentAppointments: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'integer' },
                                appointmentDate: { type: 'string', format: 'date' },
                                status: { type: 'string' },
                                type: { type: 'string' },
                                window: { type: 'string', nullable: true },
                                serial: { type: 'integer', nullable: true },
                                reason: { type: 'string', nullable: true },
                                symptoms: { type: 'string', nullable: true },
                                hasPrescription: { type: 'boolean' },
                                diagnosis: { type: 'string', nullable: true },
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
          403: errorResponse('Unauthorized'),
          404: errorResponse('Patient not found'),
          500: errorResponse('Failed'),
        },
      },
    },
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
