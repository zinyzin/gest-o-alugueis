import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, getApiUrl, brl, dataBR, NOME_CATEGORIA, NOME_FORMA, NOME_STATUS, type Despesa, type Receita } from '@/lib/api';
import { useImovelRealtime } from '@/lib/realtime';
import { useCores } from '@/lib/tema';
import { Botao, Cartao, Opcoes } from '@/lib/ui';

type Aba = 'receitas' | 'despesas';

export default function Lancamentos() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useCores();
  const [aba, setAba] = useState<Aba>('receitas');
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    Promise.all([api.get<Receita[]>(`/receitas?imovelId=${id}`), api.get<Despesa[]>(`/despesas?imovelId=${id}`)])
      .then(([r, d]) => {
        setReceitas(r);
        setDespesas(d);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id]);
  useEffect(carregar, [carregar]);
  useImovelRealtime(id, carregar);

  async function marcarPaga(r: Receita) {
    try {
      await api.put(`/receitas/${r.id}`, { status: 'PAGO' });
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao marcar como paga');
    }
  }

  function confirmarPaga(r: Receita) {
    const msg = `Marcar "${r.descricao}" (${brl(r.valor)}) como paga?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) marcarPaga(r);
    } else {
      Alert.alert('Receita paga', msg, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Marcar', onPress: () => marcarPaga(r) }]);
    }
  }

  const corStatus = { PAGO: c.receita, ATRASADO: c.despesa, PENDENTE: c.suave };
  const atualizar = (
    <RefreshControl
      refreshing={carregando}
      onRefresh={() => {
        setCarregando(true);
        carregar();
      }}
    />
  );
  const topo = (
    <View style={s.topo}>
      <Opcoes<Aba> opcoes={['receitas', 'despesas']} valor={aba} onChange={setAba} nome={(a) => (a === 'receitas' ? 'Receitas' : 'Despesas')} />
      <Botao
        titulo={aba === 'receitas' ? '+ Nova receita' : '+ Nova despesa'}
        onPress={() => router.push({ pathname: '/novo/[tipo]', params: { tipo: aba === 'receitas' ? 'receita' : 'despesa', imovelId: id } })}
      />
      {!!erro && <Text style={{ color: c.despesa }}>{erro}</Text>}
    </View>
  );
  const vazio = !carregando ? <Text style={{ color: c.suave }}>Nada lançado ainda.</Text> : undefined;

  if (aba === 'receitas') {
    return (
      <FlatList
        data={receitas}
        keyExtractor={(r) => r.id}
        contentContainerStyle={s.lista}
        refreshControl={atualizar}
        ListHeaderComponent={topo}
        ListEmptyComponent={vazio}
        renderItem={({ item: r }) => (
          <Cartao>
            <View style={s.linha}>
              <Text style={[s.desc, { color: c.texto }]}>{r.descricao}</Text>
              <Text style={[s.valor, { color: c.receita }]}>{brl(r.valor)}</Text>
            </View>
            <Text style={{ color: c.suave }}>
              {dataBR(r.dataRecebimento)} · {NOME_FORMA[r.formaPagamento]}
              {r.inquilino ? ` · ${r.inquilino.nome}` : ''}
            </Text>
            <View style={s.linha}>
              <Text style={{ color: corStatus[r.status], fontWeight: '600' }}>{NOME_STATUS[r.status]}</Text>
              {r.status !== 'PAGO' && (
                <Pressable onPress={() => confirmarPaga(r)} hitSlop={8}>
                  <Text style={{ color: c.primaria }}>Marcar como paga</Text>
                </Pressable>
              )}
            </View>
          </Cartao>
        )}
      />
    );
  }

  return (
    <FlatList
      data={despesas}
      keyExtractor={(d) => d.id}
      contentContainerStyle={s.lista}
      refreshControl={atualizar}
      ListHeaderComponent={topo}
      ListEmptyComponent={vazio}
      renderItem={({ item: d }) => (
        <Cartao>
          <View style={s.linha}>
            <Text style={[s.desc, { color: c.texto }]}>{d.descricao}</Text>
            <Text style={[s.valor, { color: c.despesa }]}>{brl(d.valor)}</Text>
          </View>
          <Text style={{ color: c.suave }}>
            {dataBR(d.dataPagamento)} · {NOME_CATEGORIA[d.categoria]} · {NOME_FORMA[d.formaPagamento]}
            {d.fornecedor ? ` · ${d.fornecedor}` : ''}
          </Text>
          {!!d.comprovanteUrl && (
            <Pressable onPress={() => Linking.openURL(`${getApiUrl()}${d.comprovanteUrl}`)} hitSlop={8}>
              <Text style={{ color: c.primaria }}>Ver comprovante</Text>
            </Pressable>
          )}
        </Cartao>
      )}
    />
  );
}

const s = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  topo: { gap: 12 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  desc: { flex: 1, fontSize: 16, fontWeight: '600' },
  valor: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
