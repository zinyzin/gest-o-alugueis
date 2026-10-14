import { useEffect } from 'react';

// Abre imagem ou PDF por cima da página, sem sair do sistema. Esc ou clique fora fecha.
export function Visualizador({ url, titulo, onFechar }: { url: string; titulo: string; onFechar: () => void }) {
  const pdf = /\.pdf($|\?)/i.test(url);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar]);

  return (
    <div className="visualizador" role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <div className="visualizador-caixa" onClick={(e) => e.stopPropagation()}>
        <div className="visualizador-topo">
          <strong>{titulo}</strong>
          <div className="acoes">
            <a href={url} target="_blank" rel="noreferrer" className="muted">Abrir em nova aba</a>
            <button className="ghost small" onClick={onFechar} autoFocus>Fechar</button>
          </div>
        </div>
        {pdf ? <iframe src={url} title={titulo} /> : <img src={url} alt={titulo} />}
      </div>
    </div>
  );
}
