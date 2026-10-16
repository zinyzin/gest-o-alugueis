import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useCores } from '@/lib/tema';

function Rotas() {
  const { usuario, carregando } = useAuth();
  const c = useCores();
  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.fundo }}>
        <ActivityIndicator color={c.primaria} />
      </View>
    );
  }
  // Sem sessão, só a tela de login existe; com sessão, só as do sistema.
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.cartao },
        headerTintColor: c.texto,
        contentStyle: { backgroundColor: c.fundo },
      }}
    >
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!usuario}>
        <Stack.Screen name="index" options={{ title: 'Imóveis' }} />
        <Stack.Screen name="imovel/[id]" options={{ title: 'Resumo' }} />
        <Stack.Screen name="lancamentos/[id]" options={{ title: 'Lançamentos' }} />
        <Stack.Screen name="novo/[tipo]" options={{ title: 'Novo lançamento' }} />
        <Stack.Screen name="avisos" options={{ title: 'Avisos' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Rotas />
    </AuthProvider>
  );
}
