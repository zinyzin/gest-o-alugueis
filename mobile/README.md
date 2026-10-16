# Mobile App (Android)

App Android com paridade de funcionalidades do web, sincronizado em tempo real.

**Stack:** React Native (Expo SDK 58, Expo Router) + TypeScript + Socket.IO client.

## Rodar

```bash
cd mobile
npm install
# Endereço do sistema: o link público (bin/prod status) ou http://<IP-do-PC>:3333 na mesma rede.
EXPO_PUBLIC_API_URL=https://xxxx.trycloudflare.com npx expo start
```

Abra no celular pelo Expo Go (QR code). No navegador (`w`), o backend precisa liberar a origem
do Expo: `CORS_ORIGIN=http://localhost:8081`.

Verificação: `npm run typecheck` e `npx eslint src`.

## Endereço do servidor

A tela de login tem o campo **Endereço do servidor** (fica salvo no aparelho). Use o link
público atual (`bin/prod status`) — o do Quick Tunnel muda a cada `bin/prod on`, então
atualize o campo quando ele mudar. No APK, use `https://`: o Android bloqueia `http://` fora do
modo de desenvolvimento.

## Build do APK (precisa de conta Expo)

```bash
cd mobile
npx eas-cli@latest login                 # sua conta Expo (gratuita)
npx eas-cli@latest init                  # liga o projeto à conta (grava o projectId no app.json)
npx eas-cli@latest build -p android --profile preview
```

O build roda na nuvem da Expo e termina com um link para baixar o `.apk`. No celular, abra o
link e permita "instalar apps desconhecidos". O perfil `preview` gera APK para instalar direto;
`production` gera o pacote (`.aab`) da Play Store.

Opcional: `EXPO_PUBLIC_API_URL=https://... npx eas-cli@latest build ...` define o endereço que
já vem preenchido no login.
