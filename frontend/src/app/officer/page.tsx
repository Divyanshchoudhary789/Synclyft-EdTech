"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import {
  Users, TrendingUp, Award, Activity, ChevronUp, ChevronDown, X,
  Download, Search, Filter, ArrowUpDown, Brain, MessageSquare, BookOpen, Plus,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getGradeColor, getGradeBand } from "@/lib/utils";
import type { BatchStudent } from "@/lib/api/types";
import { api } from "@/lib/api/api";

const columnHelper = createColumnHelper<BatchStudent>();

const DIST_COLORS = ["#3DDC84", "#0062FF", "#4D7CFF", "#FF5C5C"];

interface Batch {
  _id?: string;
  id?: string;
  batchName: string;
  academicYear: string;
  graduationYear: string;
  department: string;
  section: string;
  description: string;
  placementOfficerNotes: string;
  createdAt?: string;
}

export default function OfficerDashboardPage() {
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [nlQuery, setNlQuery] = useState("");
  const [nlAnswer, setNlAnswer] = useState<string | null>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [dashboardData, setdashboardData] = useState<any>(null);

  // Add Batch Modal State
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({
    batchName: "",
    academicYear: "",
    graduationYear: "",
    department: "",
    section: "",
    description: "",
    placementOfficerNotes: " "
  });
  const [creatingBatch, setCreatingBatch] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch organization details (which might contain students or metadata)
      const orgRes = await api.get("college-admin/organization/me");
      console.log("Organization data:", orgRes.data);

      // Fetch students list
      try {
        const studentsRes = await api.get("college-admin/students");
        if (studentsRes.data && Array.isArray(studentsRes.data)) {
          setStudents(studentsRes.data);
        } else if (studentsRes.data?.students && Array.isArray(studentsRes.data.students)) {
          setStudents(studentsRes.data.students);
        }
      } catch (err) {
        console.error("Failed to load students list from API:", err);
      }

      // Fetch Dashboard
      try {
        const dashboardRes = await api.get("college-admin/dashboard");
        console.log("Dashboard Data", dashboardRes.data);
        setdashboardData(dashboardRes.data);
      } catch ( err : any) {
        console.error("Failed to load dashboard data:", err);
      }

      // Fetch batches list
      // try {
      //   const batchesRes = await api.get("college-admin/batches");
      //   if (batchesRes.data && Array.isArray(batchesRes.data)) {
      //     setBatches(batchesRes.data);
      //   } else if (batchesRes.data?.batches && Array.isArray(batchesRes.data.batches)) {
      //     setBatches(batchesRes.data.batches);
      //   }
      // } catch (err) {
      //   console.error("Failed to load batches list from API:", err);
      // }
    } catch (error) {
      console.error("Error loading dashboard info:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBatch(true);
    try {
      const res = await api.post("college-admin/batches", batchForm);
      console.log("Batch created:", res.data);
      setShowAddBatch(false);
      setBatchForm({
        batchName: "",
        academicYear: "",
        graduationYear: "",
        department: "",
        section: "",
        description: "",
        placementOfficerNotes: " "
      });
      // Refresh batch list
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to create batch:", err);
      // Fallback local append for visual testing
      const newBatch: Batch = {
        _id: `batch_${Date.now()}`,
        ...batchForm
      };
      setBatches(prev => [newBatch, ...prev]);
      setShowAddBatch(false);
      setBatchForm({
        batchName: "",
        academicYear: "",
        graduationYear: "",
        department: "",
        section: "",
        description: "",
        placementOfficerNotes: " "
      });
    } finally {
      setCreatingBatch(false);
    }
  };

  // Compute dynamic metrics from fetched students
  const totalStudents = students.length;
  const avgReadiness = totalStudents 
    ? Math.round(students.reduce((acc, curr) => acc + (curr.readinessScore || 0), 0) / totalStudents)
    : 0;
  const placedStudents = students.filter(s => s.grade === "A" || s.readinessScore > 85).length; // Mock criterion or mapping
  const activeToday = Math.max(0, Math.round(totalStudents * 0.45)); // Approximation or mapping

  // Compute dynamic distribution
  const lowCount = students.filter(s => s.readinessScore < 50).length;
  const midCount = students.filter(s => s.readinessScore >= 50 && s.readinessScore < 70).length;
  const highCount = students.filter(s => s.readinessScore >= 70 && s.readinessScore < 85).length;
  const topCount = students.filter(s => s.readinessScore >= 85).length;

  const distribution = [
    { band: "Top Performers (85+)", count: topCount },
    { band: "High Readiness (70-85)", count: highCount },
    { band: "Average (50-70)", count: midCount },
    { band: "Needs Attention (<50)", count: lowCount }
  ];

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.college && s.college.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => <span className="font-mono text-xs text-[var(--th-text-secondary)]">{(info.getValue() || "").slice(0, 8)}</span>,
    }),
    columnHelper.accessor("name", {
      header: "Student",
      cell: (info) => (
        <div>
          <div className="text-sm text-[var(--th-text-primary)] font-medium">{info.getValue()}</div>
          <div className="text-xs font-mono text-[var(--th-text-secondary)]">{info.row.original.college || "N/A"}</div>
        </div>
      ),
    }),
    columnHelper.accessor("readinessScore", {
      header: "Score",
      cell: (info) => {
        const score = info.getValue() || 0;
        const color = getGradeColor(getGradeBand(score));
        return <span className="font-mono font-medium text-sm" style={{ color }}>{score}</span>;
      },
    }),
    columnHelper.accessor("grade", {
      header: "Grade",
      cell: (info) => {
        const score = info.row.original.readinessScore || 0;
        const band = getGradeBand(score);
        const v = band === "high" ? "verdant" : band === "mid" ? "amber" : "coral";
        return <Badge variant={v as "verdant" | "amber" | "coral"}>{info.getValue() || "N/A"}</Badge>;
      },
    }),
    columnHelper.accessor("sessionsCompleted", {
      header: "Sessions",
      cell: (info) => <span className="font-mono text-xs text-[var(--th-text-muted)]">{info.getValue() || 0}</span>,
    }),
    columnHelper.accessor("lastActive", {
      header: "Last active",
      cell: (info) => (
        <span className="font-mono text-xs text-[var(--th-text-muted)]">
          {info.getValue() ? new Date(info.getValue()).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "N/A"}
        </span>
      ),
    }),
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleNLQuery = async () => {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setNlLoading(false);
    setNlAnswer(
      `Based on current data: ${topCount} students score above 85 (top performers). The average readiness score is ${avgReadiness}/100. ${lowCount} students require focus support (scores under 50).`
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--th-text-faint)]">
        Loading placement intelligence data...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-7 text-[var(--th-text-primary)] text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="label-caption text-[var(--th-text-secondary)] mb-1">Placement Officer Portal</p>
          <h1
            className="text-[1.75rem] font-bold text-[var(--th-text-primary)] tracking-tight"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
          >
            Batch intelligence
          </h1>
        </div>
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" icon={<Download size={13} />}>Export CSV</Button>
          <Button size="sm" icon={<Download size={13} />}>AI report</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total students", value: totalStudents, icon: Users, color: "#4D7CFF" },
          { label: "Avg readiness", value: avgReadiness, icon: TrendingUp, suffix: "/100", color: "#0062FF" },
          { label: "Top scorers", value: placedStudents, icon: Award, color: "#3DDC84" },
          { label: "Active today", value: activeToday, icon: Activity, color: "#FF5C5C" },
        ].map((kpi) => (
          <div key={kpi.label} className="card-light p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--th-text-secondary)]">{kpi.label}</span>
              <div
                className="w-7 h-7 rounded flex items-center justify-center"
                style={{ backgroundColor: kpi.color + "18" }}
              >
                <kpi.icon size={13} style={{ color: kpi.color }} />
              </div>
            </div>
            <div
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: kpi.color }}
            >
              <CountUp end={kpi.value} duration={800} />
              {kpi.suffix && <span className="text-sm text-[var(--th-text-secondary)] font-normal ml-0.5">{kpi.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Distribution chart + NL query */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Grade distribution */}
        <div className="card-light p-5">
          <p className="label-caption text-[var(--th-text-secondary)] mb-4">Readiness distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={distribution} margin={{ left: -20 }}>
              <XAxis dataKey="band" tick={{ fontSize: 10, fill: "var(--th-text-secondary)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--th-text-secondary)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--th-bg-secondary)", border: "1px solid var(--th-border)", borderRadius: 6, fontSize: 12, color: "var(--th-text-primary)" }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distribution.map((_, i) => (
                  <Cell key={i} fill={DIST_COLORS[i] ?? "var(--th-text-secondary)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* NL Query interface */}
        <div className="card-light p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-[#0062FF]" />
            <p className="label-caption text-[var(--th-text-secondary)]">Natural language query</p>
          </div>

          <div className="flex gap-2">
            <input
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNLQuery()}
              className="input-light flex-1 !text-sm"
              placeholder="Who are the top performers? Show coding weak spots..."
            />
            <Button size="sm" onClick={handleNLQuery} loading={nlLoading} icon={<MessageSquare size={12} />}>
              Ask
            </Button>
          </div>

          {nlAnswer && (
            <div className="p-3 bg-[var(--th-bg-secondary)] rounded border border-[var(--th-border)]">
              <p className="text-xs text-[var(--th-text-faint)] leading-relaxed">{nlAnswer}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {[
              "Top performers this week",
              "Lowest scores",
              "Students needing support",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setNlQuery(q)}
                className="px-2.5 py-1 bg-[var(--th-bg-secondary)] border border-[var(--th-border)] rounded text-[0.65rem] text-[var(--th-text-secondary)] hover:text-[var(--th-text-muted)] hover:border-[var(--th-text-secondary)] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BATCHES SECTION ── */}
      <div className="card-light p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[#0062FF]" />
            <h2 className="text-sm font-bold text-[var(--th-text-primary)]">Batches List</h2>
          </div>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAddBatch(true)}>
            Add Batch
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--th-border)]">
                <th className="py-2.5 text-left text-xs font-bold text-[var(--th-text-secondary)]">Batch Name</th>
                <th className="py-2.5 text-left text-xs font-bold text-[var(--th-text-secondary)]">Department & Sec</th>
                <th className="py-2.5 text-left text-xs font-bold text-[var(--th-text-secondary)]">Academic/Grad Year</th>
                <th className="py-2.5 text-left text-xs font-bold text-[var(--th-text-secondary)]">Description</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, index) => (
                <tr key={batch._id || batch.id || index} className="border-b last:border-0 border-[var(--th-bg-secondary)] hover:bg-[var(--th-hover-bg)] transition-colors">
                  <td className="py-3 font-semibold text-xs text-[var(--th-text-primary)]">{batch.batchName}</td>
                  <td className="py-3 text-xs text-[var(--th-text-secondary)]">
                    {batch.department} - Section {batch.section}
                  </td>
                  <td className="py-3 text-xs text-[var(--th-text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="opacity-60" />
                      <span>{batch.academicYear} (Grad {batch.graduationYear})</span>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-[var(--th-text-secondary)] max-w-xs truncate" title={batch.description}>
                    {batch.description || "N/A"}
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-[var(--th-text-faint)]">
                    No active batches registered. Click Add Batch to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student table */}
      <div className="card-light overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--th-border)]">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--th-text-secondary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-light !pl-8 !text-xs"
              placeholder="Search by name, email, college..."
            />
          </div>
          <button className="btn-ghost flex items-center gap-1.5 text-xs">
            <Filter size={12} /> Filter
          </button>
          <p className="text-xs text-[var(--th-text-secondary)] ml-auto font-mono">{filtered.length} students</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[var(--th-border)]">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "flex items-center gap-1.5 label-caption text-[var(--th-text-secondary)] hover:text-[var(--th-text-muted)] transition-colors",
                            header.column.getCanSort() ? "cursor-pointer" : "cursor-default"
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown size={11} className="opacity-40" />
                          )}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--th-bg-secondary)] hover:bg-[var(--th-hover-bg)] transition-colors cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[var(--th-text-secondary)] text-sm">No students match your search.</p>
          </div>
        )}
      </div>

      {/* ── ADD BATCH MODAL ── */}
      {showAddBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg p-6 rounded-2xl border space-y-4 shadow-2xl relative"
            style={{
              backgroundColor: "var(--th-card-bg)",
              borderColor: "var(--th-card-border)"
            }}
          >
            <button 
              onClick={() => setShowAddBatch(false)}
              className="absolute right-4 top-4 p-1 text-[var(--th-text-faint)] hover:text-[var(--th-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
              <BookOpen size={18} className="text-[#0062FF]" />
              <h3 className="text-sm font-bold text-[var(--th-text-primary)]">Add Academic Batch</h3>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3.5">
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Batch Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)]">Batch Name</label>
                  <input
                    type="text"
                    value={batchForm.batchName}
                    onChange={(e) => setBatchForm({ ...batchForm, batchName: e.target.value })}
                    className="input-light !text-xs"
                    placeholder="B.Tech CS 2026"
                    required
                  />
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)]">Department</label>
                  <input
                    type="text"
                    value={batchForm.department}
                    onChange={(e) => setBatchForm({ ...batchForm, department: e.target.value })}
                    className="input-light !text-xs"
                    placeholder="Computer Science"
                    required
                  />
                </div>

                {/* Academic Year */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)]">Academic Year</label>
                  <input
                    type="text"
                    value={batchForm.academicYear}
                    onChange={(e) => setBatchForm({ ...batchForm, academicYear: e.target.value })}
                    className="input-light !text-xs"
                    placeholder="2025-2026"
                    required
                  />
                </div>

                {/* Graduation Year */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)]">Graduation Year</label>
                  <input
                    type="text"
                    value={batchForm.graduationYear}
                    onChange={(e) => setBatchForm({ ...batchForm, graduationYear: e.target.value })}
                    className="input-light !text-xs"
                    placeholder="2026"
                    required
                  />
                </div>

                {/* Section */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)]">Section</label>
                  <input
                    type="text"
                    value={batchForm.section}
                    onChange={(e) => setBatchForm({ ...batchForm, section: e.target.value })}
                    className="input-light !text-xs"
                    placeholder="A / B / C"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)]">Description</label>
                  <textarea
                    value={batchForm.description}
                    onChange={(e) => setBatchForm({ ...batchForm, description: e.target.value })}
                    className="input-light !text-xs h-16 resize-none"
                    placeholder="CS engineering senior batch..."
                    required
                  />
                </div>

                {/* Placement Officer Notes */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)]">Officer Notes</label>
                  <textarea
                    value={batchForm.placementOfficerNotes}
                    onChange={(e) => setBatchForm({ ...batchForm, placementOfficerNotes: e.target.value })}
                    className="input-light !text-xs h-16 resize-none"
                    placeholder="Critical preparation goals, criteria..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <Button type="button" variant="secondary" onClick={() => setShowAddBatch(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingBatch}>
                  {creatingBatch ? "Creating..." : "Create Batch"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
