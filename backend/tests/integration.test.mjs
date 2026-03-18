import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const RUN_INTEGRATION = process.env.RUN_BACKEND_INTEGRATION === '1';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

function getCookieHeader(response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  return setCookie.split(';')[0];
}

test('health endpoint responds', async (t) => {
  if (!RUN_INTEGRATION) return t.skip('Set RUN_BACKEND_INTEGRATION=1 to run integration tests');
  const { response, body } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body?.success, true);
});

test('auth register/login/profile/forgot/reset-invalid flow', async (t) => {
  if (!RUN_INTEGRATION) return t.skip('Set RUN_BACKEND_INTEGRATION=1 to run integration tests');

  const email = `integration_${Date.now()}@example.com`;
  const password = 'StrongPass123';
  const registerRes = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName: 'Integration',
      lastName: 'User',
      role: 'patient',
    }),
  });
  assert.equal(registerRes.response.status, 201);
  assert.equal(registerRes.body?.success, true);
  const registerCookie = getCookieHeader(registerRes.response);
  assert.ok(registerCookie);

  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(loginRes.response.status, 200);
  assert.equal(loginRes.body?.success, true);
  const authCookie = getCookieHeader(loginRes.response);
  assert.ok(authCookie);

  const profileRes = await request('/api/auth/profile', {
    headers: { Cookie: authCookie },
  });
  assert.equal(profileRes.response.status, 200);
  assert.equal(profileRes.body?.success, true);

  const logoutRes = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: authCookie },
  });
  assert.equal(logoutRes.response.status, 200);
  const clearedCookie = logoutRes.response.headers.get('set-cookie');
  assert.ok(clearedCookie?.includes('Max-Age=0') || clearedCookie?.includes('Expires=Thu, 01 Jan 1970'));
  const clearedCookieHeader = getCookieHeader(logoutRes.response);
  assert.ok(clearedCookieHeader);

  const profileAfterLogoutRes = await request('/api/auth/profile', {
    headers: { Cookie: clearedCookieHeader },
  });
  assert.equal(profileAfterLogoutRes.response.status, 401);

  const forgotRes = await request('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  assert.equal(forgotRes.response.status, 200);
  assert.equal(forgotRes.body?.success, true);

  const resetInvalidRes = await request('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'invalid-token', password: 'AnotherStrong123' }),
  });
  assert.equal(resetInvalidRes.response.status, 400);
});

test('role-based access control blocks non-admin for admin endpoint', async (t) => {
  if (!RUN_INTEGRATION) return t.skip('Set RUN_BACKEND_INTEGRATION=1 to run integration tests');
  const patientToken = process.env.TEST_PATIENT_TOKEN;
  if (!patientToken) return t.skip('Set TEST_PATIENT_TOKEN');

  const res = await request('/api/admin/stats', {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert.equal(res.response.status, 403);
});

test('appointment create and status transitions', async (t) => {
  if (!RUN_INTEGRATION) return t.skip('Set RUN_BACKEND_INTEGRATION=1 to run integration tests');
  const patientToken = process.env.TEST_PATIENT_TOKEN;
  const doctorToken = process.env.TEST_DOCTOR_TOKEN;
  const doctorId = process.env.TEST_DOCTOR_ID;
  const appointmentDate = process.env.TEST_APPOINTMENT_DATE;
  const window = process.env.TEST_APPOINTMENT_WINDOW || 'morning';
  if (!patientToken || !doctorToken || !doctorId || !appointmentDate) {
    return t.skip('Set TEST_PATIENT_TOKEN, TEST_DOCTOR_TOKEN, TEST_DOCTOR_ID, TEST_APPOINTMENT_DATE');
  }

  const create = await request('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      doctorId: Number(doctorId),
      appointmentDate,
      window,
      type: 'in_person',
      reason: 'integration test visit',
    }),
  });
  assert.equal(create.response.status, 201);
  const appointmentId = create.body?.data?.appointment?.id;
  assert.ok(appointmentId);

  const approve = await request(`/api/appointments/${appointmentId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  assert.equal(approve.response.status, 200);

  const start = await request(`/api/appointments/${appointmentId}/start`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  assert.equal(start.response.status, 200);

  const complete = await request(`/api/appointments/${appointmentId}/complete`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  assert.equal(complete.response.status, 200);
});

test('duplicate booking prevention scenario', async (t) => {
  if (!RUN_INTEGRATION) return t.skip('Set RUN_BACKEND_INTEGRATION=1 to run integration tests');
  const patientToken = process.env.TEST_PATIENT_TOKEN;
  const doctorId = process.env.TEST_DOCTOR_ID;
  const appointmentDate = process.env.TEST_CONCURRENCY_DATE;
  const window = process.env.TEST_CONCURRENCY_WINDOW || 'morning';
  if (!patientToken || !doctorId || !appointmentDate) {
    return t.skip('Set TEST_PATIENT_TOKEN, TEST_DOCTOR_ID, TEST_CONCURRENCY_DATE');
  }

  const payload = {
    doctorId: Number(doctorId),
    appointmentDate,
    window,
    type: 'in_person',
    reason: 'concurrency test',
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${patientToken}`,
  };

  const [a, b] = await Promise.all([
    request('/api/appointments', { method: 'POST', headers, body: JSON.stringify(payload) }),
    request('/api/appointments', { method: 'POST', headers, body: JSON.stringify(payload) }),
  ]);
  const statuses = [a.response.status, b.response.status].sort();
  // One request should succeed while the other should be rejected as full/conflict/validation.
  assert.equal(statuses[1], 201);
  assert.ok([400, 409].includes(statuses[0]));
});
