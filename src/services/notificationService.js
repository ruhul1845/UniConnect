import { supabase } from '../supabaseClient';

export const NOTIFICATION_LIMIT = 15;

const TABLE_META = {
  resources: { icon: '📚', color: 'blue', label: 'Resource' },
  products: { icon: '🛒', color: 'purple', label: 'Marketplace item' },
  housing_listings: { icon: '🏠', color: 'green', label: 'Housing listing' },
};

function getNotificationMeta(tableName) {
  return TABLE_META[tableName] || {
    icon: '🔔',
    color: 'blue',
    label: 'Notification',
  };
}

export function formatNotification(row) {
  const meta = getNotificationMeta(row.table_name);
  const itemTitle = row.title || 'Untitled';

  return {
    id: row.id,
    userId: row.user_id,
    updatedBy: row.updated_by,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action || 'updated',
    title: `${meta.label} updated`,
    description: row.message || `${itemTitle} was updated`,
    itemTitle,
    icon: meta.icon,
    color: meta.color,
    read: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

export async function fetchNotifications(userId, limit = NOTIFICATION_LIMIT) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id,user_id,updated_by,table_name,record_id,action,title,message,is_read,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map(formatNotification);
}

export async function markNotificationAsRead(notificationId, userId) {
  if (!notificationId || !userId) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(userId) {
  if (!userId) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

export async function deleteNotification(notificationId, userId) {
  if (!notificationId || !userId) return;

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteAllNotifications(userId) {
  if (!userId) return;

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
