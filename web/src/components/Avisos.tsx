import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Notificacao } from '../api';
import { useEventoPessoal } from '../realtime';

// Sininho do topo: avisos dos imóveis da pessoa, atualizados ao vivo.
export function Avisos() {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const carregar = useCallback(() => {
    api
      .get<{ totalNaoLidas: number; itens: Notificacao[] }>('/notificacoes')
      .then((r) => {
        setItens(r.itens);
        setNaoLidas(r.totalNaoLidas);
      })
      .catch(() => {});
  }, []);
  useEffect(carregar, [carregar]);
  useEventoPessoal('notificacao:criada', carregar);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [aberto]);

  async function abrir(n: Notificacao) {
    if (!n.lida) await api.post(`/notificacoes/${n.id}/lida`).catch(() => {});
    setAberto(false);
    carregar();
    navigate(n.tipo === 'ALUGUEL_ATRASADO' ? `/imoveis/${n.imovelId}/lancamentos` : `/imoveis/${n.imovelId}/cadastros`);
  }

  async function marcarTodas() {
    await api.post('/notificacoes/lidas').catch(() => {});
    carregar();
  }

  return (
    <div className="avisos" ref={caixa}>
      <button
        className="ghost sino"
        onClick={() => setAberto(!aberto)}
        aria-label={naoLidas ? `Avisos: ${naoLidas} ${naoLidas === 1 ? 'não lido' : 'não lidos'}` : 'Avisos'}
        aria-expanded={aberto}
      >
        🔔{naoLidas > 0 && <span className="contador">{naoLidas > 99 ? '99+' : naoLidas}</span>}
      </button>
      {aberto && (
        <div className="avisos-lista" role="dialog" aria-label="Avisos">
          <div className="avisos-topo">
            <strong>Avisos</strong>
            {naoLidas > 0 && <button className="ghost small" onClick={marcarTodas}>Marcar todos como lidos</button>}
          </div>
          {itens.length === 0 ? (
            <div className="muted" style={{ padding: 12 }}>Nenhum aviso.</div>
          ) : (
            itens.map((n) => (
              <button key={n.id} className={`aviso${n.lida ? '' : ' nao-lido'}`} onClick={() => abrir(n)}>
                <strong>{n.titulo}</strong>
                <span>{n.mensagem}</span>
                <span className="muted">{n.imovel.endereco} · {new Date(n.criadoEm).toLocaleDateString('pt-BR')}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
