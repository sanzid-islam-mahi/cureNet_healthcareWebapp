import db from '../models/index.js';

const { Rating, Appointment } = db;

export async function getByDoctor(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    const ratings = await Rating.findAll({
      where: { doctorId },
      attributes: ['id', 'rating', 'review', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    const total = ratings.length;
    const sum = ratings.reduce((s, r) => s + r.rating, 0);
    const averageRating = total ? Math.round((sum / total) * 10) / 10 : 0;
    return res.json({
      success: true,
      data: {
        summary: { averageRating, totalRatings: total },
        ratings: ratings.map((r) => r.get({ plain: true })),
      },
    });
  } catch (err) {
    console.error('Get doctor ratings error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getMyRatings(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }
    const ratings = await Rating.findAll({
      where: { patientId: user.patientId },
      attributes: ['id', 'doctorId', 'appointmentId', 'rating', 'review', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    return res.json({
      success: true,
      data: { ratings: ratings.map((r) => r.get({ plain: true })) },
    });
  } catch (err) {
    console.error('Get my ratings error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function create(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'patient' || !user.patientId) {
      return res.status(403).json({ success: false, message: 'Not a patient' });
    }
    const { doctorId, appointmentId, rating, review } = req.body;
    if (!doctorId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'doctorId and rating (1-5) required' });
    }
    const docId = parseInt(doctorId, 10);
    if (appointmentId) {
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment || appointment.patientId !== user.patientId || appointment.doctorId !== docId) {
        return res.status(400).json({ success: false, message: 'Invalid appointment' });
      }
      if (appointment.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Can only rate completed appointments' });
      }
      const existing = await Rating.findOne({ where: { appointmentId } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Already rated this appointment' });
      }
    }
    const created = await Rating.create({
      patientId: user.patientId,
      doctorId: docId,
      appointmentId: appointmentId ? parseInt(appointmentId, 10) : null,
      rating: parseInt(rating, 10),
      review: review || null,
    });
    return res.status(201).json({
      success: true,
      data: { rating: created.get({ plain: true }) },
    });
  } catch (err) {
    console.error('Create rating error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}
