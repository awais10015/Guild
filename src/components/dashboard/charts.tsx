"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#0d9488", "#f59e0b", "#0f766e", "#84cc16", "#b45309", "#64748b"];

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#38bdf8",
  quotation_sent: "#a78bfa",
  confirmed: "#0d9488",
  in_progress: "#0ea5e9",
  completed: "#22c55e",
  cancelled: "#94a3b8",
  rejected: "#ef4444",
  disputed: "#fb923c",
};

export function BookingsPerDayChart({ data }: { data: { _id: string; count: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="bkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
          <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} fill="url(#bkFill)" name="Bookings" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({ data }: { data: { _id: string; count: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="_id" innerRadius={55} outerRadius={90} paddingAngle={3}>
            {data.map((d) => (
              <Cell key={d._id} fill={STATUS_COLORS[d._id] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {data.map((d) => (
          <span key={d._id} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[d._id] ?? "#94a3b8" }} />
            {d._id.replace("_", " ")} ({d.count})
          </span>
        ))}
      </div>
    </div>
  );
}

export function CategoryBarChart({ data }: { data: { name: string | null; count: number }[] }) {
  const filled = data.map((d) => ({ ...d, name: d.name ?? "Other" }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filled} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {filled.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
