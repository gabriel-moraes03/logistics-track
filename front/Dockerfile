FROM nginx:alpine

# Copia os arquivos estáticos para o diretório padrão do Nginx
COPY . /usr/share/nginx/html

# Expõe a porta 80
EXPOSE 80

# O Nginx Alpine já inicia com o comando CMD ["nginx", "-g", "daemon off;"] por padrão
