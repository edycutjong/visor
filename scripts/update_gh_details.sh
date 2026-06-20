#!/usr/bin/env bash
set -euo pipefail

# Update repository details
echo "⚙️ Updating repository settings for edycutjong/visor..."
gh repo edit edycutjong/visor \
  --description "Privacy-Blind Egress Gateway inside TEEs" \
  --homepage "https://visor.edycu.dev" \
  --enable-issues=true \
  --enable-wiki=false

# Update repository topics
echo "🏷️ Setting repository topics..."
gh repo edit edycutjong/visor --add-topic "nextjs,react,typescript,tailwind,rust,wasm,intel-tdx,tee,privacy,cryptography,egress-gateway,security,t3-adk"

echo "✅ GitHub repository details updated successfully!"
