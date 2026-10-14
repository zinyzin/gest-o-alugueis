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
  const [editando, setEditando] = useState<Imovel | null>(null);
  const navigate = useNavigate();

  function carregar() {
    api
      .get<Imovel[]>('/imoveis')
      .then(setImoveis)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  function editar(im: Imovel) {
    setEditando(im);
    setEndereco(im.endereco);
    setDescricao(im.descricao ?? '');
  }

  function cancelar() {
    setEditando(null);
    setEndereco('');
    setDescricao('');
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      if (editando) {
        const atualizado = await api.put<Imovel>(`/imoveis/${editando.id}`, { endereco, descricao });
        setImoveis((atual) => atual.map((x) => (x.id === atualizado.id ? atualizado : x)));
      } else {
        const novo = await api.post<Imovel>('/imoveis', { endereco, descricao: descricao || undefined });
        setImoveis((atual) => [novo, ...atual]);
      }
      cancelar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar imóvel');
    }
  }

  async function excluir(im: Imovel) {
    const aviso = `Excluir o imóvel "${im.endereco}"?\n\nTODOS os inquilinos, contratos, receitas e despesas dele serão apagados, também para quem o imóvel foi compartilhado. Esta ação não pode ser desfeita.`;
    if (!window.confirm(aviso)) return;
    setErro('');
    try {
      await api.del(`/imoveis/${im.id}`);
      setImoveis((atual) => atual.filter((x) => x.id !== im.id));
      if (editando?.id === im.id) cancelar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir imóvel');
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
                {/* stopPropagation: os botões não abrem o imóvel. */}
                <div className="acoes" onClick={(e) => e.stopPropagation()}>
                  <button className="ghost small" onClick={() => editar(im)}>Editar</button>
                  <button className="ghost small danger" onClick={() => excluir(im)}>Excluir</button>
                  <span className="muted">›</span>
                </div>
              </div>
            ))
          )}
        </div>

        <form className={`card${editando ? ' editando' : ''}`} onSubmit={salvar}>
          <h3 style={{ marginTop: 0 }}>{editando ? 'Editar imóvel' : 'Cadastrar imóvel'}</h3>
          <div className="field">
            <label>Endereço</label>
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} required />
          </div>
          <div className="field">
            <label>Descrição (opcional)</label>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          {erro && <div className="erro">{erro}</div>}
          <div className="acoes">
            <button type="submit">{editando ? 'Salvar alterações' : 'Adicionar'}</button>
            {editando && <button type="button" className="ghost" onClick={cancelar}>Cancelar</button>}
          </div>
        </form>
      </div>
    </>
  );
}
