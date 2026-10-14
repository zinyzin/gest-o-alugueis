import { useCallback, useEffect, useState } from 'react';
import { api, type Imovel } from '../api';
import { useImovelRealtime } from '../realtime';
import { Visualizador } from './Visualizador';

// Galeria de fotos do imóvel: enviar várias de uma vez, ampliar e remover.
export function FotosImovel({ imovelId }: { imovelId: string }) {
  const [fotos, setFotos] = useState<string[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    api.get<Imovel>(`/imoveis/${imovelId}`).then((i) => setFotos(i.fotos)).catch((e) => setErro(e.message));
  }, [imovelId]);
  useEffect(carregar, [carregar]);
  useImovelRealtime(imovelId, carregar);

  async function salvar(novas: string[]) {
    const i = await api.put<Imovel>(`/imoveis/${imovelId}`, { fotos: novas });
    setFotos(i.fotos);
  }

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro('');
    setEnviando(true);
    try {
      const urls: string[] = [];
      for (const a of Array.from(arquivos)) urls.push((await api.upload(a)).url);
      await salvar([...fotos, ...urls]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao enviar fotos');
    } finally {
      setEnviando(false);
    }
  }

  async function remover(url: string) {
    if (!window.confirm('Remover esta foto?')) return;
    setErro('');
    try {
      await salvar(fotos.filter((f) => f !== url));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao remover');
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Fotos do imóvel</h3>
      {fotos.length === 0 ? (
        <span className="muted">Nenhuma foto ainda.</span>
      ) : (
        <div className="galeria">
          {fotos.map((f, i) => (
            <figure key={f}>
              <button className="miniatura" onClick={() => setAberta(f)} aria-label={`Ampliar foto ${i + 1}`}>
                <img src={f} alt={`Foto ${i + 1} do imóvel`} loading="lazy" />
              </button>
              <button className="ghost small danger" onClick={() => remover(f)}>Remover</button>
            </figure>
          ))}
        </div>
      )}
      <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
        <label htmlFor="fotos-imovel">{enviando ? 'Enviando…' : 'Adicionar fotos (JPG, PNG ou WEBP)'}</label>
        <input id="fotos-imovel" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={enviando} onChange={(e) => { void enviar(e.target.files); e.target.value = ''; }} />
      </div>
      {erro && <div className="erro">{erro}</div>}
      {aberta && <Visualizador url={aberta} titulo="Foto do imóvel" onFechar={() => setAberta(null)} />}
    </div>
  );
}
