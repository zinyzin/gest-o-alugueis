import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const PRAZOS = [
  { minutos: 30, nome: '30 minutos' },
  { minutos: 120, nome: '2 horas' },
  { minutos: 1440, nome: '24 horas' },
];

// Botão do topo: gera um link de convite (uso único, com prazo) para outra pessoa criar conta.
export function Convidar() {
  const [aberto, setAberto] = useState(false);
  const [minutos, setMinutos] = useState(120);
  const [link, setLink] = useState('');
  const [expiraEm, setExpiraEm] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState('');
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [aberto]);

  async function gerar() {
    setErro('');
    setCopiado(false);
    try {
      const c = await api.post<{ token: string; expiraEm: string }>('/convites', { minutos });
      setLink(`${location.origin}/convite?token=${c.token}`);
      setExpiraEm(c.expiraEm);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao gerar convite');
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setErro('Não foi possível copiar; selecione o link e copie.');
    }
  }

  function alternar() {
    setAberto(!aberto);
    setLink('');
    setErro('');
  }

  return (
    <div className="avisos" ref={caixa}>
      <button className="ghost" onClick={alternar} aria-expanded={aberto}>
        Convidar pessoa
      </button>
      {aberto && (
        <div className="avisos-lista convite-painel" role="dialog" aria-label="Convidar pessoa">
          <p className="muted" style={{ marginTop: 0 }}>
            Gera um link para criar conta. Serve para uma pessoa só e vence no prazo escolhido.
          </p>
          <div className="field">
            <label>Validade</label>
            <select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))}>
              {PRAZOS.map((p) => (
                <option key={p.minutos} value={p.minutos}>{p.nome}</option>
              ))}
            </select>
          </div>
          <button onClick={gerar} style={{ width: '100%' }}>Gerar link</button>
          {link && (
            <>
              <input readOnly value={link} aria-label="Link do convite" onFocus={(e) => e.target.select()} style={{ marginTop: 12 }} />
              <button className="ghost" onClick={copiar} style={{ width: '100%', marginTop: 8 }}>
                {copiado ? 'Copiado!' : 'Copiar link'}
              </button>
              <p className="muted" style={{ marginBottom: 0 }}>
                Vale até {new Date(expiraEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
              </p>
            </>
          )}
          {erro && <div className="erro">{erro}</div>}
        </div>
      )}
    </div>
  );
}
