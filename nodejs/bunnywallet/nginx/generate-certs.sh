#!/bin/bash
# Generate self-signed SSL certificates for NGINX (Development/Demo Only)
# For production, use Let's Encrypt or proper CA-signed certificates

set -e

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/certs" && pwd)"
DAYS_VALID=365

echo "🔐 Generating self-signed SSL certificates for BunnyWallet..."
echo "📁 Certificate directory: $CERT_DIR"

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
echo "🔑 Generating private key..."
openssl genrsa -out "$CERT_DIR/nginx-selfsigned.key" 2048

# Generate certificate signing request (CSR)
echo "📝 Generating certificate signing request..."
openssl req -new \
    -key "$CERT_DIR/nginx-selfsigned.key" \
    -out "$CERT_DIR/nginx-selfsigned.csr" \
    -subj "/C=US/ST=Demo/L=Demo/O=BunnyWallet/OU=Development/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:bunnywallet.local,DNS:*.bunnywallet.local,IP:127.0.0.1"

# Generate self-signed certificate
echo "📜 Generating self-signed certificate (valid for $DAYS_VALID days)..."
openssl x509 -req \
    -days $DAYS_VALID \
    -in "$CERT_DIR/nginx-selfsigned.csr" \
    -signkey "$CERT_DIR/nginx-selfsigned.key" \
    -out "$CERT_DIR/nginx-selfsigned.crt" \
    -extfile <(echo "subjectAltName=DNS:localhost,DNS:bunnywallet.local,DNS:*.bunnywallet.local,IP:127.0.0.1")

# Set appropriate permissions
chmod 600 "$CERT_DIR/nginx-selfsigned.key"
chmod 644 "$CERT_DIR/nginx-selfsigned.crt"

# Display certificate info
echo ""
echo "✅ SSL certificates generated successfully!"
echo ""
echo "Certificate details:"
openssl x509 -in "$CERT_DIR/nginx-selfsigned.crt" -noout -subject -dates

echo ""
echo "📋 Files created:"
echo "   - Private key: $CERT_DIR/nginx-selfsigned.key"
echo "   - Certificate: $CERT_DIR/nginx-selfsigned.crt"
echo "   - CSR: $CERT_DIR/nginx-selfsigned.csr"
echo ""
echo "⚠️  WARNING: These are self-signed certificates for development only!"
echo "   Your browser will show a security warning. This is expected."
echo "   For production, use Let's Encrypt or a proper CA."
echo ""
echo "🔗 To trust this certificate (macOS):"
echo "   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_DIR/nginx-selfsigned.crt"
echo ""
echo "🔗 To trust this certificate (Linux):"
echo "   sudo cp $CERT_DIR/nginx-selfsigned.crt /usr/local/share/ca-certificates/bunnywallet.crt"
echo "   sudo update-ca-certificates"
echo ""
