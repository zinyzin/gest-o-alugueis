import { useState } from 'react';

export interface Mes { mes: number; receitas: number; despesas: number; saldo: number; }

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Eixo compacto: 0 / 500 / 1 mil / 2,5 mil.
const compacto = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(n));

// Passo "redondo" do eixo (1, 2, 2,5 ou 5 × potência de 10) para cerca de 4 divisões.
function escala(max: number): { passo: number; teto: number } {
  if (max <= 0) return { passo: 250, teto: 1000 };
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto)!;
  return { passo, teto: Math.ceil(max / passo) * passo };
}

// Coluna com 4px de raio no topo e base reta (cresce da linha de base).
function coluna(x: number, y: number, w: number, h: number) {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

// Receitas × despesas por mês: colunas agrupadas, um eixo, legenda e tooltip por mês.
export function GraficoMensal({ meses }: { meses: Mes[] }) {
  const [foco, setFoco] = useState<number | null>(null);
  const L = 640, A = 240, esq = 44, dir = 8, topo = 12, base = 24;
  const largura = L - esq - dir, altura = A - topo - base;
  const { passo, teto } = escala(Math.max(...meses.map((m) => Math.max(m.receitas, m.despesas))));
  const y = (v: number) => topo + altura - (v / teto) * altura;
  const faixa = largura / 12;
  const barra = Math.min(16, (faixa - 10) / 2);
  const ticks = Array.from({ length: Math.round(teto / passo) + 1 }, (_, i) => i * passo);
  const ativo = foco !== null ? meses[foco] : null;

  return (
    <div className="grafico">
      <div className="legenda" aria-hidden="true">
        <span><i className="chave serie-1" />Receitas</span>
        <span><i className="chave serie-2" />Despesas</span>
      </div>
      <div className="grafico-area" onMouseLeave={() => setFoco(null)}>
        <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Receitas e despesas por mês">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={esq} x2={L - dir} y1={y(t)} y2={y(t)} className="grade" />
              <text x={esq - 6} y={y(t) + 4} className="eixo" textAnchor="end">{compacto(t)}</text>
            </g>
          ))}
          {meses.map((m, i) => {
            const x0 = esq + i * faixa + (faixa - (barra * 2 + 2)) / 2;
            return (
              <g key={m.mes}>
                {foco === i && <rect x={esq + i * faixa} y={topo} width={faixa} height={altura} className="foco-mes" />}
                <path d={coluna(x0, y(m.receitas), barra, y(0) - y(m.receitas))} className="serie-1" />
                <path d={coluna(x0 + barra + 2, y(m.despesas), barra, y(0) - y(m.despesas))} className="serie-2" />
                <text x={esq + i * faixa + faixa / 2} y={A - 6} className="eixo" textAnchor="middle">{NOMES_MES[m.mes - 1]}</text>
                {/* Alvo de hover/foco: a coluna inteira do mês, maior que as barras. */}
                <rect
                  x={esq + i * faixa}
                  y={topo}
                  width={faixa}
                  height={altura}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${NOMES_MES[m.mes - 1]}: receitas ${brl(m.receitas)}, despesas ${brl(m.despesas)}, saldo ${brl(m.saldo)}`}
                  onMouseEnter={() => setFoco(i)}
                  onFocus={() => setFoco(i)}
                  onBlur={() => setFoco(null)}
                />
              </g>
            );
          })}
        </svg>
        {ativo && foco !== null && (
          // Ao lado da coluna em foco, sem cobri-la; na metade direita, abre para a esquerda.
          <div
            className="dica"
            style={
              foco < 6
                ? { left: `calc(${((esq + (foco + 1) * faixa) / L) * 100}% + 4px)` }
                : { right: `calc(${100 - ((esq + foco * faixa) / L) * 100}% + 4px)` }
            }
            role="status"
          >
            <div className="muted">{NOMES_MES[ativo.mes - 1]}</div>
            <div><i className="traco serie-1" /><strong>{brl(ativo.receitas)}</strong> receitas</div>
            <div><i className="traco serie-2" /><strong>{brl(ativo.despesas)}</strong> despesas</div>
            <div><strong>{brl(ativo.saldo)}</strong> saldo</div>
          </div>
        )}
      </div>
    </div>
  );
}
