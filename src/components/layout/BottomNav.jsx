import Icon from "../Icon";

function BottomNav({ items, active, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`bottom-nav-item ${active === item.id ? "active" : ""}`}
          onClick={() => onNavigate(item.id)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
