import Icon from "./Icon";

function Card({ title, icon, children }) {
  return (
    <div className="card chart-card">
      <div className="card-title-row">
        <div className="card-title">
          {icon && <Icon name={icon} />}
          <span>{title}</span>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default Card;
