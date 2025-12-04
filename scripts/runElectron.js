// Script para rodar apenas o Electron (sem Vite)
// Execute: node scripts/runElectron.js

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Electron...\n');

// Primeiro, fazer build do frontend
console.log('📦 Fazendo build do frontend...');
exec('npm run build:electron && vite build', (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Erro no build: ${error.message}`);
    return;
  }
  
  console.log('✅ Build concluído!\n');
  console.log('🚀 Iniciando Electron...\n');

  // Depois, rodar o Electron
  const electronPath = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
  exec(`"${electronPath}" .`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Erro ao executar Electron: ${error.message}`);
      return;
    }
    console.log(stdout);
  });
});

