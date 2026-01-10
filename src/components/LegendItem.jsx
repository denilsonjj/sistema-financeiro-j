function LegendItem({ color, label }) {
  return (
    <div className="legend-item">
      <span className="legend-dot" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

export default LegendItem;
