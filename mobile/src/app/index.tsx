import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { api, type Imovel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCores } from '@/lib/tema';

export default function Imoveis() {
  const { usuario, sair } = useAuth();
  const c = useCores();
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Sem setState síncrono aqui: o efeito chama direto; o "puxar para atualizar" liga o indicador.
  const carregar = useCallback(() => {
    api
      .get<Imovel[]>('/imoveis')
      .then((l) => {
        setImoveis(l);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);
  useEffect(carregar, [carregar]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={sair} hitSlop={8}>
              <Text style={{ color: c.primaria }}>Sair</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={imoveis}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.lista}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => {
          setCarregando(true);
          carregar();
        }} />}
        ListHeaderComponent={
          <>
            <Text style={{ color: c.suave }}>Olá, {usuario?.nome}</Text>
            {!!erro && <Text style={{ color: c.despesa }}>{erro}</Text>}
          </>
        }
        ListEmptyComponent={
          !carregando ? <Text style={{ color: c.suave }}>Nenhum imóvel. Cadastre pelo sistema web.</Text> : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            style={[s.cartao, { backgroundColor: c.cartao, borderColor: c.borda }]}
            onPress={() => router.push({ pathname: '/imovel/[id]', params: { id: item.id, endereco: item.endereco } })}
          >
            <Text style={[s.endereco, { color: c.texto }]}>{item.endereco}</Text>
            {!!item.descricao && <Text style={{ color: c.suave }}>{item.descricao}</Text>}
          </Pressable>
        )}
      />
    </>
  );
}

const s = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  cartao: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
  endereco: { fontSize: 16, fontWeight: '600' },
});
