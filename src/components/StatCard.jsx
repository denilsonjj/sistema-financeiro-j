import Icon from "./Icon";

function StatCard({ title, value, caption, icon, tone, delay }) {
  return (
    <div
      className={`card stat-card ${tone ? `tone-${tone}` : ""}`}
      style={{ "--delay": delay }}
    >
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-caption">{caption}</div>
      </div>
      <div className="icon-badge">
        <Icon name={icon} />
      </div>
    </div>
  );
}

export default StatCard;
