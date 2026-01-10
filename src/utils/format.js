export const formatCurrency = (value) => {
  const numberValue = Number(value) || 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
};

export const parseCurrency = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  return parsed.toLocaleDateString("pt-BR");
};
