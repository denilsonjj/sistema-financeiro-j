import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import AreaCard from "../components/AreaCard";
import Icon from "../components/Icon";
import { supabase } from "../lib/supabaseClient";

function AreasDoDireito({ onOpenModal, onEdit, orgId, dataVersion }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const loadAreas = async () => {
      if (!orgId) return;
      setLoading(true);
      const { data } = await supabase
        .from("law_areas")
        .select("id, name, law_subareas(name)")
        .eq("org_id", orgId)
        .order("name");
      setAreas(data ?? []);
      setLoading(false);
    };
    loadAreas();
  }, [orgId, dataVersion]);

  const subtitle = loading
    ? "Carregando áreas..."
    : "Gerenciar categorias para contratos e relatórios";

  const handleDelete = async (areaId) => {
    const confirmed = window.confirm(
      "Deseja excluir esta área? Todas as subáreas vinculadas serão removidas."
    );
    if (!confirmed) return;
    setActionError("");
    const { error: subareasError } = await supabase
      .from("law_subareas")
      .delete()
      .eq("area_id", areaId)
      .eq("org_id", orgId);
    if (subareasError) {
      setActionError("Não foi possível excluir as subáreas.");
      return;
    }
    const { error: deleteError } = await supabase
      .from("law_areas")
      .delete()
      .eq("id", areaId)
      .eq("org_id", orgId);
    if (deleteError) {
      setActionError("Não foi possível excluir a área.");
      return;
    }
    setAreas((prev) => prev.filter((area) => area.id !== areaId));
  };

  return (
    <section className="page">
      <PageHeader title="Áreas e Subáreas do Direito" subtitle={subtitle}>
        <div className="actions-row">
          <button type="button" className="primary-btn" onClick={onOpenModal}>
            <Icon name="plus" />
            Nova Área
          </button>
        </div>
      </PageHeader>

      {actionError && <div className="form-error">{actionError}</div>}

      <div className="grid-2">
        {areas.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Icon name="scales" />
              <div>Nenhuma área cadastrada</div>
            </div>
          </div>
        ) : (
          areas.map((area) => (
            <AreaCard
              key={area.id}
              areaId={area.id}
              title={area.name}
              tags={(area.law_subareas ?? []).map((item) => item.name)}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default AreasDoDireito;
