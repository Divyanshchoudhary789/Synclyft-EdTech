"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { 
  Menu, X, Bell, Info, CheckCircle2, AlertTriangle, Trash2, Settings, Plus,
  LayoutDashboard, LineChart, FileText, PlayCircle, Wrench, ShieldCheck,
  ChevronLeft, ChevronRight, University 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useTheme } from "@/lib/theme";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/auth";
import {api} from "@/lib/api/api";

interface NavbarProps {
  mode?: "focus" | "intelligence";
  transparent?: boolean;
}

export function  Navbar({ mode = "intelligence" }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const { user, fetchUser, logout } = useAuthStore();
  const [notificationsData, setNotificationsData] = useState([]);

  // Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      type: "success",
      message: "New company: Zepto is now on Synclyft. Practice now.",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: "n2",
      type: "info",
      message: "Your Coding round score improved by +7 points.",
      timestamp: "1 day ago",
      read: false,
    },
    {
      id: "n3",
      type: "warning",
      message: "System Design is your weakest area. 3 recommendations added.",
      timestamp: "2 days ago",
      read: true,
    },
  ]);

  const isAdmin = user?.role === "super-admin" || user?.role === "admin";
  const isOfficer = user?.role === "officer" || user?.role === "college-admin";

  const dynamicLinks = isAdmin
    ? [
        { label: "Admin Console", href: "/super-admin", icon: ShieldCheck },
        { label: "Pending College Approvels", href: "/super-admin/pending-colleges", icon: University  },
      ]
    : isOfficer
    ? [
        { label: "Officer Portal", href: "/officer", icon: ShieldCheck },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Progress", href: "/progress", icon: LineChart },
        { label: "Resume", href: "/resume", icon: FileText },
        { label: "Practice", href: "/practice/single-round", icon: PlayCircle },
        { label: "Tools", href: "/tools/ats-analyzer", icon: Wrench },
      ];

  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Sidebar is open if it is manually expanded or temporarily hovered
  const isOpen = isExpanded || isHovered;

  const getInitials = (name: string) => {
    if (!name) return "AM";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const profilePic = user?.profilePicture || user?.avatarUrl || user?.avatar;

  // getting current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const userData = await fetchUser();
      if (!userData) {
        router.push("/login");
      }
    };

    getCurrentUser();
  }, [fetchUser, router]);

  const handleLogout = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    try {
      const logou = await api.post('auth/logout');
      if (logou.status === 200) {
        console.log('logout', logou);
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/login");
      }
    } catch(err : any) {
      console.log('error', err.message);
    }
  };

  const Handlenotifications = async () => {
    try {
      const res = await api.get('/notifications');
      console.log("notification", res.data.data);
      if (res?.data?.data) {
        setNotifications(res.data.data);
        setNotificationsData(res.data.data);
      }
    } catch (error: any) {
      console.log(`err ${error.message}`);
    }
  };

  useEffect(() => {
    let isMounted = true;
    api.get('/notifications')
      .then((res) => {
        if (isMounted && res?.data?.data) {
          setNotifications(res.data.data);
          setNotificationsData(res.data.data);
        }
      })
      .catch((error: any) => {
        console.log(`err ${error.message}`);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sidebar Layout Shift Helper
  useEffect(() => {
    document.body.classList.add("has-sidebar");
    if (isOpen) {
      document.body.classList.add("has-sidebar-expanded");
      document.body.classList.remove("has-sidebar-collapsed");
    } else {
      document.body.classList.add("has-sidebar-collapsed");
      document.body.classList.remove("has-sidebar-expanded");
    }
    return () => {
      document.body.classList.remove("has-sidebar", "has-sidebar-expanded", "has-sidebar-collapsed");
    };
  }, [isOpen]);

  // Scroll handler for mobile header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const hasUnread = notifications.some((n) => !n.read);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const sidebarRef = useRef<HTMLElement>(null);
  
  // Dedicated refs to avoid desktop/mobile collisions
  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const desktopProfileRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  // Defer menu closures slightly to ensure Next.js transitions process correctly
  const closeDropdownsDeferred = () => {
    setTimeout(() => {
      setProfileOpen(false);
      setNotifOpen(false);
      setMobileOpen(false);
    }, 50);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      const clickedInsideNotif = 
        (desktopNotifRef.current && desktopNotifRef.current.contains(target)) ||
        (mobileNotifRef.current && mobileNotifRef.current.contains(target));
        
      const clickedInsideProfile = 
        (desktopProfileRef.current && desktopProfileRef.current.contains(target)) ||
        (mobileProfileRef.current && mobileProfileRef.current.contains(target));

      if (!clickedInsideNotif) {
        setNotifOpen(false);
      }
      if (!clickedInsideProfile) {
        setProfileOpen(false);
      }

      // Collapse sidebar when clicking outside (and not on top header bar)
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        const isHeaderClick = event.target && (event.target as Element).closest('header');
        if (!isHeaderClick) {
          setIsExpanded(false);
          setIsHovered(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 bottom-0 h-screen z-40 hidden md:flex flex-col justify-between border-r transition-all duration-300 ease-in-out",
          isOpen ? "w-64 shadow-2xl backdrop-blur-md" : "w-[72px]"
        )}
        style={{
          backgroundColor: "var(--th-nav-bg)",
          borderColor: "var(--th-nav-border)",
        }}
        onMouseEnter={() => {
          if (!isExpanded) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (!isExpanded) {
            setNotifOpen(false);
            setProfileOpen(false);
          }
        }}
      >
        {/* Logo */}
        <div className="p-4 flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 px-2 h-20 border-b border-dashed" style={{ borderColor: "var(--th-border)" }}>
            <Logo size={28} className="shrink-0" />
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-sm tracking-tight whitespace-nowrap"
                style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}
              >
                Synclyft AI
              </motion.span>
            )}
          </Link>
        </div>

         {/* Sidebar Links */}
        <div className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto scrollbar-hide">
          {dynamicLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            const LinkIcon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all duration-200 relative group hover:bg-slate-900/5 dark:hover:bg-white/5 hover:text-[#0058E8]",
                  isOpen ? "px-4 py-2.5 gap-3" : "w-10 h-10 mx-auto justify-center"
                )}
                style={{
                  color: isActive ? "#0058E8" : "var(--th-text-muted)",
                  backgroundColor: isActive ? "rgba(0, 98, 255, 0.08)" : "transparent",
                }}
                title={!isOpen ? link.label : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#035dece7] rounded-r" />
                )}
                <LinkIcon size={18} className="shrink-0" />
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="whitespace-nowrap"
                  >
                    {link.label}
                  </motion.span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-dashed" style={{ borderColor: "var(--th-border)" }} />

          {(isOfficer || isAdmin) && (
            <Link
              href="/officer"
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-200 hover:bg-slate-900/5 dark:hover:bg-white/5 hover:text-[#0062FF]",
                isOpen ? "px-4 py-2.5 gap-3" : "w-10 h-10 mx-auto justify-center"
              )}
              style={{
                color: pathname.startsWith("/officer") ? "#0062FF" : "var(--th-text-muted)",
                backgroundColor: pathname.startsWith("/officer") ? "rgba(0, 98, 255, 0.08)" : "transparent",
              }}
              title={!isOpen ? "Officer Portal" : undefined}
            >
              <ShieldCheck size={18} className="shrink-0" />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-nowrap"
                >
                  Officer Portal
                </motion.span>
              )}
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/super-admin"
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-200 hover:bg-slate-900/5 dark:hover:bg-white/5 hover:text-[#0062FF] mt-1.5",
                isOpen ? "px-4 py-2.5 gap-3" : "w-10 h-10 mx-auto justify-center"
              )}
              style={{
                color: pathname === "/super-admin" ? "#0062FF" : "var(--th-text-muted)",
                backgroundColor: pathname === "/super-admin" ? "rgba(0, 98, 255, 0.08)" : "transparent",
              }}
              title={!isOpen ? "Admin Console" : undefined}
            >
              <ShieldCheck size={18} className="shrink-0" />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-nowrap"
                >
                  Admin Console
                </motion.span>
              )}
            </Link>
          )}
        </div>

        {/* Settings Link at the bottom */}
        <div className="p-4 border-t" style={{ borderColor: "var(--th-nav-border)" }}>
          <Link
            href="/settings"
            className={cn(
              "flex items-center rounded-xl text-sm font-medium transition-all duration-200 hover:bg-slate-900/5 dark:hover:bg-white/5 hover:text-[#0062FF]",
              isOpen ? "px-4 py-2.5 gap-3" : "w-10 h-10 mx-auto justify-center"
            )}
            style={{
              color: pathname === "/settings" ? "#0062FF" : "var(--th-text-muted)",
              backgroundColor: pathname === "/settings" ? "rgba(0, 98, 255, 0.08)" : "transparent",
            }}
            title={!isOpen ? "Settings" : undefined}
          >
            <Settings size={18} className="shrink-0" />
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </Link>
        </div>
      </aside>

      {/* ── DESKTOP TOP HEADER NAVBAR ── */}
      <header
        className={cn(
          "fixed top-0 right-0 h-20 border-b z-30 hidden md:flex items-center justify-between px-6 transition-all duration-300",
          isOpen ? "left-64" : "left-[72px]"
        )}
        style={{
          backgroundColor: "var(--th-nav-bg)",
          borderColor: "var(--th-nav-border)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {/* Left Section: Expand / Collapse Toggle Trigger */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors border"
            style={{ 
              color: "var(--th-text-muted)",
              borderColor: "var(--th-nav-border)"
            }}
            title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Right Section: CTA + Notifications + Profile Avatar */}
        <div className="flex items-center gap-4">
          {/* Start Interview CTA */}
          <Link href="/interview/setup">
            <Button icon={<Plus size={14} />} className="text-l w-fit font-semibold py-1.5 px-4 shadow-sm shadow-[#0062FF]/10">
              Start Interview
            </Button>
          </Link>

          {/* Notifications Trigger */}
          <div 
            className="relative" 
            ref={desktopNotifRef}
            onMouseEnter={() => setNotifOpen(true)}
            onMouseLeave={() => setNotifOpen(false)}
          >
            <button
              onClick={(e) => { 
                setNotifOpen(true);
                Handlenotifications();
              }}
              className="relative p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors border"
              style={{ 
                color: "var(--th-text-muted)",
                borderColor: "var(--th-nav-border)"
              }}
              title="Notifications"
            >
              <Bell size={16} />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#0062FF] rounded-full" />
              )}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 top-full pt-2 w-80 z-50 transition-all duration-200"
              >
                <div
                  className="rounded-xl border shadow-2xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--th-card-bg)",
                    borderColor: "var(--th-card-border)",
                  }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--th-card-border)" }}>
                    <span className="font-bold text-xs">Notifications</span>
                    {hasUnread && (
                      <button onClick={markAllAsRead} className="text-[10px] text-[#0062FF] hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: "var(--th-card-border)" }}>
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">No notifications</p>
                    ) : (
                      notifications.map((n) => {
                        const Icon = n.type === "success"
                          ? CheckCircle2
                          : n.type === "warning"
                            ? AlertTriangle
                            : Info;
                        const iconColor = n.type === "success"
                          ? "#3DDC84"
                          : n.type === "warning"
                            ? "#FF5C5C"
                            : "#0062FF";

                        return (
                          <div
                            key={n.id}
                            className={cn(
                              "p-3 flex items-start gap-2.5 relative transition-colors cursor-pointer text-left",
                              !n.read && "bg-[#0062FF]/5"
                            )}
                            onClick={() => toggleRead(n.id)}
                          >
                            <Icon size={14} className="mt-0.5 shrink-0" style={{ color: iconColor }} />
                            <div className="flex-1 space-y-0.5">
                              <p className="text-xs leading-normal" style={{ color: n.read ? "var(--th-text-secondary)" : "var(--th-text-primary)" }}>
                                {n.message}
                              </p>
                              <span className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>
                                {n.timestamp}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(n.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 rounded opacity-70 hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown Trigger */}
          <div 
            className="relative" 
            ref={desktopProfileRef}
            onMouseEnter={() => setProfileOpen(true)}
            onMouseLeave={() => setProfileOpen(false)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setProfileOpen(true); }}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0062FF] to-[#4D7CFF] flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden">
                {profilePic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePic} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.name || "Arjun Mehta")
                )}
              </div>
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full pt-2 w-48 z-50 transition-all duration-200"
              >
                <div
                  className="rounded-xl border shadow-2xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--th-card-bg)",
                    borderColor: "var(--th-card-border)",
                  }}
                >
                  <div className="p-1">
                    <Link
                      href="/settings"
                      onClick={closeDropdownsDeferred}
                      className="block px-4 py-2 text-xs rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-left"
                      style={{ color: "var(--th-text-secondary)" }}
                    >
                      Profile & Settings
                    </Link>
                    <Link
                      href="/billing"
                      onClick={closeDropdownsDeferred}
                      className="block px-4 py-2 text-xs rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-left"
                      style={{ color: "var(--th-text-secondary)" }}
                    >
                      Billing & Plans
                    </Link>
                    <Link
                      href="/progress"
                      onClick={closeDropdownsDeferred}
                      className="block px-4 py-2 text-xs rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-left"
                      style={{ color: "var(--th-text-secondary)" }}
                    >
                      Progress & History
                    </Link>
                    <Link
                      href="/tools/resumehistory"
                      onClick={closeDropdownsDeferred}
                      className="block px-4 py-2 text-xs rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-left"
                      style={{ color: "var(--th-text-secondary)" }}
                    >
                      Resumes History
                    </Link>
                    <div className="border-t my-1" style={{ borderColor: "var(--th-card-border)" }} />
                    <button
                      onClick={handleLogout}
                      className="w-full block px-4 py-2 text-xs font-semibold rounded-lg transition-colors hover:bg-red-500/10 text-red-500 text-left border-0 cursor-pointer bg-transparent"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MOBILE TOP HEADER ── */}
      <nav
        className={cn(
          "sticky top-0 z-50 md:hidden border-b transition-transform duration-300",
          visible ? "translate-y-0" : "-translate-y-full"
        )}
        style={{
          backgroundColor: "var(--th-nav-bg)",
          borderColor: "var(--th-nav-border)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Logo size={28} />
              <span
                className="font-semibold text-sm tracking-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}
              >
                Synclyft AI
              </span>
            </Link>

            {/* Right side controls (Notifications, Mobile Profile + Toggle) */}
            <div className="flex items-center gap-2">
              <div className="relative" ref={mobileNotifRef}>
                <button
                  onClick={() => {
                    const nextState = !notifOpen;
                    setNotifOpen(nextState);
                    if (nextState) {
                      Handlenotifications();
                    }
                  }}
                  className="relative p-2 rounded transition-colors"
                  style={{ color: "var(--th-text-muted)" }}
                >
                  <Bell size={16} />
                  {hasUnread && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#0062FF] rounded-full" />
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="fixed right-4 top-14 w-[calc(100vw-32px)] max-w-[320px] rounded-xl border shadow-xl overflow-hidden z-50"
                    style={{
                      backgroundColor: "var(--th-card-bg)",
                      borderColor: "var(--th-card-border)",
                    }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--th-card-border)" }}>
                      <span className="font-bold text-xs">Notifications</span>
                      {hasUnread && (
                        <button onClick={markAllAsRead} className="text-[10px] text-[#0062FF] hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: "var(--th-card-border)" }}>
                      {notifications.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-400">No notifications</p>
                      ) : (
                        notifications.map((n) => {
                          const Icon = n.type === "success"
                            ? CheckCircle2
                            : n.type === "warning"
                              ? AlertTriangle
                              : Info;
                          const iconColor = n.type === "success"
                            ? "#3DDC84"
                            : n.type === "warning"
                              ? "#FF5C5C"
                              : "#0062FF";

                          return (
                            <div
                              key={n.id}
                              className={cn(
                                "p-3 flex items-start gap-2.5 relative transition-colors cursor-pointer text-left",
                                !n.read && "bg-[#0062FF]/5"
                              )}
                              onClick={() => toggleRead(n.id)}
                            >
                              <Icon size={14} className="mt-0.5 shrink-0" style={{ color: iconColor }} />
                              <div className="flex-1 space-y-0.5 text-left">
                                <p className="text-xs leading-normal" style={{ color: n.read ? "var(--th-text-secondary)" : "var(--th-text-primary)" }}>
                                  {n.message}
                                </p>
                                <span className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>
                                  {n.timestamp}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(n.id);
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 rounded opacity-70 hover:opacity-100 transition-opacity shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Profile Trigger */}
              <div className="relative" ref={mobileProfileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 p-1 rounded transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0062FF] to-[#4D7CFF] flex items-center justify-center text-white font-bold text-[10px] overflow-hidden">
                    {profilePic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profilePic} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user?.name || "Arjun Mehta")
                    )}
                  </div>
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl border shadow-xl overflow-hidden z-50"
                    style={{
                      backgroundColor: "var(--th-card-bg)",
                      borderColor: "var(--th-card-border)",
                    }}
                  >
                    <div className="p-1">
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-xs rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        style={{ color: "var(--th-text-secondary)" }}
                      >
                        Profile & Settings
                      </Link>
                      <Link
                        href="/billing"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-xs rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        style={{ color: "var(--th-text-secondary)" }}
                      >
                        Billing & Plans
                      </Link>
                      <Link
                        href="/tools/resumehistory"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-xs rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        style={{ color: "var(--th-text-secondary)" }}
                      >
                        Resume History
                      </Link>
                      <Link
                        href="/progress"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-xs rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        style={{ color: "var(--th-text-secondary)" }}
                      >
                        Progress & History
                      </Link>
                      <div className="border-t my-1" style={{ borderColor: "var(--th-card-border)" }} />
                      <button
                        onClick={handleLogout}
                        className="w-full block px-4 py-2 text-xs font-semibold rounded-lg transition-colors hover:bg-red-500/10 text-red-500 text-left border-0 cursor-pointer bg-transparent"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Hamburger Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-1.5 rounded transition-colors"
                style={{ color: "var(--th-text-muted)" }}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileOpen && (
          <div
            className="px-4 py-3 space-y-1"
            style={{
              borderTop: "1px solid var(--th-border)",
              backgroundColor: "var(--th-nav-bg)",
            }}
          >
            {dynamicLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm transition-colors text-left"
                  style={{
                    color: isActive ? "#0062FF" : "var(--th-text-muted)",
                    backgroundColor: isActive ? "rgba(0,98,255,0.08)" : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="my-3 border-t" style={{ borderColor: "var(--th-border)" }} />

            {(isOfficer || isAdmin) && (
              <Link
                href="/officer"
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm transition-colors text-left"
                style={{ 
                  color: pathname.startsWith("/officer") ? "#0062FF" : "var(--th-text-muted)",
                  backgroundColor: pathname.startsWith("/officer") ? "rgba(0,98,255,0.08)" : "transparent",
                }}
              >
                Officer Portal
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/super-admin"
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm transition-colors text-left"
                style={{ 
                  color: pathname === "/super-admin" ? "#0062FF" : "var(--th-text-muted)",
                  backgroundColor: pathname === "/super-admin" ? "rgba(0,98,255,0.08)" : "transparent",
                }}
              >
                Admin Console
              </Link>
            )}

            <Link
              href="/interview/setup"
              onClick={() => setMobileOpen(false)}
              className="block mt-2 text-left"
            >
              <Button className="w-full justify-center">
                Start Interview
              </Button>
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
