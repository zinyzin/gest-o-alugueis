import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, NOME_CATEGORIA, NOME_STATUS, type CategoriaDespesa, type Resumo, type StatusReceita } from '../api';
import { TopBar } from '../components/TopBar';
import { ImovelNav } from '../components/ImovelNav';
import { useImovelRealtime } from '../realtime';
import { GraficoMensal, type Mes } from '../components/GraficoMensal';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const iso = (d: Date) => d.toISOString().slice(0, 10);

type Periodo = 'tudo' | 'mes' | 'ano' | 'ano-anterior' | 'personalizado';

// Intervalo (de/até, em AAAA-MM-DD) de cada período; o gráfico mensal mostra o ano do fim.
function intervalo(periodo: Periodo, de: string, ate: string): { de?: string; ate?: string; ano: number } {
  const hoje = new Date();
  const a = hoje.getFullYear();
  switch (periodo) {
    case 'mes':
      return { de: iso(new Date(Date.UTC(a, hoje.getMonth(), 1))), ate: iso(new Date(Date.UTC(a, hoje.getMonth() + 1, 0))), ano: a };
    case 'ano':
      return { de: `${a}-01-01`, ate: `${a}-12-31`, ano: a };
    case 'ano-anterior':
      return { de: `${a - 1}-01-01`, ate: `${a - 1}-12-31`, ano: a - 1 };
    case 'personalizado':
      return { de: de || undefined, ate: ate || undefined, ano: ate ? Number(ate.slice(0, 4)) : a };
    default:
      return { ano: a };
  }
}

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [meses, setMeses] = useState<Mes[]>([]);
  const [erro, setErro] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('ano');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const navigate = useNavigate();
  const faixa = intervalo(periodo, de, ate);

  const carregar = useCallback(() => {
    const q = new URLSearchParams({ imovelId: id! });
    if (faixa.de) q.set('de', faixa.de);
    // "até" inclui o dia inteiro.
    if (faixa.ate) q.set('ate', `${faixa.ate}T23:59:59.999Z`);
    Promise.all([
      api.get<Resumo>(`/dashboard?${q}`),
      api.get<{ meses: Mes[] }>(`/relatorios/fluxo-caixa?imovelId=${id}&ano=${faixa.ano}`),
    ])
      .then(([r, f]) => {
        setResumo(r);
        setMeses(f.meses);
      })
      .catch((e) => setErro(e.message));
  }, [id, faixa.de, faixa.ate, faixa.ano]);

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

        <div className="filtros">
          <div className="field">
            <label htmlFor="periodo">Período</label>
            <select id="periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
              <option value="mes">Este mês</option>
              <option value="ano">Este ano</option>
              <option value="ano-anterior">Ano anterior</option>
              <option value="tudo">Tudo</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>
          {periodo === 'personalizado' && (
            <>
              <div className="field"><label htmlFor="periodo-de">De</label><input id="periodo-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
              <div className="field"><label htmlFor="periodo-ate">Até</label><input id="periodo-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
            </>
          )}
        </div>

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
              <div className="acoes" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Receitas e despesas por mês · {faixa.ano}</h3>
                <Link to={`/imoveis/${id}/relatorios`} className="muted">Ver em tabela</Link>
              </div>
              <GraficoMensal meses={meses} />
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Despesas por categoria</h3>
              {resumo.despesasPorCategoria.length === 0 ? (
                <span className="muted">Sem despesas registradas.</span>
              ) : (
                resumo.despesasPorCategoria.map((d) => (
                  <div key={d.categoria} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4 }}>
                      <span>{NOME_CATEGORIA[d.categoria as CategoriaDespesa] ?? d.categoria}</span>
                      <span className="muted">{brl(d.total)}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar serie-2" style={{ width: `${(d.total / maxCategoria) * 100}%` }} />
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
                    <span className={`status ${r.status.toLowerCase()}`}>{NOME_STATUS[r.status as StatusReceita] ?? r.status}</span>
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
