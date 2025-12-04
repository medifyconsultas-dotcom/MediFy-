# 🚀 Instruções para Testar o Backend

## ✅ Teste Básico (Sem Firebase)

O servidor de teste já está configurado e funcionando!

```bash
# No PowerShell, use:
cd "C:\Users\illib\Desktop\basic app\src\mobile\backend"
node test-server.js
```

O servidor irá iniciar na porta 3001 e você pode testar:
- `http://localhost:3001/health` - Health check
- `http://localhost:3001/test` - Teste de rotas

## 🔥 Configurar Firebase (Para uso completo)

1. **Criar arquivo .env:**
```bash
cp env.example .env
```

2. **Editar .env com suas credenciais do Firebase:**
```env
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_PRIVATE_KEY="sua-private-key-completa"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-project.iam.gserviceaccount.com
PORT=3001
NODE_ENV=development
JWT_SECRET=sua-chave-secreta-aqui
CORS_ORIGIN=http://localhost:3000
```

3. **Obter credenciais do Firebase:**
   - Acesse: https://console.firebase.google.com/
   - Selecione seu projeto
   - Vá em Configurações do Projeto > Contas de Serviço
   - Clique em "Gerar nova chave privada"
   - Baixe o arquivo JSON
   - Copie os valores para o .env

4. **Iniciar servidor completo:**
```bash
npm run dev
```

## 🧪 Testar Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### Login (requer Firebase configurado)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"123456"}'
```

### Cadastro (requer Firebase configurado)
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"novo@example.com",
    "password":"123456",
    "nome":"Novo Usuário",
    "perfil":"paciente"
  }'
```

## 📝 Notas

- O servidor de teste (`test-server.js`) funciona sem Firebase
- O servidor completo (`src/server.js`) requer Firebase configurado
- Use `npm run dev` para desenvolvimento com auto-reload
- Use `npm start` para produção

## ⚠️ Problemas Comuns

1. **Erro de porta em uso:**
   - Altere a porta no .env ou mate o processo na porta 3001

2. **Erro de Firebase:**
   - Verifique se as credenciais no .env estão corretas
   - Certifique-se de que a chave privada está entre aspas

3. **Erro de módulos:**
   - Execute `npm install` novamente
