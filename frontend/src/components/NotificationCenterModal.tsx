import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';

interface NotificationCenterModalProps {
  onClose: () => void;
}

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function NotificationCenterModal({ onClose }: NotificationCenterModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { notifications: NotificationItem[]; unreadCount: number } }>(
        '/notifications?limit=40'
      );
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'summary'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to update notification');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'summary'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to update notifications');
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const grouped = useMemo(
    () => ({
      unread: notifications.filter((notification) => !notification.readAt),
      read: notifications.filter((notification) => notification.readAt),
    }),
    [notifications]
  );

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.readAt) {
      await markReadMutation.mutateAsync(notification.id);
    }
    if (notification.link) navigate(notification.link);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-end bg-black/30 p-4 md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mt-16 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-slate-950">Notifications</p>
            <p className="text-sm text-slate-500">Live updates for appointments and reminders.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {unreadCount} unread
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </header>

        <div className="border-b border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">No notifications yet.</div>
          ) : (
            <div className="space-y-4 px-4 py-4">
              <NotificationGroup
                title="Unread"
                items={grouped.unread}
                emptyLabel="No unread notifications."
                onOpen={openNotification}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
              <NotificationGroup
                title="Earlier"
                items={grouped.read}
                emptyLabel="No read notifications yet."
                onOpen={openNotification}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationGroup({
  title,
  items,
  emptyLabel,
  onOpen,
  onMarkRead,
}: {
  title: string;
  items: NotificationItem[];
  emptyLabel: string;
  onOpen: (notification: NotificationItem) => void;
  onMarkRead?: (id: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((notification) => (
            <article key={notification.id} className={`px-4 py-4 ${notification.readAt ? 'opacity-80' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-xl p-2 ${notification.readAt ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                  <BellIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-slate-900">{notification.title}</p>
                  <p className="text-sm text-slate-600">{notification.message}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(notification.createdAt)}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(notification)}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {notification.link ? 'Open' : 'Dismiss'}
                </button>
                {!notification.readAt && onMarkRead ? (
                  <button
                    type="button"
                    onClick={() => onMarkRead(notification.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
