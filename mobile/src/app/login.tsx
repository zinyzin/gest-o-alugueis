import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useCores } from '@/lib/tema';

export default function Login() {
  const { login } = useAuth();
  const c = useCores();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro('');
    setEnviando(true);
    try {
      await login(email.trim(), senha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar');
      setEnviando(false);
    }
  }

  const campo = [s.campo, { borderColor: c.borda, color: c.texto, backgroundColor: c.cartao }];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.tela, { backgroundColor: c.fundo }]}>
      <View style={[s.caixa, { backgroundColor: c.cartao, borderColor: c.borda }]}>
        <Text style={[s.titulo, { color: c.texto }]}>Gestão do Imóvel</Text>
        <TextInput
          style={campo}
          placeholder="E-mail"
          placeholderTextColor={c.suave}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={campo}
          placeholder="Senha"
          placeholderTextColor={c.suave}
          secureTextEntry
          autoComplete="current-password"
          value={senha}
          onChangeText={setSenha}
          onSubmitEditing={entrar}
        />
        {!!erro && <Text style={{ color: c.despesa }}>{erro}</Text>}
        <Pressable
          style={[s.botao, { backgroundColor: c.primaria, opacity: enviando || !email || !senha ? 0.6 : 1 }]}
          disabled={enviando || !email || !senha}
          onPress={entrar}
        >
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>Entrar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, justifyContent: 'center', padding: 16 },
  caixa: { gap: 12, padding: 20, borderRadius: 12, borderWidth: 1, maxWidth: 420, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  botao: { borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
