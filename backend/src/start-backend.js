#!/usr/bin/env node

// Este script inicia el backend directamente desde los archivos TypeScript
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verificar que ts-node esté instalado
let tsNodePath = path.join(__dirname, 'node_modules/.bin/ts-node');
if (!fs.existsSync(tsNodePath)) {
  console.log('ts-node no encontrado en node_modules, usando la instalación global');
  tsNodePath = 'ts-node';
}

const indexPath = path.join(__dirname, 'src/index.ts');

console.log(`Iniciando backend con ${tsNodePath} ${indexPath}`);

// Opciones para ts-node
const tsNodeOptions = [
  '--transpile-only',  // Solo transpila, no verifica tipos (más rápido)
  indexPath
];

const backend = spawn(tsNodePath, tsNodeOptions, {
  env: { ...process.env },
  stdio: 'inherit'
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  if (code !== 0 && code !== null) {
    console.log('Reiniciando en 5 segundos...');
    setTimeout(() => {
      process.exit(1); // PM2 reiniciará el proceso
    }, 5000);
  }
});

process.on('SIGINT', () => {
  console.log('Recibida señal SIGINT, cerrando...');
  backend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Recibida señal SIGTERM, cerrando...');
  backend.kill('SIGTERM');
});
