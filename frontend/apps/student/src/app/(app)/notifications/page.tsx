"use client";

import { NotificationsInbox } from "@synclyft/ui/components/NotificationKit";
import { resolveStudentHref } from "@/lib/notificationHref";

export default function NotificationsPage() {
  return <NotificationsInbox settingsHref="/settings" resolveHref={resolveStudentHref} />;
}
