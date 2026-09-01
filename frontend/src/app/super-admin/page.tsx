"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Users, ShieldAlert, Activity, Check, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { api } from "@/lib/api/api";
import { cn } from "@/lib/utils";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "student" | "officer" | "admin";
  college?: string;
  createdAt: string;
}

export default function SuperAdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([
    { id: "u_001", name: "Arjun Mehta", email: "arjun.mehta@iitb.ac.in", role: "student", college: "IIT Bombay", createdAt: "2025-02-18" },
    { id: "u_002", name: "Priya Sharma", email: "priya.sharma@delhi.edu", role: "officer", college: "IIT Delhi", createdAt: "2025-02-19" },
    { id: "u_003", name: "System Admin", email: "admin@synclyft.ai", role: "admin", college: "Synclyft AI", createdAt: "2025-01-01" },
    { id: "u_004", name: "Rohan Gupta", email: "rohan.g@nit.edu", role: "student", college: "NIT Trichy", createdAt: "2025-02-21" },
  ]);

  const [search, setSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempRole, setTempRole] = useState<"student" | "officer" | "admin">("student");
  
  // Platform configs
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [apiLimit, setApiLimit] = useState(100);

  const [saved, setSaved] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleRoleChange = (userId: string, newRole: "student" | "officer" | "admin") => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setEditingUserId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.college && u.college.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "var(--th-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      <Navbar mode="focus" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-4 border-b border-dashed" style={{ borderColor: "var(--th-border)" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--th-text-primary)]">Super Admin Dashboard</h1>
              <p className="text-xs text-[var(--th-text-faint)]">System health diagnostics, global configurations, and role management controls</p>
            </div>
          </div>
          {saved && (
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <Check size={14} /> System state updated!
            </span>
          )}
        </div>

        {/* Diagnostic Overview Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Platform Users", value: users.length, sub: "+12% this week", icon: Users, color: "text-blue-500" },
            { label: "System Health Rate", value: "99.8%", sub: "All services nominal", icon: Activity, color: "text-emerald-500" },
            { label: "Pending Tickets", value: "0", sub: "Clean support inbox", icon: Settings, color: "text-amber-500" },
            { label: "API Requests / Min", value: "1,247", sub: "Rate limits normal", icon: ShieldAlert, color: "text-red-500" },
          ].map((card, i) => (
            <div 
              key={i}
              className="p-5 rounded-2xl border flex items-center justify-between"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
            >
              <div className="space-y-1.5 text-left">
                <p className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">{card.label}</p>
                <p className="text-2xl font-bold text-[var(--th-text-primary)]">{card.value}</p>
                <p className="text-[10px] text-emerald-500">{card.sub}</p>
              </div>
              <div className={cn("p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800", card.color)}>
                <card.icon size={20} />
              </div>
            </div>
          ))}
        </div>

        {/* Double-column section */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Column 1: System Config */}
          <div className="lg:col-span-4 space-y-6">
            <div 
              className="p-6 rounded-2xl border space-y-5 text-left"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
            >
              <h3 className="font-bold text-sm text-[var(--th-text-primary)] border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                System Controls
              </h3>

              {/* Maintenance Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--th-text-primary)]">Maintenance Mode</p>
                  <p className="text-[10px] text-[var(--th-text-faint)]">Lock front-end logins for deployment</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={maintenanceMode} 
                  onChange={(e) => {
                    setMaintenanceMode(e.target.checked);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                  className="w-4 h-4 rounded accent-red-500 cursor-pointer"
                />
              </div>

              {/* Registrations */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--th-text-primary)]">Allow Registrations</p>
                  <p className="text-[10px] text-[var(--th-text-faint)]">Accept new student/company accounts</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={allowRegistration} 
                  onChange={(e) => {
                    setAllowRegistration(e.target.checked);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                  className="w-4 h-4 rounded accent-[#0062FF] cursor-pointer"
                />
              </div>

              {/* API Slider limit */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--th-border)" }}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--th-text-primary)]">Global Rate Limit</span>
                  <span className="font-mono text-[var(--th-text-secondary)]">{apiLimit} req/s</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="500" 
                  value={apiLimit} 
                  onChange={(e) => setApiLimit(parseInt(e.target.value))}
                  onMouseUp={() => {
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#0062FF]"
                />
              </div>
            </div>
          </div>

          {/* Column 2: User management */}
          <div className="lg:col-span-8 space-y-4">
            <div 
              className="p-6 rounded-2xl border text-left space-y-4"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                <h3 className="font-bold text-sm text-[var(--th-text-primary)]">
                  User Management
                </h3>
                
                {/* Search */}
                <input 
                  type="text"
                  placeholder="Search user, email or college..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border text-xs text-[var(--th-text-primary)] max-w-xs"
                  style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--th-border)" }}>
                      <th className="py-2.5 text-[10px] uppercase font-bold text-[var(--th-text-faint)]">User Details</th>
                      <th className="py-2.5 text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Institution</th>
                      <th className="py-2.5 text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Role</th>
                      <th className="py-2.5 text-[10px] uppercase font-bold text-[var(--th-text-faint)] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors" style={{ borderColor: "var(--th-border)" }}>
                        <td className="py-3">
                          <p className="text-xs font-bold text-[var(--th-text-primary)]">{user.name}</p>
                          <p className="text-[10px] text-[var(--th-text-faint)]">{user.email}</p>
                        </td>
                        <td className="py-3 text-xs text-[var(--th-text-secondary)]">
                          {user.college || "N/A"}
                        </td>
                        <td className="py-3 text-xs">
                          {editingUserId === user.id ? (
                            <div className="flex items-center gap-1.5">
                              <select 
                                value={tempRole}
                                onChange={(e) => setTempRole(e.target.value as any)}
                                className="px-2 py-1 rounded border text-[10px] bg-[var(--th-input-bg)] text-[var(--th-text-primary)]"
                                style={{ borderColor: "var(--th-border-strong)" }}
                              >
                                <option value="student">Student</option>
                                <option value="officer">Officer</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button 
                                onClick={() => handleRoleChange(user.id, tempRole)}
                                className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded cursor-pointer border-0 bg-transparent"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            <span 
                              onClick={() => {
                                setEditingUserId(user.id);
                                setTempRole(user.role);
                              }}
                              className="cursor-pointer hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <Badge variant={user.role === "admin" ? "coral" : user.role === "officer" ? "verdant" : "neutral"}>
                                {user.role}
                              </Badge>
                              <Edit3 size={10} className="opacity-50" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1 text-[#FF5C5C] hover:bg-red-500/10 rounded cursor-pointer border-0 bg-transparent"
                            title="Delete User"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-[var(--th-text-faint)]">
                          No users found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
