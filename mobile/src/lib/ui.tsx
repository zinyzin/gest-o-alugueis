import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useCores } from './tema';

// Peças de tela repetidas entre os formulários e listas.

export function Botao({ titulo, onPress, carregando, desativado, secundario }: {
  titulo: string;
  onPress: () => void;
  carregando?: boolean;
  desativado?: boolean;
  secundario?: boolean;
}) {
  const c = useCores();
  const off = desativado || carregando;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={[
        s.botao,
        secundario ? { borderWidth: 1, borderColor: c.primaria } : { backgroundColor: c.primaria },
        off && { opacity: 0.6 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={secundario ? c.primaria : '#fff'} />
      ) : (
        <Text style={[s.botaoTexto, { color: secundario ? c.primaria : '#fff' }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Campo({ rotulo, ...props }: TextInputProps & { rotulo: string }) {
  const c = useCores();
  return (
    <View style={s.grupo}>
      <Text style={{ color: c.suave }}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={c.suave}
        {...props}
        style={[s.campo, { borderColor: c.borda, color: c.texto, backgroundColor: c.cartao }]}
      />
    </View>
  );
}

// Escolha única entre poucas opções, em "pílulas".
export function Opcoes<T extends string>({ rotulo, opcoes, valor, onChange, nome }: {
  rotulo?: string;
  opcoes: T[];
  valor: T;
  onChange: (v: T) => void;
  nome: (v: T) => string;
}) {
  const c = useCores();
  return (
    <View style={s.grupo}>
      {!!rotulo && <Text style={{ color: c.suave }}>{rotulo}</Text>}
      <View style={s.pilulas}>
        {opcoes.map((o) => (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[s.pilula, { borderColor: c.borda }, valor === o && { backgroundColor: c.primaria, borderColor: c.primaria }]}
          >
            <Text style={{ color: valor === o ? '#fff' : c.texto }}>{nome(o)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Cartao({ children }: { children: ReactNode }) {
  const c = useCores();
  return <View style={[s.cartao, { backgroundColor: c.cartao, borderColor: c.borda }]}>{children}</View>;
}

const s = StyleSheet.create({
  botao: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  botaoTexto: { fontWeight: '600', fontSize: 16 },
  grupo: { gap: 6 },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pilula: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  cartao: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 6 },
});
