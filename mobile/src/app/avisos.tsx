import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { api, type Notificacao } from '@/lib/api';
import { useEventoPessoal } from '@/lib/realtime';
import { useCores } from '@/lib/tema';
import { Cartao } from '@/lib/ui';

// Avisos dos imóveis da pessoa (aluguel atrasado, reajuste, contrato vencendo), ao vivo.
export default function Avisos() {
  const c = useCores();
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    api
      .get<{ totalNaoLidas: number; itens: Notificacao[] }>('/notificacoes')
      .then((r) => {
        setItens(r.itens);
        setNaoLidas(r.totalNaoLidas);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);
  useEffect(carregar, [carregar]);
  useEventoPessoal('notificacao:criada', carregar);

  async function abrir(n: Notificacao) {
    if (!n.lida) await api.post(`/notificacoes/${n.id}/lida`).catch(() => {});
    router.push({ pathname: '/imovel/[id]', params: { id: n.imovelId, endereco: n.imovel.endereco } });
    carregar();
  }

  async function marcarTodas() {
    await api.post('/notificacoes/lidas').catch(() => {});
    carregar();
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            naoLidas > 0 ? (
              <Pressable onPress={marcarTodas} hitSlop={8}>
                <Text style={{ color: c.primaria }}>Marcar todas</Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={itens}
        keyExtractor={(n) => n.id}
        contentContainerStyle={s.lista}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={() => {
              setCarregando(true);
              carregar();
            }}
          />
        }
        ListHeaderComponent={erro ? <Text style={{ color: c.despesa }}>{erro}</Text> : undefined}
        ListEmptyComponent={!carregando ? <Text style={{ color: c.suave }}>Nenhum aviso.</Text> : undefined}
        renderItem={({ item: n }) => (
          <Pressable onPress={() => abrir(n)}>
            <Cartao>
              <Text style={[s.titulo, { color: c.texto }, !n.lida && { color: c.primaria }]}>
                {!n.lida ? '● ' : ''}
                {n.titulo}
              </Text>
              <Text style={{ color: c.texto }}>{n.mensagem}</Text>
              <Text style={{ color: c.suave }}>
                {n.imovel.endereco} · {new Date(n.criadoEm).toLocaleDateString('pt-BR')}
              </Text>
            </Cartao>
          </Pressable>
        )}
      />
    </>
  );
}

const s = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  titulo: { fontSize: 16, fontWeight: '600' },
});
