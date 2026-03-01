# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copia apenas os arquivos de dependências para aproveitar o cache do Docker
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copia o restante do código fonte
COPY . .

# AJUSTE CHAVE: Força o build a usar o environment.ts (Development) 
# Isso evita que o Angular tente bater na URL da Techminds (CORS error)
RUN ./node_modules/.bin/ng build --configuration development

# Stage 2: Runtime (Nginx)
FROM nginx:alpine AS final

# Criar diretórios necessários para rodar como usuário não-root
RUN mkdir -p /tmp/nginx && \
    chown -R nginx:nginx /tmp/nginx /var/cache/nginx /var/log/nginx

# Copiar sua configuração customizada do Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Remover configuração padrão do Nginx
RUN rm -f /etc/nginx/conf.d/default.conf

# Copiar os arquivos buildados do Stage 1
# Certifique-se de que o caminho 'dist/escola-conectada/browser' está correto no seu projeto
COPY --from=build /app/dist/escola-conectada/browser /usr/share/nginx/html

# Configurar permissões de leitura para o servidor web
RUN chown -R nginx:nginx /usr/share/nginx/html

# Mudar para usuário não-root por segurança
USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]