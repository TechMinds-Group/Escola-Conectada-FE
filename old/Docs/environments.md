# Estrutura de Environments - Escola Conectada

## Como Funciona

O projeto usa um **arquivo único** `environment.ts` que se adapta dinamicamente baseado em **variáveis de ambiente** injetadas em build time.

```typescript
// src/environments/environment.ts
export const environment = {
  production: import.meta.env.NG_APP_PRODUCTION === 'true',
  apiUrl: import.meta.env.NG_APP_API_URL || '/api',
};
```

## Arquivos de Environment

| Arquivo           | Ambiente    | API URL                                                     | Production |
| ----------------- | ----------- | ----------------------------------------------------------- | ---------- |
| `.env`            | Development | `https://localhost:5231/api`                                | `false`    |
| `.env.staging`    | Staging     | `https://escola-conectada-api-staging.techminds.net.br/api` | `false`    |
| `.env.production` | Production  | `https://escola-conectada-api.techminds.net.br/api`         | `true`     |

## Comandos

```bash
# Development (com proxy)
npm start

# Staging
npm run start:staging
npm run build:staging

# Production
npm run start:prod
npm run build:prod
```

## Uso no Código

```typescript
import { environment } from '../../../environments/environment';

// Usar API
private apiUrl = `${environment.apiUrl}/meu-endpoint`;

// Verificar ambiente
if (environment.production) {
  // Lógica de produção
}
```

## Proxy (Development)

O arquivo `proxy.conf.json` redireciona `/api` para `localhost:5231` apenas durante `npm start`:

```json
{
  "/api": {
    "target": "https://localhost:5231",
    "secure": false,
    "changeOrigin": true
  }
}
```

**Como funciona:**

- **Development:** `/api/users` → `https://localhost:5231/api/users` (via proxy)
- **Staging/Production:** Usa URL direta do `.env` correspondente
