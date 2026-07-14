import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, INDICES_REAJUSTE, type Contrato, type Inquilino } from '../api';
import { TopBar } from '../components/TopBar';
import { ImovelNav } from '../components/ImovelNav';
import { useImovelRealtime } from '../realtime';

const brl = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function Cadastros() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    Promise.all([
      api.get<Inquilino[]>(`/inquilinos?imovelId=${id}`),
      api.get<Contrato[]>(`/contratos?imovelId=${id}`),
    ])
      .then(([i, c]) => {
        setInquilinos(i);
        setContratos(c);
      })
      .catch((e) => setErro(e.message));
  }, [id]);
  useEffect(carregar, [carregar]);
  useImovelRealtime(id, carregar);

  return (
    <>
      <TopBar />
      <div className="container">
        <button className="ghost" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>‹ Voltar</button>
        {id && <ImovelNav id={id} />}
        <h2>Inquilinos e contratos</h2>
        {erro && <div className="erro">{erro}</div>}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormInquilino imovelId={id!} onCriado={(i) => setInquilinos((a) => [...a, i])} />
          <FormContrato imovelId={id!} inquilinos={inquilinos} onCriado={(c) => setContratos((a) => [c, ...a])} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Inquilinos</h3>
          {inquilinos.length === 0 ? (
            <span className="muted">Nenhum inquilino.</span>
          ) : (
            inquilinos.map((i) => (
              <div key={i.id} className="list-item" style={{ cursor: 'default' }}>
                <div>
                  <strong>{i.nome}</strong>
                  <div className="muted">
                    {[i.cpfCnpj, i.telefone, i.email].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Contratos</h3>
          {contratos.length === 0 ? (
            <span className="muted">Nenhum contrato.</span>
          ) : (
            contratos.map((c) => (
              <div key={c.id} className="list-item" style={{ cursor: 'default' }}>
                <div>
                  <strong>{c.inquilino?.nome ?? 'Inquilino'}</strong>
                  <div className="muted">
                    {c.dataInicio.slice(0, 10)}
                    {c.dataFim ? ` → ${c.dataFim.slice(0, 10)}` : ''} · venc. dia {c.diaVencimento} · {c.indiceReajuste}
                    {c.valorCaucao ? ` · caução ${brl(c.valorCaucao)}` : ''}
                    {c.anexoUrl ? (
                      <>
                        {' · '}
                        <a href={c.anexoUrl} target="_blank" rel="noreferrer">contrato</a>
                      </>
                    ) : ''}
                  </div>
                </div>
                <span className="value pos" style={{ fontSize: '1rem' }}>{brl(c.valorAluguel)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function FormInquilino({ imovelId, onCriado }: { imovelId: string; onCriado: (i: Inquilino) => void }) {
  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpf] = useState('');
  const [telefone, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const i = await api.post<Inquilino>('/inquilinos', {
        imovelId,
        nome,
        cpfCnpj: cpfCnpj || undefined,
        telefone: telefone || undefined,
        email: email || undefined,
      });
      onCriado(i);
      setNome('');
      setCpf('');
      setTel('');
      setEmail('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>Novo inquilino</h3>
      <div className="field"><label>Nome completo</label><input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
      <div className="field"><label>CPF/CNPJ (opcional)</label><input value={cpfCnpj} onChange={(e) => setCpf(e.target.value)} /></div>
      <div className="field"><label>Telefone (opcional)</label><input value={telefone} onChange={(e) => setTel(e.target.value)} /></div>
      <div className="field"><label>E-mail (opcional)</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {erro && <div className="erro">{erro}</div>}
      <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Adicionar inquilino'}</button>
    </form>
  );
}

function FormContrato({ imovelId, inquilinos, onCriado }: { imovelId: string; inquilinos: Inquilino[]; onCriado: (c: Contrato) => void }) {
  const [inquilinoId, setInquilino] = useState('');
  const [dataInicio, setInicio] = useState('');
  const [dataFim, setFim] = useState('');
  const [valorAluguel, setValor] = useState('');
  const [diaVencimento, setDia] = useState('5');
  const [indiceReajuste, setIndice] = useState('IGPM');
  const [valorCaucao, setCaucao] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      let anexoUrl: string | undefined;
      if (arquivo) anexoUrl = (await api.upload(arquivo)).url;
      const c = await api.post<Contrato>('/contratos', {
        imovelId,
        inquilinoId,
        dataInicio,
        dataFim: dataFim || undefined,
        valorAluguel: Number(valorAluguel),
        diaVencimento: Number(diaVencimento),
        indiceReajuste,
        valorCaucao: valorCaucao ? Number(valorCaucao) : undefined,
        anexoUrl,
      });
      onCriado(c);
      setValor('');
      setCaucao('');
      setArquivo(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>Novo contrato</h3>
      <div className="field">
        <label>Inquilino</label>
        <select value={inquilinoId} onChange={(e) => setInquilino(e.target.value)} required>
          <option value="">Selecione…</option>
          {inquilinos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </select>
      </div>
      <div className="field"><label>Início</label><input type="date" value={dataInicio} onChange={(e) => setInicio(e.target.value)} required /></div>
      <div className="field"><label>Término (opcional)</label><input type="date" value={dataFim} onChange={(e) => setFim(e.target.value)} /></div>
      <div className="field"><label>Valor do aluguel (R$)</label><input type="number" step="0.01" min="0" value={valorAluguel} onChange={(e) => setValor(e.target.value)} required /></div>
      <div className="field"><label>Dia de vencimento</label><input type="number" min="1" max="31" value={diaVencimento} onChange={(e) => setDia(e.target.value)} required /></div>
      <div className="field"><label>Índice de reajuste</label><select value={indiceReajuste} onChange={(e) => setIndice(e.target.value)}>{INDICES_REAJUSTE.map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="field"><label>Caução (opcional)</label><input type="number" step="0.01" min="0" value={valorCaucao} onChange={(e) => setCaucao(e.target.value)} /></div>
      <div className="field"><label>Cópia do contrato (PDF/imagem, opcional)</label><input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} /></div>
      {erro && <div className="erro">{erro}</div>}
      <button type="submit" disabled={enviando || inquilinos.length === 0}>{enviando ? 'Salvando…' : 'Adicionar contrato'}</button>
      {inquilinos.length === 0 && <div className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>Cadastre um inquilino primeiro.</div>}
    </form>
  );
}
