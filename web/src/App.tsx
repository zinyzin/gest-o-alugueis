import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Login } from './pages/Login';
import { Imoveis } from './pages/Imoveis';
import { Dashboard } from './pages/Dashboard';
import { Lancamentos } from './pages/Lancamentos';
import { Cadastros } from './pages/Cadastros';
import { Relatorios } from './pages/Relatorios';

export function App() {
  const { usuario, carregando } = useAuth();

  if (carregando) return <div className="center muted">Carregando…</div>;

  if (!usuario) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Imoveis />} />
      <Route path="/imoveis/:id" element={<Dashboard />} />
      <Route path="/imoveis/:id/lancamentos" element={<Lancamentos />} />
      <Route path="/imoveis/:id/cadastros" element={<Cadastros />} />
      <Route path="/imoveis/:id/relatorios" element={<Relatorios />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
