#!/usr/bin/env node

// Este script copia los recursos necesarios para el backend
const fs = require('fs');
const path = require('path');

// Crear directorios necesarios
const dirs = [
  'uploads',
  'uploads/profile-images',
  'uploads/note-images',
  'uploads/group-note-images',
  'templates',
  'templates/emails'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creando directorio: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Crear plantilla de recordatorio si no existe
const reminderTemplatePath = path.join(__dirname, 'templates/emails/reminder.ejs');
if (!fs.existsSync(reminderTemplatePath)) {
  console.log(`Creando plantilla de recordatorio: ${reminderTemplatePath}`);
  const reminderTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Recordatorio</title>
</head>
<body>
  <h1>Recordatorio</h1>
  <p>Tienes un recordatorio programado:</p>
  <p><strong>Título:</strong> <%= title %></p>
  <p><strong>Descripción:</strong> <%= description %></p>
  <p><strong>Fecha:</strong> <%= date %></p>
</body>
</html>
`;
  fs.writeFileSync(reminderTemplatePath, reminderTemplate);
}

console.log('Recursos preparados correctamente');
