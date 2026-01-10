import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function LineChart({ data, labels, lineColor }) {
  const chartData = Array.isArray(data) && typeof data[0] === "object"
    ? data
    : labels?.length
      ? labels.map((label, index) => ({
          label,
          value: data[index] ?? 0,
        }))
      : (data ?? []).map((value, index) => ({
          label: `#${index + 1}`,
          value,
        }));

  return (
    <div className="chart-shell line-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart
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
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor || "var(--primary)"}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LineChart;
