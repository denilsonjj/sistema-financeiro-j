import Icon from "../Icon";

function Sidebar({ items, active, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Icon name="scale" />
        </div>
        <div>
          <div className="brand-title"></div>
          <div className="brand-subtitle">Gestão Financeira</div>
        </div>
      </div>
      <nav className="nav">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <span className="nav-dot" />
          </button>
        ))}
      </nav> 
    </aside>
  );
}

export default Sidebar;
