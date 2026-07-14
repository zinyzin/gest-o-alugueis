import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Resumo } from '../api';
import { TopBar } from '../components/TopBar';
import { ImovelNav } from '../components/ImovelNav';
import { useImovelRealtime } from '../realtime';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const carregar = useCallback(() => {
    api
      .get<Resumo>(`/dashboard?imovelId=${id}`)
      .then(setResumo)
      .catch((e) => setErro(e.message));
  }, [id]);

  useEffect(carregar, [carregar]);
  // Atualiza o resumo ao vivo quando outro usuário lança receita/despesa.
  useImovelRealtime(id, carregar);

  const maxCategoria = resumo ? Math.max(1, ...resumo.despesasPorCategoria.map((d) => d.total)) : 1;

  return (
    <>
      <TopBar />
      <div className="container">
        <button className="ghost" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
          ‹ Voltar
        </button>
        {id && <ImovelNav id={id} />}
        <h2>Resumo financeiro</h2>

        {erro && <div className="erro">{erro}</div>}
        {!resumo && !erro && <span className="muted">Carregando…</span>}

        {resumo && (
          <>
            <div className="grid cols-3">
              <div className="card stat">
                <div className="label">Receitas</div>
                <div className="value pos">{brl(resumo.totalReceitas)}</div>
              </div>
              <div className="card stat">
                <div className="label">Despesas</div>
                <div className="value neg">{brl(resumo.totalDespesas)}</div>
              </div>
              <div className="card stat">
                <div className="label">Saldo</div>
                <div className={`value ${resumo.saldo >= 0 ? 'pos' : 'neg'}`}>{brl(resumo.saldo)}</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Despesas por categoria</h3>
              {resumo.despesasPorCategoria.length === 0 ? (
                <span className="muted">Sem despesas registradas.</span>
              ) : (
                resumo.despesasPorCategoria.map((d) => (
                  <div key={d.categoria} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4 }}>
                      <span>{d.categoria}</span>
                      <span className="muted">{brl(d.total)}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar" style={{ width: `${(d.total / maxCategoria) * 100}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Receitas por status</h3>
              {resumo.receitasPorStatus.length === 0 ? (
                <span className="muted">Sem receitas registradas.</span>
              ) : (
                resumo.receitasPorStatus.map((r) => (
                  <div key={r.status} className="list-item" style={{ cursor: 'default' }}>
                    <span>{r.status}</span>
                    <span className="muted">
                      {r.qtd}× · {brl(r.total)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
