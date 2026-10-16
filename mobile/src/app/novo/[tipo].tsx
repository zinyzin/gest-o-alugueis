import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  api, CATEGORIAS_DESPESA, FORMAS_PAGAMENTO, NOME_CATEGORIA, NOME_FORMA, NOME_STATUS, STATUS_RECEITA,
  type CategoriaDespesa, type FormaPagamento, type StatusReceita,
} from '@/lib/api';
import { useCores } from '@/lib/tema';
import { Botao, Campo, Opcoes } from '@/lib/ui';

const hojeBR = () => new Date().toLocaleDateString('pt-BR');

// "dd/mm/aaaa" -> "aaaa-mm-dd" (ou null se inválida).
function paraISO(br: string): string | null {
  const m = br.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

// Aceita "1.234,56", "1234,56" ou "1234.56".
function paraNumero(v: string): number {
  const t = v.trim();
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
}

export default function NovoLancamento() {
  const { tipo, imovelId } = useLocalSearchParams<{ tipo: 'receita' | 'despesa'; imovelId: string }>();
  const ehReceita = tipo === 'receita';
  const c = useCores();
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeBR());
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [status, setStatus] = useState<StatusReceita>('PAGO');
  const [categoria, setCategoria] = useState<CategoriaDespesa>('MANUTENCAO');
  const [fornecedor, setFornecedor] = useState('');
  const [foto, setFoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function escolherFoto(camera: boolean) {
    setErro('');
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setErro('Sem permissão para usar a câmera.');
    }
    const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const r = camera ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (!r.canceled) setFoto(r.assets[0]);
  }

  async function salvar() {
    setErro('');
    const iso = paraISO(data);
    const v = paraNumero(valor);
    if (!descricao.trim()) return setErro('Informe a descrição.');
    if (!(v > 0)) return setErro('Informe um valor maior que zero.');
    if (!iso) return setErro('Data inválida (use dd/mm/aaaa).');

    setSalvando(true);
    try {
      if (ehReceita) {
        await api.post('/receitas', { imovelId, descricao: descricao.trim(), valor: v, dataRecebimento: iso, formaPagamento: forma, status });
      } else {
        let comprovanteUrl: string | undefined;
        if (foto) {
          const tipoArq = foto.mimeType ?? 'image/jpeg';
          const nome = foto.fileName ?? `comprovante.${tipoArq.split('/')[1] ?? 'jpg'}`;
          comprovanteUrl = (await api.uploadFoto(foto.uri, nome, tipoArq)).url;
        }
        await api.post('/despesas', {
          imovelId, descricao: descricao.trim(), valor: v, dataPagamento: iso, formaPagamento: forma, categoria,
          fornecedor: fornecedor.trim() || undefined, comprovanteUrl,
        });
      }
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar');
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: ehReceita ? 'Nova receita' : 'Nova despesa' }} />
      <ScrollView contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
        <Campo rotulo="Descrição" value={descricao} onChangeText={setDescricao} placeholder={ehReceita ? 'Aluguel de outubro' : 'Conserto do chuveiro'} />
        <Campo rotulo="Valor (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" />
        <Campo rotulo={ehReceita ? 'Data do recebimento' : 'Data do pagamento'} value={data} onChangeText={setData} placeholder="dd/mm/aaaa" />
        {ehReceita ? (
          <Opcoes rotulo="Situação" opcoes={STATUS_RECEITA} valor={status} onChange={setStatus} nome={(o) => NOME_STATUS[o]} />
        ) : (
          <>
            <Opcoes rotulo="Categoria" opcoes={CATEGORIAS_DESPESA} valor={categoria} onChange={setCategoria} nome={(o) => NOME_CATEGORIA[o]} />
            <Campo rotulo="Fornecedor (opcional)" value={fornecedor} onChangeText={setFornecedor} />
          </>
        )}
        <Opcoes rotulo="Forma de pagamento" opcoes={FORMAS_PAGAMENTO} valor={forma} onChange={setForma} nome={(o) => NOME_FORMA[o]} />

        {!ehReceita && (
          <View style={s.grupo}>
            <Text style={{ color: c.suave }}>Comprovante (opcional)</Text>
            {foto && <Image source={{ uri: foto.uri }} style={[s.foto, { borderColor: c.borda }]} resizeMode="contain" />}
            <View style={s.botoes}>
              <View style={{ flex: 1 }}>
                <Botao secundario titulo="Tirar foto" onPress={() => escolherFoto(true)} />
              </View>
              <View style={{ flex: 1 }}>
                <Botao secundario titulo="Da galeria" onPress={() => escolherFoto(false)} />
              </View>
            </View>
          </View>
        )}

        {!!erro && <Text style={{ color: c.despesa }}>{erro}</Text>}
        <Botao titulo="Salvar" onPress={salvar} carregando={salvando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 16, gap: 16 },
  grupo: { gap: 8 },
  botoes: { flexDirection: 'row', gap: 12 },
  foto: { width: '100%', height: 220, borderWidth: 1, borderRadius: 8 },
});
