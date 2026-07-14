import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Imovel } from '../api';
import { TopBar } from '../components/TopBar';

export function Imoveis() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  function carregar() {
    api
      .get<Imovel[]>('/imoveis')
      .then(setImoveis)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const novo = await api.post<Imovel>('/imoveis', { endereco, descricao: descricao || undefined });
      setEndereco('');
      setDescricao('');
      setImoveis((atual) => [novo, ...atual]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar imóvel');
    }
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <h2>Meus imóveis</h2>

        <div className="card">
          {carregando ? (
            <span className="muted">Carregando…</span>
          ) : imoveis.length === 0 ? (
            <span className="muted">Nenhum imóvel ainda. Cadastre o primeiro abaixo.</span>
          ) : (
            imoveis.map((im) => (
              <div key={im.id} className="list-item" onClick={() => navigate(`/imoveis/${im.id}`)}>
                <div>
                  <strong>{im.endereco}</strong>
                  {im.descricao && <div className="muted">{im.descricao}</div>}
                </div>
                <span className="muted">›</span>
              </div>
            ))
          )}
        </div>

        <form className="card" onSubmit={criar}>
          <h3 style={{ marginTop: 0 }}>Cadastrar imóvel</h3>
          <div className="field">
            <label>Endereço</label>
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} required />
          </div>
          <div className="field">
            <label>Descrição (opcional)</label>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          {erro && <div className="erro">{erro}</div>}
          <button type="submit">Adicionar</button>
        </form>
      </div>
    </>
  );
}
