# NGINX Dockerfile for BunnyWallet API Gateway
FROM nginx:1.25-alpine

# Install required packages
RUN apk add --no-cache \
    openssl \
    curl \
    ca-certificates

# Remove default NGINX configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Copy SSL certificates
COPY certs/ /etc/nginx/certs/

# Create necessary directories
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp

# Set permissions
RUN chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx && \
    chmod 644 /etc/nginx/certs/*.crt && \
    chmod 600 /etc/nginx/certs/*.key

# Test configuration
RUN nginx -t

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8081/nginx-health || exit 1

# Expose ports
EXPOSE 80 443 8081

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
