"use client";

import { NotificationsInbox } from "@synclyft/ui/components/NotificationKit";
import { resolveOfficerHref } from "@/lib/notificationHref";

export default function OfficerNotificationsPage() {
  return (
    <div className="p-5 sm:p-6 md:p-8">
      <NotificationsInbox settingsHref="/dashboard/settings" resolveHref={resolveOfficerHref} />
    </div>
  );
}
