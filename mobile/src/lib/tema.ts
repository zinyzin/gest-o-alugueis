import { useColorScheme } from 'react-native';

// Cores dos temas claro e escuro (mesma linha do web).
const claro = { fundo: '#f5f6f8', cartao: '#ffffff', texto: '#1b1f24', suave: '#5f6b7a', borda: '#dde1e6', primaria: '#2563eb', receita: '#15803d', despesa: '#b91c1c' };
const escuro = { fundo: '#111418', cartao: '#1b2027', texto: '#e8ebef', suave: '#9aa5b1', borda: '#2b323b', primaria: '#60a5fa', receita: '#4ade80', despesa: '#f87171' };

export type Cores = typeof claro;
export const useCores = (): Cores => (useColorScheme() === 'dark' ? escuro : claro);
