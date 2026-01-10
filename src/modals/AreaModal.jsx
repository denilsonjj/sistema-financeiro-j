import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import Icon from "../components/Icon";
import { supabase } from "../lib/supabaseClient";

function AreaModal({ onClose, mode, orgId, areaId, onCreated }) {
  const isEdit = mode === "edit";
  const [name, setName] = useState("");
  const [subareas, setSubareas] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadArea = async () => {
      if (!isEdit || !areaId || !orgId) return;
      setLoading(true);
      const { data } = await supabase
        .from("law_areas")
        .select("id, name, law_subareas(name)")
        .eq("org_id", orgId)
        .eq("id", areaId)
        .single();
      if (data) {
        setName(data.name ?? "");
        const loaded = (data.law_subareas ?? []).map((item) => item.name);
        setSubareas(loaded.length ? loaded : [""]);
      }
      setLoading(false);
    };
    loadArea();
  }, [isEdit, areaId, orgId]);

  const handleSubareaChange = (index, value) => {
    setSubareas((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const handleAddSubarea = () => {
    setSubareas((prev) => [...prev, ""]);
  };

  const handleRemoveSubarea = (index) => {
    setSubareas((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Informe o nome da área.");
      return;
    }

    setLoading(true);
    const cleanSubareas = subareas.map((item) => item.trim()).filter(Boolean);

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("law_areas")
        .update({ name: name.trim() })
        .eq("org_id", orgId)
        .eq("id", areaId);

      if (updateError) {
        setError("Não foi possível atualizar a área.");
        setLoading(false);
        return;
      }

      await supabase.from("law_subareas").delete().eq("area_id", areaId).eq("org_id", orgId);

      if (cleanSubareas.length > 0) {
        const payload = cleanSubareas.map((item) => ({
          org_id: orgId,
          area_id: areaId,
          name: item,
        }));
        await supabase.from("law_subareas").insert(payload);
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("law_areas")
        .insert({ org_id: orgId, name: name.trim() })
        .select("id")
        .single();

      if (insertError) {
        setError("Não foi possível salvar a área.");
        setLoading(false);
        return;
      }

      if (cleanSubareas.length > 0) {
        const payload = cleanSubareas.map((item) => ({
          org_id: orgId,
          area_id: data.id,
          name: item,
        }));
        await supabase.from("law_subareas").insert(payload);
      }
    }

    setLoading(false);
    onCreated?.();
    onClose();
  };

  return (
    <Modal
      title={isEdit ? "Editar Área" : "Nova Área do Direito"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-btn" form="area-form" disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Atualizar" : "Cadastrar"}
          </button>
        </>
      }
    >
      <form id="area-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="field span-2">
          <span>Nome da Área *</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Direito Bancário"
            required
          />
        </label>
        <div className="field span-2">
          <div className="subarea-header">
            <span>Subáreas</span>
            <button type="button" className="ghost-btn small" onClick={handleAddSubarea}>
              <Icon name="plus" />
              Adicionar
            </button>
          </div>
          <div className="subarea-list">
            {subareas.map((value, index) => (
              <div className="subarea-row" key={`sub-${index}`}>
                <input
                  type="text"
                  value={value}
                  onChange={(event) => handleSubareaChange(index, event.target.value)}
                  placeholder="Nome da subárea"
                />
                {subareas.length > 1 && (
                  <button type="button" className="icon-btn" onClick={() => handleRemoveSubarea(index)}>
                    <Icon name="close" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        {error && (
          <div className="form-error span-2">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

export default AreaModal;
