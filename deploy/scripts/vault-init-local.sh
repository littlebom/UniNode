#!/bin/sh
set -e

echo "Waiting for Vault to be ready..."
until vault status 2>/dev/null; do
  sleep 1
done

echo "Enabling transit secrets engine..."
vault secrets enable transit 2>/dev/null || echo "Transit engine already enabled"

echo "Creating signing keys..."
vault write -f transit/keys/tu-ac-th type=ed25519 2>/dev/null || echo "Key tu-ac-th already exists"
vault write -f transit/keys/cu-ac-th type=ed25519 2>/dev/null || echo "Key cu-ac-th already exists"

echo "Vault initialization complete!"
