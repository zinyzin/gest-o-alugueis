# Mobile App (Android)

App Android com paridade de funcionalidades do web, sincronizado em tempo real.

**Stack:** React Native (Expo) + TypeScript + Socket.IO client.

## Setup (a implementar na Fase 5)

```bash
cd mobile
npm install
npx expo start
```

## Build do APK

```bash
npx eas build -p android --profile preview
```

## Características

- Offline-first: cache local reconciliado ao reconectar.
- Reutiliza tipos de domínio e chamadas de API compartilhados com o web.
