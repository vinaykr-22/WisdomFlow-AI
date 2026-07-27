#!/usr/bin/env bash
# ── WisdomFlow AI — Unified build script for deployment ──
set -o errexit

echo "==> Installing Python dependencies..."
pip install -r backend/requirements.txt

echo "==> Installing frontend dependencies..."
cd frontend
npm ci

echo "==> Building React frontend..."
npm run build
cd ..

echo "==> Build complete! Frontend output → backend/static/"
