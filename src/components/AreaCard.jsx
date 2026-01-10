import Icon from "./Icon";

function AreaCard({ areaId, title, tags, onEdit, onDelete }) {
  return (
    <div className="card area-card">
      <div className="area-header">
        <h3>{title}</h3>
        <div className="area-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onEdit?.(areaId)}
          >
            <Icon name="edit" />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => onDelete?.(areaId)}
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>
      <div className="area-tags">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default AreaCard;
