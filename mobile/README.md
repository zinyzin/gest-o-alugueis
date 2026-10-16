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

## Build do APK

```bash
npx eas-cli@latest build -p android --profile preview
```
