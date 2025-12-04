# 📱 Guia Completo - Configurar Backend Mobile

## 🚨 Problema: Erro de Conexão no Cadastro Mobile

O erro de conexão ocorre porque:
1. O backend não está rodando
2. O IP configurado no app está incorreto
3. O Firebase Admin SDK não está configurado

## ✅ Solução Passo a Passo

### 1️⃣ Descobrir o IP da sua máquina

**No Windows (PowerShell):**
```powershell
ipconfig | findstr "IPv4"
```

**No Windows (CMD):**
```cmd
ipconfig | findstr "IPv4"
```

Você verá algo como:
```
IPv4 Address. . . . . . . . . . . . : 192.168.1.100
```

**⚠️ IMPORTANTE:** Use o IP da sua rede local (geralmente começa com 192.168.x.x ou 10.x.x.x)

### 2️⃣ Configurar o IP no App Mobile

Edite o arquivo: `mobile-app/src/api/config.ts`

```typescript
// Substitua pelo IP da sua máquina
export const API_BASE_URL = 'http://SEU_IP_AQUI:3001';
```

**Exemplo:**
```typescript
export const API_BASE_URL = 'http://192.168.1.100:3001';
```

### 3️⃣ Configurar Firebase Admin SDK

#### 3.1 Obter Credenciais do Firebase

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **medify-401a8**
3. Vá em: ⚙️ **Configurações do Projeto** > **Contas de Serviço**
4. Clique em: **Gerar nova chave privada**
5. Baixe o arquivo JSON (ex: `medify-401a8-firebase-adminsdk-xxxxx.json`)

#### 3.2 Criar arquivo .env

No diretório `src/mobile/backend/`, crie um arquivo `.env`:

```bash
cd "src/mobile/backend"
```

Copie o conteúdo do arquivo JSON baixado e preencha o `.env`:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=medify-401a8
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@medify-401a8.iam.gserviceaccount.com

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (pode ser qualquer string aleatória)
JWT_SECRET=medify-super-secret-key-2024-change-in-production

# CORS (permitir todas as origens para mobile)
CORS_ORIGIN=*
```

**⚠️ IMPORTANTE:**
- A `FIREBASE_PRIVATE_KEY` deve estar entre aspas duplas
- Mantenha os `\n` na chave privada
- A chave privada deve estar completa, desde `-----BEGIN PRIVATE KEY-----` até `-----END PRIVATE KEY-----`

### 4️⃣ Instalar Dependências

```bash
cd "src/mobile/backend"
npm install
```

### 5️⃣ Iniciar o Backend

```bash
npm run dev
```

Você deve ver:
```
🚀 Servidor rodando na porta 3001
📱 Ambiente: development
🔗 Health check: http://localhost:3001/health
✅ Firebase Admin SDK inicializado com sucesso
```

### 6️⃣ Testar a Conexão

**No navegador ou Postman:**
```
http://localhost:3001/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "environment": "development"
}
```

**Testar cadastro:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"teste@example.com",
    "password":"123456",
    "nome":"Teste Usuário",
    "perfil":"paciente"
  }'
```

### 7️⃣ Configurar Firewall (se necessário)

**No Windows:**
1. Abra: **Windows Defender Firewall**
2. Clique em: **Configurações Avançadas**
3. Clique em: **Regras de Entrada** > **Nova Regra**
4. Selecione: **Porta** > **TCP** > **Porta específica: 3001**
5. Permita a conexão
6. Aplique para todos os perfis

### 8️⃣ Testar no App Mobile

1. Certifique-se de que o backend está rodando
2. Verifique se o IP no `mobile-app/src/api/config.ts` está correto
3. Certifique-se de que o celular está na mesma rede Wi-Fi
4. Tente fazer o cadastro novamente

## 🔍 Troubleshooting

### Erro: "Cannot connect to server"
- ✅ Verifique se o backend está rodando (`npm run dev`)
- ✅ Verifique se o IP está correto no `config.ts`
- ✅ Certifique-se de que o celular está na mesma rede Wi-Fi
- ✅ Verifique o firewall do Windows

### Erro: "Firebase Admin SDK not initialized"
- ✅ Verifique se o arquivo `.env` existe
- ✅ Verifique se as credenciais estão corretas
- ✅ Verifique se a `FIREBASE_PRIVATE_KEY` está entre aspas e com `\n`

### Erro: "Port 3001 already in use"
```bash
# Windows - Encontrar processo na porta 3001
netstat -ano | findstr :3001

# Matar processo (substitua PID pelo número encontrado)
taskkill /PID <PID> /F
```

### Erro: "CORS policy"
- ✅ Verifique se `CORS_ORIGIN=*` está no `.env`
- ✅ Reinicie o servidor após alterar o `.env`

## 📝 Checklist Final

- [ ] IP da máquina descoberto
- [ ] IP configurado no `mobile-app/src/api/config.ts`
- [ ] Credenciais do Firebase obtidas
- [ ] Arquivo `.env` criado e configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] Backend rodando (`npm run dev`)
- [ ] Health check funcionando (`http://localhost:3001/health`)
- [ ] Firewall configurado (se necessário)
- [ ] Celular na mesma rede Wi-Fi
- [ ] Teste de cadastro funcionando

## 🆘 Ainda com problemas?

1. Verifique os logs do backend no terminal
2. Verifique o console do app mobile (React Native Debugger)
3. Teste a API diretamente com Postman ou curl
4. Verifique se o Firebase está acessível

