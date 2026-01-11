import Icon from "../Icon";

function BottomNav({ items, active, onNavigate }) {
  const visibleItems = items.filter((item) => !item.mobileHidden);
  return (
    <nav className="bottom-nav">
      {visibleItems.map((item) => (
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
