import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError("Falha ao entrar. Verifique email e senha.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <h1>LexFinance</h1>
          <p>Acesso seguro ao financeiro do escritório</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="email@escritorio.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthScreen;
