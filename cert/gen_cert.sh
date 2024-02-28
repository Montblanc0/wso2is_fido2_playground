#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Generate a private key
openssl genrsa -out "$DIR/server.key" 2048

# Generate a certificate signing request (user input)
openssl req -new -sha256 -key "$DIR/server.key" -out "$DIR/server.csr"

# Remove passphrase from key
cp "$DIR/server.key" "$DIR/server.key.org"
openssl rsa -in "$DIR/server.key.org" -out "$DIR/server.key"

# Generate a self-signed certificate
openssl x509 -req -days 999999 -in "$DIR/server.csr" -signkey "$DIR/server.key" -out "$DIR/server.crt"
