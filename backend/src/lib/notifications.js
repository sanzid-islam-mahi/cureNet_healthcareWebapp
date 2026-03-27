import db from '../models/index.js';
import notificationEvents from './notificationEvents.js';

const { Notification } = db;

export async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
  metadata = null,
}) {
  if (!userId || !type || !title || !message) return null;

  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    link,
    metadata,
  });

  notificationEvents.emit(`user:${userId}`, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    metadata: notification.metadata,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  });

  return notification;
}
