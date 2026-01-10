import Icon from "./Icon";

function Select({ options, value, onChange }) {
  const normalizedOptions = options.map((option) => {
    if (typeof option === "string") {
      return { value: option, label: option };
    }
    return option;
  });

  return (
    <div className="select">
      <select value={value} onChange={onChange}>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron" />
    </div>
  );
}

export default Select;
