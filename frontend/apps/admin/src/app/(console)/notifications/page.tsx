"use client";

import { NotificationsInbox } from "@synclyft/ui/components/NotificationKit";
import { resolveAdminHref } from "@/lib/notificationHref";

export default function AdminNotificationsPage() {
  return <NotificationsInbox resolveHref={resolveAdminHref} />;
}
