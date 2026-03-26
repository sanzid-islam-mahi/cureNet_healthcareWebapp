export const authSecurity = [{ bearerAuth: [] }, { cookieAuth: [] }];

export function json(schema) {
  return {
    'application/json': {
      schema,
    },
  };
}

export function successResponse(description, schema) {
  return {
    description,
    content: json(schema),
  };
}

export function errorResponse(description = 'Error') {
  return successResponse(description, { $ref: '#/components/schemas/ErrorResponse' });
}

export const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
  },
  required: ['page', 'limit', 'total'],
};
