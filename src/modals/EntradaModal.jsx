import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { supabase } from "../lib/supabaseClient";
import { formatCurrency, parseCurrency } from "../utils/format";

const initialForm = {
  description: "",
  amount: "",
  receivedDate: "",
  categoryId: "",
  areaId: "",
  subareaId: "",
  responsible: "",
  notes: "",
};

function EntradaModal({ onClose, orgId, onCreated, mode = "create", entryId }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState({
    categories: [],
    areas: [],
    subareas: [],
  });

  useEffect(() => {
    const loadOptions = async () => {
      if (!orgId) return;
      const [categoriesRes, areasRes, subareasRes] = await Promise.all([
        supabase.from("income_categories").select("id, name").eq("org_id", orgId),
        supabase.from("law_areas").select("id, name").eq("org_id", orgId),
        supabase.from("law_subareas").select("id, name, area_id").eq("org_id", orgId),
      ]);
      setOptions({
        categories: categoriesRes.data ?? [],
        areas: areasRes.data ?? [],
        subareas: subareasRes.data ?? [],
      });
    };
    loadOptions();
  }, [orgId]);

  useEffect(() => {
    if (!isEdit) {
      setForm(initialForm);
      return;
    }
    if (!entryId || !orgId) return;
    const loadEntry = async () => {
      const { data } = await supabase
        .from("manual_receipts")
        .select(
          "id, description, amount, received_date, category_id, area_id, subarea_id, responsible, notes"
        )
        .eq("id", entryId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!data) return;
      const formattedAmount = data.amount
        ? formatCurrency(data.amount).replace("R$", "").trim()
        : "";
      setForm({
        description: data.description ?? "",
        amount: formattedAmount,
        receivedDate: data.received_date ?? "",
        categoryId: data.category_id ?? "",
        areaId: data.area_id ?? "",
        subareaId: data.subarea_id ?? "",
        responsible: data.responsible ?? "",
        notes: data.notes ?? "",
      });
    };
    loadEntry();
  }, [isEdit, entryId, orgId]);

  const availableSubareas = useMemo(
    () => options.subareas.filter((item) => item.area_id === form.areaId),
    [options.subareas, form.areaId]
  );

  useEffect(() => {
    if (!form.subareaId) return;
    const exists = availableSubareas.some((item) => item.id === form.subareaId);
    if (!exists) {
      setForm((prev) => ({ ...prev, subareaId: "" }));
    }
  }, [availableSubareas, form.subareaId]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    if (field === "areaId") {
      setForm((prev) => ({ ...prev, areaId: value, subareaId: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.description || !form.amount || !form.receivedDate || !form.categoryId) {
      setError("Preencha os campos obrigatórios.");
      return;
    }

    setLoading(true);
    if (isEdit) {
      if (!entryId) {
        setError("Entrada manual não encontrada.");
        setLoading(false);
        return;
      }
      const { error: updateError } = await supabase
        .from("manual_receipts")
        .update({
          description: form.description,
          amount: parseCurrency(form.amount),
          received_date: form.receivedDate,
          category_id: form.categoryId,
          area_id: form.areaId || null,
          subarea_id: form.subareaId || null,
          responsible: form.responsible || null,
          notes: form.notes || null,
        })
        .eq("id", entryId)
        .eq("org_id", orgId);

      if (updateError) {
        setError("Não foi possível atualizar a entrada manual.");
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("manual_receipts").insert({
        org_id: orgId,
        description: form.description,
        amount: parseCurrency(form.amount),
        received_date: form.receivedDate,
        category_id: form.categoryId,
        area_id: form.areaId || null,
        subarea_id: form.subareaId || null,
        responsible: form.responsible || null,
        notes: form.notes || null,
      });

      if (insertError) {
        setError("Não foi possível salvar a entrada manual.");
        setLoading(false);
        return;
      }
    }

    setForm(initialForm);
    onCreated?.();
    onClose();
    setLoading(false);
  };

  return (
    <Modal
      title={isEdit ? "Editar Entrada Manual" : "Nova Entrada Manual"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-btn" form="entrada-form" disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Atualizar" : "Cadastrar"}
          </button>
        </>
      }
    >
      <form id="entrada-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="field span-2">
          <span>Descrição *</span>
          <input
            type="text"
            placeholder="Ex: Honorários advocatícios do processo X"
            value={form.description}
            onChange={handleChange("description")}
            required
          />
        </label>
        <label className="field">
          <span>Valor (R$) *</span>
          <input
            type="text"
            placeholder="0,00"
            value={form.amount}
            onChange={handleChange("amount")}
            required
          />
        </label>
        <label className="field">
          <span>Data de Recebimento *</span>
          <input
            type="date"
            value={form.receivedDate}
            onChange={handleChange("receivedDate")}
            required
          />
        </label>
        <label className="field span-2">
          <span>Categoria *</span>
          <select value={form.categoryId} onChange={handleChange("categoryId")} required>
            <option value="">Selecione a categoria</option>
            {options.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Área do Direito (opcional)</span>
          <select value={form.areaId} onChange={handleChange("areaId")}>
            <option value="">Selecione a área</option>
            {options.areas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Subárea (opcional)</span>
          <select value={form.subareaId} onChange={handleChange("subareaId")} disabled={!form.areaId}>
            <option value="">
              {form.areaId ? "Selecione a subárea" : "Selecione a área primeiro"}
            </option>
            {availableSubareas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span>Responsável (opcional)</span>
          <input
            type="text"
            placeholder="Nome do advogado responsável"
            value={form.responsible}
            onChange={handleChange("responsible")}
          />
        </label>
        <label className="field span-2">
          <span>Observações</span>
          <textarea
            rows="3"
            placeholder="Anotações sobre a entrada"
            value={form.notes}
            onChange={handleChange("notes")}
          />
        </label>
        {error && <div className="form-error span-2">{error}</div>}
      </form>
    </Modal>
  );
}

export default EntradaModal;
