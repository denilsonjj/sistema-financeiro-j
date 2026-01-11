import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { supabase } from "../lib/supabaseClient";
import { defaultLabels, labelGroups } from "../data/uiLabels";

const buildFormValues = (labels) => {
  const base = {};
  Object.entries(defaultLabels).forEach(([key, value]) => {
    base[key] = labels?.[key] ?? value;
  });
  return base;
};

function Personalizacao({ orgId, labels, onSaved }) {
  const [form, setForm] = useState(() => buildFormValues(labels));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(buildFormValues(labels));
  }, [labels]);

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleReset = () => {
    setForm(buildFormValues({}));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!orgId) return;
    setError("");
    setSaved(false);
    setLoading(true);
    const payload = Object.entries(form).map(([key, value]) => ({
      org_id: orgId,
      key,
      value: value.trim() || defaultLabels[key],
    }));
    const { error: upsertError } = await supabase
      .from("ui_labels")
      .upsert(payload, { onConflict: "org_id,key" });
    if (upsertError) {
      setError("Não foi possível salvar as alterações.");
      setLoading(false);
      return;
    }
    const nextLabels = payload.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    onSaved?.(nextLabels);
    setSaved(true);
    setLoading(false);
  };

  const labelGroupsList = useMemo(() => labelGroups, []);

  return (
    <section className="page">
      <PageHeader
        title="Personalização"
        subtitle="Edite os nomes dos cards e gráficos sem mexer no código."
      >
        <div className="actions-row">
          <button type="button" className="ghost-btn" onClick={handleReset}>
            Restaurar padrão
          </button>
          <button type="button" className="primary-btn" onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </PageHeader>

      {error && <div className="form-error">{error}</div>}
      {saved && <div className="form-success">Alterações salvas.</div>}

      <div className="grid-2">
        {labelGroupsList.map((group) => (
          <Card key={group.title} title={group.title}>
            <div className="form-grid">
              {group.items.map((item) => (
                <label key={item.key} className="field span-2">
                  <span>{item.label}</span>
                  <input
                    type="text"
                    value={form[item.key] ?? ""}
                    onChange={handleChange(item.key)}
                  />
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default Personalizacao;
