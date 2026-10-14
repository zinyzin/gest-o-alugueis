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
  const [editReceita, setEditReceita] = useState<Receita | null>(null);
  const [editDespesa, setEditDespesa] = useState<Despesa | null>(null);

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

  async function excluir(tipo: 'receitas' | 'despesas', item: { id: string; descricao: string }) {
    if (!window.confirm(`Excluir "${item.descricao}"? Esta ação não pode ser desfeita.`)) return;
    setErro('');
    try {
      await api.del(`/${tipo}/${item.id}`);
      if (tipo === 'receitas') setReceitas((a) => a.filter((x) => x.id !== item.id));
      else setDespesas((a) => a.filter((x) => x.id !== item.id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  }

  // Substitui o item editado na lista (ou o inclui no topo, se for novo).
  const salvarNaLista = <T extends { id: string }>(set: React.Dispatch<React.SetStateAction<T[]>>) => (item: T) =>
    set((a) => (a.some((x) => x.id === item.id) ? a.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [item, ...a]));

  return (
    <>
      <TopBar />
      <div className="container">
        <button className="ghost" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>‹ Voltar</button>
        {id && <ImovelNav id={id} />}
        <h2>Lançamentos</h2>
        {erro && <div className="erro">{erro}</div>}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormReceita
            imovelId={id!}
            inquilinos={inquilinos}
            editando={editReceita}
            onSalvo={(r) => { salvarNaLista(setReceitas)(r); setEditReceita(null); carregar(); }}
            onCancelar={() => setEditReceita(null)}
          />
          <FormDespesa
            imovelId={id!}
            editando={editDespesa}
            onSalvo={(d) => { salvarNaLista(setDespesas)(d); setEditDespesa(null); }}
            onCancelar={() => setEditDespesa(null)}
          />
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
                <div className="acoes">
                  <span className="value pos" style={{ fontSize: '1rem' }}>{brl(r.valor)}</span>
                  <button className="ghost small" onClick={() => setEditReceita(r)}>Editar</button>
                  <button className="ghost small danger" onClick={() => excluir('receitas', r)}>Excluir</button>
                </div>
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
                <div className="acoes">
                  <span className="value neg" style={{ fontSize: '1rem' }}>{brl(d.valor)}</span>
                  <button className="ghost small" onClick={() => setEditDespesa(d)}>Editar</button>
                  <button className="ghost small danger" onClick={() => excluir('despesas', d)}>Excluir</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

interface FormProps<T> {
  imovelId: string;
  editando: T | null;
  onSalvo: (item: T) => void;
  onCancelar: () => void;
}

function FormReceita({ imovelId, inquilinos, editando, onSalvo, onCancelar }: FormProps<Receita> & { inquilinos: Inquilino[] }) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataRecebimento, setData] = useState(hoje());
  const [formaPagamento, setForma] = useState('PIX');
  const [status, setStatus] = useState('PAGO');
  const [inquilinoId, setInquilino] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Ao escolher "Editar" na lista, o formulário é preenchido com o registro.
  useEffect(() => {
    setErro('');
    setDescricao(editando?.descricao ?? '');
    setValor(editando ? String(Number(editando.valor)) : '');
    setData(editando ? editando.dataRecebimento.slice(0, 10) : hoje());
    setForma(editando?.formaPagamento ?? 'PIX');
    setStatus(editando?.status ?? 'PAGO');
    setInquilino(editando?.inquilino?.id ?? '');
  }, [editando]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const dados = {
        descricao,
        valor: Number(valor),
        dataRecebimento,
        formaPagamento,
        status,
        inquilinoId: inquilinoId || undefined,
      };
      const r = editando
        ? await api.put<Receita>(`/receitas/${editando.id}`, dados)
        : await api.post<Receita>('/receitas', { imovelId, ...dados });
      onSalvo(r);
      setDescricao('');
      setValor('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={`card${editando ? ' editando' : ''}`} onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>{editando ? 'Editar receita' : 'Nova receita'}</h3>
      <div className="field"><label>Descrição</label><input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
      <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
      <div className="field"><label>Data</label><input type="date" value={dataRecebimento} onChange={(e) => setData(e.target.value)} required /></div>
      <div className="field"><label>Forma de pagamento</label><select value={formaPagamento} onChange={(e) => setForma(e.target.value)}>{FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}</select></div>
      <div className="field"><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_RECEITA.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Inquilino (opcional)</label><select value={inquilinoId} onChange={(e) => setInquilino(e.target.value)}><option value="">—</option>{inquilinos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></div>
      {erro && <div className="erro">{erro}</div>}
      <div className="acoes">
        <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Adicionar receita'}</button>
        {editando && <button type="button" className="ghost" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  );
}

function FormDespesa({ imovelId, editando, onSalvo, onCancelar }: FormProps<Despesa>) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataPagamento, setData] = useState(hoje());
  const [categoria, setCategoria] = useState('AGUA');
  const [fornecedor, setFornecedor] = useState('');
  const [formaPagamento, setForma] = useState('PIX');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setErro('');
    setDescricao(editando?.descricao ?? '');
    setValor(editando ? String(Number(editando.valor)) : '');
    setData(editando ? editando.dataPagamento.slice(0, 10) : hoje());
    setCategoria(editando?.categoria ?? 'AGUA');
    setFornecedor(editando?.fornecedor ?? '');
    setForma(editando?.formaPagamento ?? 'PIX');
    setArquivo(null);
  }, [editando]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      // Na edição, sem arquivo novo o comprovante atual é mantido.
      let comprovanteUrl: string | undefined;
      if (arquivo) comprovanteUrl = (await api.upload(arquivo)).url;
      const dados = {
        descricao,
        valor: Number(valor),
        dataPagamento,
        categoria,
        fornecedor: fornecedor || undefined,
        formaPagamento,
        comprovanteUrl,
      };
      const d = editando
        ? await api.put<Despesa>(`/despesas/${editando.id}`, dados)
        : await api.post<Despesa>('/despesas', { imovelId, ...dados });
      onSalvo(d);
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
    <form className={`card${editando ? ' editando' : ''}`} onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>{editando ? 'Editar despesa' : 'Nova despesa'}</h3>
      <div className="field"><label>Descrição</label><input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
      <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
      <div className="field"><label>Data</label><input type="date" value={dataPagamento} onChange={(e) => setData(e.target.value)} required /></div>
      <div className="field"><label>Categoria</label><select value={categoria} onChange={(e) => setCategoria(e.target.value)}>{CATEGORIAS_DESPESA.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>Fornecedor (opcional)</label><input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} /></div>
      <div className="field"><label>Forma de pagamento</label><select value={formaPagamento} onChange={(e) => setForma(e.target.value)}>{FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}</select></div>
      <div className="field"><label>{editando?.comprovanteUrl ? 'Trocar comprovante (opcional)' : 'Comprovante (JPG/PNG/PDF, opcional)'}</label><input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} /></div>
      {erro && <div className="erro">{erro}</div>}
      <div className="acoes">
        <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Adicionar despesa'}</button>
        {editando && <button type="button" className="ghost" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  );
}
