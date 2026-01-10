import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Sidebar from "./components/layout/Sidebar";
import BottomNav from "./components/layout/BottomNav";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./pages/Dashboard";
import Contratos from "./pages/Contratos";
import FluxoDeCaixa from "./pages/FluxoDeCaixa";
import Despesas from "./pages/Despesas";
import Relatorios from "./pages/Relatorios";
import AreasDoDireito from "./pages/AreasDoDireito";
import ContratoModal from "./modals/ContratoModal";
import EntradaModal from "./modals/EntradaModal";
import DespesaModal from "./modals/DespesaModal";
import AreaModal from "./modals/AreaModal";
import { navItems } from "./data/navigation";

function App() {
  const [active, setActive] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [theme, setTheme] = useState("light");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orgId, setOrgId] = useState(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [areaToEdit, setAreaToEdit] = useState(null);
  const [contractToEdit, setContractToEdit] = useState(null);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setAuthLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadOrg = async () => {
      if (!session?.user?.id) {
        setOrgId(null);
        return;
      }
      setOrgLoading(true);
      const { data, error } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();
      if (!error) {
        setOrgId(data?.org_id ?? null);
      }
      setOrgLoading(false);
    };
    loadOrg();
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCreated = () => {
    setDataVersion((prev) => prev + 1);
  };

  const activeLabel = useMemo(
    () => navItems.find((item) => item.id === active)?.label ?? "",
    [active]
  );

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-card">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (orgLoading) {
    return (
      <div className="app-loading">
        <div className="loading-card">Carregando organização...</div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="app-loading">
        <div className="loading-card">
          <h2>Organização não encontrada</h2>
          <p>
            Seu usuário ainda não está vinculado a uma organização. Verifique as
            permissões no Supabase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar items={navItems} active={active} onNavigate={setActive} />

      <main className="content">
        <div className="page-top">
          <div className="page-tag">{activeLabel}</div>
          <div className="actions-row">
            <button
              type="button"
              className="ghost-btn"
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
            >
              {theme === "dark" ? "Tema claro" : "Tema escuro"}
            </button>
            <button type="button" className="ghost-btn" onClick={handleSignOut}>
              Sair
            </button>
          </div>
        </div>

        {active === "dashboard" && (
          <Dashboard orgId={orgId} dataVersion={dataVersion} />
        )}
        {active === "contratos" && (
          <Contratos
            onOpenModal={() => setModal("novo-contrato")}
            onEdit={(contractId) => {
              setContractToEdit(contractId);
              setModal("editar-contrato");
            }}
            orgId={orgId}
            dataVersion={dataVersion}
          />
        )}
        {active === "fluxo" && (
          <FluxoDeCaixa
            onOpenModal={() => setModal("nova-entrada")}
            onEditManual={(entryId) => {
              setEntryToEdit(entryId);
              setModal("editar-entrada");
            }}
            orgId={orgId}
            dataVersion={dataVersion}
          />
        )}
        {active === "despesas" && (
          <Despesas
            onOpenModal={() => setModal("nova-despesa")}
            onEdit={(expenseId) => {
              setExpenseToEdit(expenseId);
              setModal("editar-despesa");
            }}
            orgId={orgId}
            dataVersion={dataVersion}
          />
        )}
        {active === "relatorios" && (
          <Relatorios orgId={orgId} dataVersion={dataVersion} />
        )}
        {active === "areas" && (
          <AreasDoDireito
            onOpenModal={() => setModal("nova-area")}
            onEdit={(areaId) => {
              setAreaToEdit(areaId);
              setModal("editar-area");
            }}
            orgId={orgId}
            dataVersion={dataVersion}
          />
        )}
      </main>

      {modal === "novo-contrato" && (
        <ContratoModal
          onClose={() => setModal(null)}
          orgId={orgId}
          onCreated={handleCreated}
        />
      )}
      {modal === "editar-contrato" && (
        <ContratoModal
          onClose={() => {
            setModal(null);
            setContractToEdit(null);
          }}
          orgId={orgId}
          mode="edit"
          contractId={contractToEdit}
          onCreated={handleCreated}
        />
      )}
      {modal === "nova-entrada" && (
        <EntradaModal
          onClose={() => setModal(null)}
          orgId={orgId}
          onCreated={handleCreated}
        />
      )}
      {modal === "editar-entrada" && (
        <EntradaModal
          onClose={() => {
            setModal(null);
            setEntryToEdit(null);
          }}
          orgId={orgId}
          mode="edit"
          entryId={entryToEdit}
          onCreated={handleCreated}
        />
      )}
      {modal === "nova-despesa" && (
        <DespesaModal
          onClose={() => setModal(null)}
          orgId={orgId}
          onCreated={handleCreated}
        />
      )}
      {modal === "editar-despesa" && (
        <DespesaModal
          onClose={() => {
            setModal(null);
            setExpenseToEdit(null);
          }}
          orgId={orgId}
          mode="edit"
          expenseId={expenseToEdit}
          onCreated={handleCreated}
        />
      )}
      {modal === "nova-area" && (
        <AreaModal
          onClose={() => {
            setModal(null);
            setAreaToEdit(null);
          }}
          orgId={orgId}
          onCreated={handleCreated}
        />
      )}
      {modal === "editar-area" && (
        <AreaModal
          onClose={() => {
            setModal(null);
            setAreaToEdit(null);
          }}
          mode="edit"
          orgId={orgId}
          areaId={areaToEdit}
          onCreated={handleCreated}
        />
      )}

      <BottomNav items={navItems} active={active} onNavigate={setActive} />
    </div>
  );
}

export default App;
