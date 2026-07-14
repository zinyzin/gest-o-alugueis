import { NavLink } from 'react-router-dom';

export function ImovelNav({ id }: { id: string }) {
  const estilo = ({ isActive }: { isActive: boolean }) => ({
    padding: '8px 14px',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    background: isActive ? 'var(--primary)' : 'transparent',
    color: isActive ? 'var(--primary-text)' : 'var(--text)',
    border: '1px solid var(--border)',
  });
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      <NavLink to={`/imoveis/${id}`} end style={estilo}>Resumo</NavLink>
      <NavLink to={`/imoveis/${id}/lancamentos`} style={estilo}>Lançamentos</NavLink>
      <NavLink to={`/imoveis/${id}/cadastros`} style={estilo}>Cadastros</NavLink>
    </div>
  );
}
