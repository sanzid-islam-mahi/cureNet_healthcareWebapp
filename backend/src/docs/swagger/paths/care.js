import { authSecurity, errorResponse, json, paginationSchema, successResponse } from '../helpers.js';

export const carePaths = {
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
  '/patients/history': {
    get: {
      tags: ['Patients'],
      summary: 'Get authenticated patient medical history',
      security: authSecurity,
      responses: {
        200: successResponse('Patient medical history', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                summary: { $ref: '#/components/schemas/PatientHistorySummary' },
                history: { $ref: '#/components/schemas/PatientHistoryRecord' },
                timeline: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PatientHistoryTimelineEntry' },
                },
                prescriptions: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PatientHistoryPrescription' },
                },
              },
            },
          },
        }),
        403: errorResponse('Not a patient'),
        404: errorResponse('Patient profile not found'),
        500: errorResponse('Failed to get medical history'),
      },
    },
    put: {
      tags: ['Patients'],
      summary: 'Create or update authenticated patient structured medical history',
      security: authSecurity,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            chronicConditions: {
              oneOf: [
                { type: 'array', items: { type: 'string' } },
                { type: 'string' },
              ],
            },
            pastProcedures: {
              oneOf: [
                { type: 'array', items: { type: 'string' } },
                { type: 'string' },
              ],
            },
            familyHistory: {
              oneOf: [
                { type: 'array', items: { type: 'string' } },
                { type: 'string' },
              ],
            },
            currentLongTermMedications: {
              oneOf: [
                { type: 'array', items: { type: 'string' } },
                { type: 'string' },
              ],
            },
            immunizationNotes: { type: 'string', nullable: true },
            lifestyleRiskNotes: { type: 'string', nullable: true },
            generalMedicalNotes: { type: 'string', nullable: true },
          },
        }),
      },
      responses: {
        200: successResponse('Updated patient medical history', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                history: { $ref: '#/components/schemas/PatientHistoryRecord' },
              },
            },
          },
        }),
        403: errorResponse('Not a patient'),
        500: errorResponse('Failed to update medical history'),
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
};
