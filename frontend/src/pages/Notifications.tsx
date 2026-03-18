import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../context/AuthContext';

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

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { notifications: NotificationItem[]; unreadCount: number } }>(
        '/notifications'
      );
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update notification');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notifications marked as read');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update notifications');
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const grouped = useMemo(() => ({
    unread: notifications.filter((notification) => !notification.readAt),
    read: notifications.filter((notification) => notification.readAt),
  }), [notifications]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
            <p className="text-sm text-slate-600">
              Appointment updates such as approvals, rejections, cancellations, and completions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {unreadCount} unread
            </span>
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Unread</h3>
            </header>
            {grouped.unread.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No unread notifications.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {grouped.unread.map((notification) => (
                  <article key={notification.id} className="px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BellIcon className="h-4 w-4 text-blue-600" />
                          <p className="font-semibold text-slate-900">{notification.title}</p>
                        </div>
                        <p className="text-sm text-slate-700">{notification.message}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        {notification.link ? (
                          <Link
                            to={notification.link}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                          >
                            Open
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => markReadMutation.mutate(notification.id)}
                          disabled={markReadMutation.isPending}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Mark read
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Read</h3>
            </header>
            {grouped.read.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No read notifications yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {grouped.read.map((notification) => (
                  <article key={notification.id} className="px-5 py-4 opacity-75">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900">{notification.title}</p>
                      <p className="text-sm text-slate-700">{notification.message}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
