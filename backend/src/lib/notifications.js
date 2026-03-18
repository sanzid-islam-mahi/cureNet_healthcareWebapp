import db from '../models/index.js';

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

  return Notification.create({
    userId,
    type,
    title,
    message,
    link,
    metadata,
  });
}
