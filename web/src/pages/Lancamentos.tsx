import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  api,
  CATEGORIAS_DESPESA,
  FORMAS_PAGAMENTO,
  STATUS_RECEITA,
  type Despesa,
  type Inquilino,
  type Receita,
} from '../api';
import { TopBar } from '../components/TopBar';
import { ImovelNav } from '../components/ImovelNav';
import { useImovelRealtime } from '../realtime';

const brl = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hoje = () => new Date().toISOString().slice(0, 10);

export function Lancamentos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    Promise.all([
      api.get<Receita[]>(`/receitas?imovelId=${id}`),
      api.get<Despesa[]>(`/despesas?imovelId=${id}`),
      api.get<Inquilino[]>(`/inquilinos?imovelId=${id}`),
    ])
      .then(([r, d, i]) => {
        setReceitas(r);
        setDespesas(d);
        setInquilinos(i);
      })
      .catch((e) => setErro(e.message));
  }, [id]);
  useEffect(carregar, [carregar]);
  // Sincroniza a lista ao vivo com o que o outro usuário lançar.
  useImovelRealtime(id, carregar);

  return (
    <>
      <TopBar />
      <div className="container">
        <button className="ghost" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>‹ Voltar</button>
        {id && <ImovelNav id={id} />}
        <h2>Lançamentos</h2>
        {erro && <div className="erro">{erro}</div>}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormReceita imovelId={id!} inquilinos={inquilinos} onCriado={(r) => setReceitas((a) => [r, ...a])} />
          <FormDespesa imovelId={id!} onCriado={(d) => setDespesas((a) => [d, ...a])} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Receitas</h3>
          {receitas.length === 0 ? (
            <span className="muted">Nenhuma receita.</span>
          ) : (
            receitas.map((r) => (
              <div key={r.id} className="list-item" style={{ cursor: 'default' }}>
                <div>
                  <strong>{r.descricao}</strong>
                  <div className="muted">
                    {r.dataRecebimento.slice(0, 10)} · {r.formaPagamento} · {r.status}
                    {r.inquilino ? ` · ${r.inquilino.nome}` : ''}
                  </div>
                </div>
                <span className="value pos" style={{ fontSize: '1rem' }}>{brl(r.valor)}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Despesas</h3>
          {despesas.length === 0 ? (
            <span className="muted">Nenhuma despesa.</span>
          ) : (
            despesas.map((d) => (
              <div key={d.id} className="list-item" style={{ cursor: 'default' }}>
                <div>
                  <strong>{d.descricao}</strong>
                  <div className="muted">
                    {d.dataPagamento.slice(0, 10)} · {d.categoria} · {d.formaPagamento}
                    {d.fornecedor ? ` · ${d.fornecedor}` : ''}
                    {d.comprovanteUrl ? (
                      <>
                        {' · '}
                        <a href={d.comprovanteUrl} target="_blank" rel="noreferrer">comprovante</a>
                      </>
                    ) : ''}
                  </div>
                </div>
                <span className="value neg" style={{ fontSize: '1rem' }}>{brl(d.valor)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function FormReceita({ imovelId, inquilinos, onCriado }: { imovelId: string; inquilinos: Inquilino[]; onCriado: (r: Receita) => void }) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataRecebimento, setData] = useState(hoje());
  const [formaPagamento, setForma] = useState('PIX');
  const [status, setStatus] = useState('PAGO');
  const [inquilinoId, setInquilino] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r = await api.post<Receita>('/receitas', {
        imovelId,
        descricao,
        valor: Number(valor),
        dataRecebimento,
        formaPagamento,
        status,
        inquilinoId: inquilinoId || undefined,
      });
      onCriado(r);
      setDescricao('');
      setValor('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>Nova receita</h3>
      <div className="field"><label>Descrição</label><input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
      <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
      <div className="field"><label>Data</label><input type="date" value={dataRecebimento} onChange={(e) => setData(e.target.value)} required /></div>
      <div className="field"><label>Forma de pagamento</label><select value={formaPagamento} onChange={(e) => setForma(e.target.value)}>{FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}</select></div>
      <div className="field"><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_RECEITA.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Inquilino (opcional)</label><select value={inquilinoId} onChange={(e) => setInquilino(e.target.value)}><option value="">—</option>{inquilinos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></div>
      {erro && <div className="erro">{erro}</div>}
      <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Adicionar receita'}</button>
    </form>
  );
}

function FormDespesa({ imovelId, onCriado }: { imovelId: string; onCriado: (d: Despesa) => void }) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataPagamento, setData] = useState(hoje());
  const [categoria, setCategoria] = useState('AGUA');
  const [fornecedor, setFornecedor] = useState('');
  const [formaPagamento, setForma] = useState('PIX');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      let comprovanteUrl: string | undefined;
      if (arquivo) comprovanteUrl = (await api.upload(arquivo)).url;
      const d = await api.post<Despesa>('/despesas', {
        imovelId,
        descricao,
        valor: Number(valor),
        dataPagamento,
        categoria,
        fornecedor: fornecedor || undefined,
        formaPagamento,
        comprovanteUrl,
      });
      onCriado(d);
      setDescricao('');
      setValor('');
      setFornecedor('');
      setArquivo(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>Nova despesa</h3>
      <div className="field"><label>Descrição</label><input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
      <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
      <div className="field"><label>Data</label><input type="date" value={dataPagamento} onChange={(e) => setData(e.target.value)} required /></div>
      <div className="field"><label>Categoria</label><select value={categoria} onChange={(e) => setCategoria(e.target.value)}>{CATEGORIAS_DESPESA.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>Fornecedor (opcional)</label><input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} /></div>
      <div className="field"><label>Forma de pagamento</label><select value={formaPagamento} onChange={(e) => setForma(e.target.value)}>{FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}</select></div>
      <div className="field"><label>Comprovante (JPG/PNG/PDF, opcional)</label><input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} /></div>
      {erro && <div className="erro">{erro}</div>}
      <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Adicionar despesa'}</button>
    </form>
  );
}
