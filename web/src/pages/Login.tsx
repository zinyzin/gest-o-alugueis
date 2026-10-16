import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

// Criar conta só pelo link de convite (/convite?token=...), gerado por quem já tem conta.
// A tela de login não oferece cadastro.
export function Login({ convite = false }: { convite?: boolean }) {
  const { login, registrar } = useAuth();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const criando = convite;
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // Convite: null enquanto confere; false se vencido, usado ou ausente.
  const [conviteOk, setConviteOk] = useState<boolean | null>(criando && token ? null : !criando ? true : false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!criando || !token) return;
    api
      .get<{ valido: boolean }>(`/convites/${encodeURIComponent(token)}`)
      .then((r) => setConviteOk(r.valido))
      .catch(() => setConviteOk(false));
  }, [criando, token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (criando) await registrar({ nome, email, senha, convite: token });
      else await login(email, senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : criando ? 'Falha ao criar conta' : 'Falha no login');
    } finally {
      setEnviando(false);
    }
  }

  if (criando && conviteOk !== true) {
    return (
      <div className="center">
        <div className="card" style={{ width: 340 }}>
          <h2 style={{ marginTop: 0 }}>Criar conta</h2>
          {conviteOk === null ? (
            <p className="muted">Conferindo o convite…</p>
          ) : (
            <p>Este link de convite venceu ou já foi usado. Peça um novo link a quem te convidou.</p>
          )}
          <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
            Já tenho conta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="center">
      <form className="card" style={{ width: 340 }} onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>{criando ? 'Criar conta' : 'Entrar'}</h2>
        {criando && (
          <div className="field">
            <label>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          </div>
        )}
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!criando} />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        {erro && <div className="erro">{erro}</div>}
        <button type="submit" disabled={enviando} style={{ width: '100%' }}>
          {enviando ? (criando ? 'Criando…' : 'Entrando…') : criando ? 'Criar conta' : 'Entrar'}
        </button>
        {criando && (
          <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
            Já tenho conta
          </Link>
        )}
      </form>
    </div>
  );
}
