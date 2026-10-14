import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getToken, type Receita } from '../api';
import { TopBar } from '../components/TopBar';
import { ImovelNav } from '../components/ImovelNav';
import { useImovelRealtime } from '../realtime';

const brl = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface FluxoCaixa { ano: number; meses: { mes: number; receitas: number; despesas: number; saldo: number }[]; }
interface Inadimplencia { total: number; quantidade: number; pendencias: Receita[]; }

export function Relatorios() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ano, setAno] = useState(new Date().getFullYear());
  const [fluxo, setFluxo] = useState<FluxoCaixa | null>(null);
  const [inadimplencia, setInadimplencia] = useState<Inadimplencia | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    Promise.all([
      api.get<FluxoCaixa>(`/relatorios/fluxo-caixa?imovelId=${id}&ano=${ano}`),
      api.get<Inadimplencia>(`/relatorios/inadimplencia?imovelId=${id}`),
    ])
      .then(([f, i]) => {
        setFluxo(f);
        setInadimplencia(i);
      })
      .catch((e) => setErro(e.message));
  }, [id, ano]);
  useEffect(carregar, [carregar]);
  useImovelRealtime(id, carregar);

  // O CSV exige o token, então é baixado via fetch e salvo pelo navegador.
  async function exportar(tipo: 'receitas' | 'despesas') {
    setErro('');
    try {
      const res = await fetch(`/api/relatorios/export.csv?imovelId=${id}&tipo=${tipo}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Falha ao exportar');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao exportar');
    }
  }

  const totais = fluxo?.meses.reduce(
    (t, m) => ({ receitas: t.receitas + m.receitas, despesas: t.despesas + m.despesas, saldo: t.saldo + m.saldo }),
    { receitas: 0, despesas: 0, saldo: 0 },
  );

  return (
    <>
      <TopBar />
      <div className="container">
        <button className="ghost" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>‹ Voltar</button>
        {id && <ImovelNav id={id} />}
        <h2>Relatórios</h2>
        {erro && <div className="erro">{erro}</div>}

        <div className="card">
          <div className="acoes" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Fluxo de caixa</h3>
            <div className="acoes">
              <button className="ghost small" onClick={() => setAno(ano - 1)} aria-label="Ano anterior">‹</button>
              <strong>{ano}</strong>
              <button className="ghost small" onClick={() => setAno(ano + 1)} aria-label="Próximo ano">›</button>
            </div>
          </div>
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr>
              </thead>
              <tbody>
                {fluxo?.meses.map((m) => (
                  <tr key={m.mes}>
                    <td>{NOMES_MES[m.mes - 1]}</td>
                    <td className="pos">{brl(m.receitas)}</td>
                    <td className="neg">{brl(m.despesas)}</td>
                    <td className={m.saldo < 0 ? 'neg' : ''}>{brl(m.saldo)}</td>
                  </tr>
                ))}
              </tbody>
              {totais && (
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th className="pos">{brl(totais.receitas)}</th>
                    <th className="neg">{brl(totais.despesas)}</th>
                    <th className={totais.saldo < 0 ? 'neg' : ''}>{brl(totais.saldo)}</th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Inadimplência</h3>
          {!inadimplencia || inadimplencia.quantidade === 0 ? (
            <span className="muted">Nenhuma receita pendente ou atrasada.</span>
          ) : (
            <>
              <div className="muted" style={{ marginBottom: 8 }}>
                {inadimplencia.quantidade} em aberto · total <strong>{brl(inadimplencia.total)}</strong>
              </div>
              {inadimplencia.pendencias.map((r) => (
                <div key={r.id} className="list-item" style={{ cursor: 'default' }}>
                  <div>
                    <strong>{r.descricao}</strong>
                    <div className="muted">
                      {r.dataRecebimento.slice(0, 10)}
                      {r.inquilino ? ` · ${r.inquilino.nome}` : ''} ·{' '}
                      <span className={`status ${r.status.toLowerCase()}`}>{r.status}</span>
                    </div>
                  </div>
                  <span className="value neg" style={{ fontSize: '1rem' }}>{brl(r.valor)}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Exportar planilha (CSV)</h3>
          <div className="acoes">
            <button onClick={() => exportar('receitas')}>Exportar receitas</button>
            <button onClick={() => exportar('despesas')}>Exportar despesas</button>
          </div>
        </div>
      </div>
    </>
  );
}
