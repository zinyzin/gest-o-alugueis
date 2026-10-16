import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

// Criar conta só pelo link de convite (/convite?codigo=...); a tela de login não oferece cadastro.
export function Login({ convite = false }: { convite?: boolean }) {
  const { login, registrar } = useAuth();
  const [params] = useSearchParams();
  const criando = convite;
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const codigoDoLink = params.get('codigo') ?? '';
  const [codigoConvite, setCodigo] = useState(codigoDoLink);
  const [conviteObrigatorio, setConviteObrigatorio] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // O servidor diz se criar conta exige código de convite.
  useEffect(() => {
    api
      .get<{ conviteObrigatorio: boolean }>('/auth/config')
      .then((c) => setConviteObrigatorio(c.conviteObrigatorio))
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (criando) await registrar({ nome, email, senha, codigoConvite: codigoConvite || undefined });
      else await login(email, senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : criando ? 'Falha ao criar conta' : 'Falha no login');
    } finally {
      setEnviando(false);
    }
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
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={criando ? 6 : undefined} />
        </div>
        {criando && conviteObrigatorio && !codigoDoLink && (
          <div className="field">
            <label>Código de convite</label>
            <input value={codigoConvite} onChange={(e) => setCodigo(e.target.value)} required />
          </div>
        )}
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
