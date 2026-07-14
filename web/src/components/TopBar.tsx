import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function TopBar() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <h1 style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        🏠 Gestão de Imóvel
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="muted">{usuario?.nome}</span>
        <button className="ghost" onClick={sair}>Sair</button>
      </div>
    </div>
  );
}
