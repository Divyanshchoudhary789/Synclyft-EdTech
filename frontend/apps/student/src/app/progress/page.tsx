"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@synclyft/ui/components/Badge";
import { mockProgress } from "@/lib/api/mock";
import { Code2, GitBranch, Trophy, Flame, BookOpen, TrendingUp, ExternalLink } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HEATMAP_COLORS = [
  "#EFEDE7",   // level 0
  "#0F224A",   // level 1
  "#0062FF",   // level 2 — amber mid
  "#0062FF",   // level 3
  "#0062FF",   // level 4
];

const HEATMAP_OPACITIES = [0.5, 0.3, 0.5, 0.75, 1.0];

export default function ProgressPage() {
  const data = mockProgress;
  const [heatmapView, setHeatmapView] = useState<"leetcode" | "github">("leetcode");

  const heatmapData = heatmapView === "leetcode" ? data.leetcode.heatmap : data.github.contributions;

  // Build grid: 52 weeks × 7 days
  const weeks: typeof heatmapData[0][][] = [];
  const totalDays = heatmapData.length;
  for (let w = 0; w < 52; w++) {
    weeks.push(heatmapData.slice(w * 7, w * 7 + 7));
  }

  const githubWeeklyChart = WEEKDAYS.map((day, i) => ({
    day,
    commits: data.github.weeklyData[i] ?? 0,
  }));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--th-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      <Navbar mode="intelligence" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Progress Tracker</p>
          <h1 className="text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Platform intelligence
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>Unified view across all your coding and competitive platforms</p>
        </div>

        {/* LeetCode stats */}
        <div className="card-light p-6 space-y-5" style={{backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)"}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[rgba(0, 98, 255, 0.1)] rounded flex items-center justify-center">
                <Code2 size={16} className="text-(--th-primary-color)" />
              </div>
              <div>
                <h2 className="font-semibold text-(--th-text-primary) text-sm" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>LeetCode</h2>
                <p className="text-xs text-(--th-text-faint) font-mono">arjun_m</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-(--th-primary-color)" />
              <span className="font-mono text-sm font-medium text-(--th-text-muted)">{data.leetcode.streak} day streak</span>
            </div>
          </div>

          {/* LeetCode breakdown */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total", value: data.leetcode.totalSolved, color: "var(--th-text-primary)" },
              { label: "Easy", value: data.leetcode.easy, color: "var(--th-success)" },
              { label: "Medium", value: data.leetcode.medium, color: "var(--th-primary-color)" },
              { label: "Hard", value: data.leetcode.hard, color: "var(--th-error)" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 bg-(--th-bg-secondary) rounded-[8px]">
                <div className="text-lg font-bold mb-0.5" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-xs text-(--th-text-faint)">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Heatmap view toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                {(["leetcode", "github"] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setHeatmapView(view)}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      heatmapView === view
                        ? "bg-[#0062FF] text-[#0B0D10] font-medium"
                        : "bg-[#EFEDE7] text-[#6B7280] hover:text-[#15171C]"
                    }`}
                  >
                    {view === "leetcode" ? "LeetCode" : "GitHub"}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[#9CA3AF]">365 days</span>
            </div>

            {/* Heatmap grid */}
            <div className="overflow-x-auto">
              <div className="flex gap-[3px] min-w-max">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day, di) => (
                      <div
                        key={`${wi}-${di}`}
                        className="w-[10px] h-[10px] rounded-[2px] transition-opacity hover:ring-1 hover:ring-[#0062FF]"
                        style={{
                          backgroundColor: HEATMAP_COLORS[day.level],
                          opacity: HEATMAP_OPACITIES[day.level],
                        }}
                        title={`${day.date}: ${day.count} submissions`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <span className="text-xs text-[#9CA3AF]">Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className="w-[10px] h-[10px] rounded-[2px]"
                  style={{
                    backgroundColor: HEATMAP_COLORS[level as 0|1|2|3|4],
                    opacity: HEATMAP_OPACITIES[level as 0|1|2|3|4],
                  }}
                />
              ))}
              <span className="text-xs text-[#9CA3AF]">More</span>
            </div>
          </div>
        </div>

        {/* GitHub stats */}
        <div className="card-light p-6 space-y-5" style={{backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)"}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[rgba(77,124,255,0.1)] rounded flex items-center justify-center">
                <GitBranch size={16} className="text-(--th-primary-color)" />
              </div>
              <div>
                <h2 className="font-semibold text-(--th-text-primary) text-sm" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>GitHub</h2>
                <p className="text-xs text-(--th-text-faint) font-mono">@{data.github.username}</p>
              </div>
            </div>
            <a
              href={`https://github.com/${data.github.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4D7CFF] hover:underline text-xs flex items-center gap-1"
            >
              View profile <ExternalLink size={10} />
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Commits", value: data.github.totalCommits, icon: GitBranch },
              { label: "Repos", value: data.github.repos, icon: BookOpen },
              { label: "Day streak", value: data.github.streak, icon: Flame },
            ].map((stat) => (
              <div key={stat.label} className="p-3 bg-(--th-bg-secondary) rounded-[8px] flex items-center gap-3">
                <stat.icon size={14} className="text-(--th-primary-color)" />
                <div>
                  <div className="font-bold text-(--th-text-primary) text-sm">{stat.value}</div>
                  <div className="text-xs text-(--th-text-faint)">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly commits bar chart */}
          <div>
            <p className="text-xs text-(--th-text-muted) mb-3">Weekly commit distribution</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={githubWeeklyChart} barGap={2}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#1B1F26", border: "1px solid #2A2F38", borderRadius: 6, fontSize: 12, color: "#C8CDD5" }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="commits" radius={[3, 3, 0, 0]}>
                  {githubWeeklyChart.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.commits > 15 ? "#0062FF" : entry.commits > 8 ? "#4D7CFF" : "#D4D0C5"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform badges */}
        <div>
          <p className="label-caption text-(--th-text-primary) mb-4">Platform ratings & badges</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.platforms.map((platform) => (
              <div key={platform.platform} className="card-light p-4 space-y-3" style={{
                backgroundColor: "var(--th-card-bg)", color: "var(--th-text-primary) "}}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{platform.platform}</span>
                  {platform.badge && <Badge variant="amber">{platform.badge}</Badge>}
                </div>
                <div className="font-mono text-xs text-(--th-text-primary)">@{platform.username}</div>
                <div className="space-y-1">
                  {platform.rating && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-(--th-text-faint)">Rating</span>
                      <span className="font-mono font-medium text-(--th-text-faint) ">{platform.rating}</span>
                    </div>
                  )}
                  {platform.rank && (
                    <div className="flex items-center justify-between text-xs text-(--th-text-faint)">
                      <span>Rank</span>
                      <span className="font-mono text-right">{platform.rank}</span>
                    </div>
                  )}
                  {platform.solved && (
                    <div className="flex items-center justify-between text-xs text-(--th-text-faint)">
                      <span>Solved</span>
                      <span className="font-mono font-medium text-(--th-text-faint)">{platform.solved}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Weekly Report */}
        <div className="card-light p-6" style={{ background: "var(--th-bg)",
          color: "var(--th-text-primary)", fontFamily: "var(--font-body)"
         }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 bg-[rgba(0, 98, 255, 0.12)] rounded flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
            <div>
              <p className="label-caption">AI weekly intelligence</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed">{data.weeklyReport}</p>
        </div>
      </div>
    </div>
  );
}
