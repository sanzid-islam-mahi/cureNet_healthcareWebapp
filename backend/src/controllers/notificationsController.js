import db from '../models/index.js';

const { Notification } = db;

export async function listForPatient(req, res) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const user = req.user;
    if (user.role !== 'patient' || user.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { unreadOnly } = req.query;

    const where = { patientId };
    if (String(unreadOnly) === 'true') {
      where.readAt = null;
    }

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.json({
      success: true,
      data: {
        notifications: notifications.map((n) => n.get({ plain: true })),
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List notifications error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to get notifications' });
  }
}

export async function markRead(req, res) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const notificationId = parseInt(req.params.notificationId, 10);
    const user = req.user;
    if (user.role !== 'patient' || user.patientId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const notification = await Notification.findOne({
      where: { id: notificationId, patientId },
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.readAt) {
      await notification.update({ readAt: new Date() });
    }

    return res.json({
      success: true,
      data: { notification: notification.get({ plain: true }) },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Mark notification read error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update notification' });
  }
}

