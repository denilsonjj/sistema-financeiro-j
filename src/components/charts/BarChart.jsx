import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function BarChart({ data }) {
  const hasComparative = data.some(
    (item) => item.receita !== undefined || item.despesa !== undefined
  );
  const chartData = hasComparative
    ? data
    : data.map((item) => ({ ...item, receita: item.value }));

  return (
    <div className="chart-shell bar-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart
          data={chartData}
          margin={{ top: 12, right: 16, left: -6, bottom: 4 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "var(--text)", fontWeight: 600 }}
          />
          <Bar dataKey="receita" fill="var(--primary)" radius={[8, 8, 0, 0]} />
          {hasComparative && (
            <Bar dataKey="despesa" fill="var(--danger)" radius={[8, 8, 0, 0]} />
          )}
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BarChart;
