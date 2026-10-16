import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api, brl, NOME_CATEGORIA, NOME_STATUS, type CategoriaDespesa, type Resumo, type StatusReceita } from '@/lib/api';
import { useImovelRealtime } from '@/lib/realtime';
import { useCores, type Cores } from '@/lib/tema';

interface Mes { mes: number; receitas: number; despesas: number; saldo: number; }
const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type Periodo = 'mes' | 'ano' | 'tudo';
const PERIODOS: { id: Periodo; nome: string }[] = [
  { id: 'mes', nome: 'Este mês' },
  { id: 'ano', nome: 'Este ano' },
  { id: 'tudo', nome: 'Tudo' },
];

// Mesmo critério do web: "até" inclui o dia inteiro.
function filtro(periodo: Periodo): string {
  const hoje = new Date();
  const a = hoje.getFullYear();
  if (periodo === 'ano') return `&de=${a}-01-01&ate=${a}-12-31T23:59:59.999Z`;
  if (periodo === 'mes') {
    const fim = new Date(Date.UTC(a, hoje.getMonth() + 1, 0)).toISOString().slice(0, 10);
    const ini = new Date(Date.UTC(a, hoje.getMonth(), 1)).toISOString().slice(0, 10);
    return `&de=${ini}&ate=${fim}T23:59:59.999Z`;
  }
  return '';
}

export default function Dashboard() {
  const { id, endereco } = useLocalSearchParams<{ id: string; endereco?: string }>();
  const c = useCores();
  const [periodo, setPeriodo] = useState<Periodo>('ano');
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [meses, setMeses] = useState<Mes[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Sem setState síncrono aqui: o efeito chama direto; o "puxar para atualizar" liga o indicador.
  const carregar = useCallback(() => {
    Promise.all([
      api.get<Resumo>(`/dashboard?imovelId=${id}${filtro(periodo)}`),
      api.get<{ meses: Mes[] }>(`/relatorios/fluxo-caixa?imovelId=${id}&ano=${new Date().getFullYear()}`),
    ])
      .then(([r, f]) => {
        setResumo(r);
        setMeses(f.meses);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, periodo]);

  useEffect(carregar, [carregar]);
  // Atualiza ao vivo quando alguém lança receita/despesa (no web ou em outro celular).
  useImovelRealtime(id, carregar);

  const maior = Math.max(1, ...meses.map((m) => Math.max(m.receitas, m.despesas)));

  return (
    <ScrollView contentContainerStyle={s.tela} refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => {
          setCarregando(true);
          carregar();
        }} />}>
      <Stack.Screen options={{ title: endereco ?? 'Resumo' }} />

      <View style={s.periodos}>
        {PERIODOS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setPeriodo(p.id)}
            style={[s.chip, { borderColor: c.borda }, periodo === p.id && { backgroundColor: c.primaria, borderColor: c.primaria }]}
          >
            <Text style={{ color: periodo === p.id ? '#fff' : c.texto }}>{p.nome}</Text>
          </Pressable>
        ))}
      </View>

      {!!erro && <Text style={{ color: c.despesa }}>{erro}</Text>}

      {resumo && (
        <>
          <View style={s.totais}>
            <Total c={c} rotulo="Receitas" valor={resumo.totalReceitas} cor={c.receita} />
            <Total c={c} rotulo="Despesas" valor={resumo.totalDespesas} cor={c.despesa} />
          </View>
          <Total c={c} rotulo="Saldo" valor={resumo.saldo} cor={resumo.saldo >= 0 ? c.receita : c.despesa} />

          <Secao c={c} titulo="Receitas por status">
            {resumo.receitasPorStatus.length === 0 && <Text style={{ color: c.suave }}>Nenhuma receita no período.</Text>}
            {resumo.receitasPorStatus.map((r) => (
              <Linha key={r.status} c={c} nome={`${NOME_STATUS[r.status as StatusReceita] ?? r.status} (${r.qtd})`} valor={r.total} />
            ))}
          </Secao>

          <Secao c={c} titulo="Despesas por categoria">
            {resumo.despesasPorCategoria.length === 0 && <Text style={{ color: c.suave }}>Nenhuma despesa no período.</Text>}
            {resumo.despesasPorCategoria.map((d) => (
              <Linha key={d.categoria} c={c} nome={`${NOME_CATEGORIA[d.categoria as CategoriaDespesa] ?? d.categoria} (${d.qtd})`} valor={d.total} />
            ))}
          </Secao>

          <Secao c={c} titulo={`Mês a mês (${new Date().getFullYear()})`}>
            {meses.map((m) => (
              <View key={m.mes} style={s.mes}>
                <Text style={[s.nomeMes, { color: c.suave }]}>{NOMES_MES[m.mes - 1]}</Text>
                <View style={s.barras}>
                  <View style={[s.barra, { width: `${(m.receitas / maior) * 100}%`, backgroundColor: c.receita }]} />
                  <View style={[s.barra, { width: `${(m.despesas / maior) * 100}%`, backgroundColor: c.despesa }]} />
                </View>
              </View>
            ))}
          </Secao>
        </>
      )}
    </ScrollView>
  );
}

function Total({ c, rotulo, valor, cor }: { c: Cores; rotulo: string; valor: number; cor: string }) {
  return (
    <View style={[s.cartao, s.total, { backgroundColor: c.cartao, borderColor: c.borda }]}>
      <Text style={{ color: c.suave }}>{rotulo}</Text>
      <Text style={[s.valor, { color: cor }]}>{brl(valor)}</Text>
    </View>
  );
}

function Secao({ c, titulo, children }: { c: Cores; titulo: string; children: React.ReactNode }) {
  return (
    <View style={[s.cartao, { backgroundColor: c.cartao, borderColor: c.borda }]}>
      <Text style={[s.titulo, { color: c.texto }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function Linha({ c, nome, valor }: { c: Cores; nome: string; valor: number }) {
  return (
    <View style={s.linha}>
      <Text style={{ color: c.texto }}>{nome}</Text>
      <Text style={{ color: c.texto, fontVariant: ['tabular-nums'] }}>{brl(valor)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { padding: 16, gap: 12 },
  periodos: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  totais: { flexDirection: 'row', gap: 12 },
  cartao: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
  total: { flex: 1 },
  valor: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  titulo: { fontSize: 16, fontWeight: '600' },
  linha: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  mes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nomeMes: { width: 28, fontSize: 12 },
  barras: { flex: 1, gap: 2 },
  barra: { height: 6, borderRadius: 3, minWidth: 1 },
});
