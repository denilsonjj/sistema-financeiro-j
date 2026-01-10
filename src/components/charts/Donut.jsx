import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import LegendItem from "../LegendItem";

function Donut({ segments }) {
  return (
    <div className="donut-wrapper">
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="label"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {segments.map((segment) => (
                <Cell key={segment.label} fill={segment.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
              labelStyle={{ color: "var(--text)", fontWeight: 600 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend">
        {segments.map((seg) => (
          <LegendItem key={seg.label} color={seg.color} label={seg.label} />
        ))}
      </div>
    </div>
  );
}

export default Donut;
