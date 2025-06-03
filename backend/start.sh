#!/bin/bash

# Preparar entorno
echo "Preparando entorno..."
node prepare-resources.js

# Verificar dependencias
echo "Verificando dependencias..."
npm list ts-node || npm install -g ts-node

# Iniciar backend
echo "Iniciando backend..."
node start-backend.js
