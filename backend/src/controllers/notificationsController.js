import db from '../models/index.js';
import notificationEvents from '../lib/notificationEvents.js';

const { Notification } = db;

function formatNotification(notification) {
  const plain = notification.get ? notification.get({ plain: true }) : notification;
  return {
    id: plain.id,
    type: plain.type,
    title: plain.title,
    message: plain.message,
    link: plain.link,
    metadata: plain.metadata,
    readAt: plain.readAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

export async function list(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const where = { userId };
    if (unreadOnly) where.readAt = null;

    const [notifications, unreadCount] = await Promise.all([
      Notification.findAll({
        where,
        limit,
        order: [['createdAt', 'DESC']],
      }),
      Notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        notifications: notifications.map(formatNotification),
        unreadCount,
      },
    });
  } catch (err) {
    console.error('List notifications error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function stream(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent('connected', { ok: true });

  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  const listener = (payload) => {
    sendEvent('notification', payload);
  };

  notificationEvents.on(`user:${userId}`, listener);

  req.on('close', () => {
    clearInterval(heartbeat);
    notificationEvents.off(`user:${userId}`, listener);
    res.end();
  });
}

export async function markRead(req, res) {
  try {
    const userId = req.user?.id;
    const id = parseInt(req.params.id, 10);
    const notification = await Notification.findByPk(id);
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    if (!notification.readAt) {
      await notification.update({ readAt: new Date() });
    }
    return res.json({ success: true, data: { notification: formatNotification(notification) } });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function markAllRead(req, res) {
  try {
    const userId = req.user?.id;
    await Notification.update(
      { readAt: new Date() },
      { where: { userId, readAt: null } }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}
