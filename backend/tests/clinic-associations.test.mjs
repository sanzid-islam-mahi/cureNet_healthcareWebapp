import test from 'node:test';
import assert from 'node:assert/strict';

import db from '../src/models/index.js';

test('clinic-related sequelize associations keep the expected aliases', () => {
  const { Clinic, Doctor, Receptionist, Appointment } = db;

  assert.equal(Doctor.associations.Clinic?.as, 'Clinic');
  assert.equal(Receptionist.associations.Clinic?.as, 'Clinic');
  assert.equal(Appointment.associations.Clinic?.as, 'Clinic');

  assert.equal(Clinic.associations.Doctors?.as, 'Doctors');
  assert.equal(Clinic.associations.Receptionists?.as, 'Receptionists');
  assert.equal(Clinic.associations.Appointments?.as, 'Appointments');
});
