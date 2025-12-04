# 📱 Configuração para Usar IP 4G (10.194.23.207)

## ✅ Configurações Aplicadas

### 1. **App Mobile** ✓
**Arquivo:** `mobile-app/src/api/config.ts`
```typescript
export const API_BASE_URL = 'http://10.194.23.207:3001';
```
**Status:** ✅ Já configurado!

---

### 2. **Django (Web)** ✓
**Arquivo:** `Medify_Web/core/settings.py`
```python
ALLOWED_HOSTS = ['10.194.23.207', 'localhost', '127.0.0.1', '192.168.56.1']
```
**Status:** ✅ Atualizado!

---

### 3. **Servidor Node.js (Backend Mobile)** ✓
**Arquivo:** `src/mobile/backend/src/server.js`
```javascript
app.listen(PORT, '0.0.0.0', () => { ... })
```
**Status:** ✅ Já configurado para aceitar qualquer IP!

---

## 🚀 Como Rodar os Servidores

### **Backend Mobile (Node.js) - Porta 3001**
```bash
cd "src/mobile/backend"
npm run dev
# ou
node src/server.js
```

O servidor irá:
- Escutar em `0.0.0.0:3001` (aceita qualquer IP)
- Mostrar no console: `http://10.194.23.207:3001/health`

**Teste:**
- Local: `http://localhost:3001/health`
- Rede: `http://10.194.23.207:3001/health`

---

### **Django (Web) - Porta 8000**
```bash
cd Medify_Web
python manage.py runserver 0.0.0.0:8000
```

O servidor irá:
- Escutar em `0.0.0.0:8000` (aceita qualquer IP)
- Aceitar conexões de `10.194.23.207`

**Teste:**
- Local: `http://localhost:8000`
- Rede: `http://10.194.23.207:8000`

---

## 📱 Configurar no App Mobile

O app já está configurado! Mas se precisar alterar:

**Arquivo:** `mobile-app/src/api/config.ts`
```typescript
export const API_BASE_URL = 'http://10.194.23.207:3001';
```

**Importante:**
- Use o IP da sua conexão 4G: `10.194.23.207`
- Porta do backend mobile: `3001`
- Certifique-se de que o servidor está rodando antes de testar

---

## 🔥 Firebase Admin SDK (Backend Mobile)

Se ainda não configurou, crie o arquivo `.env` em `src/mobile/backend/`:

```env
FIREBASE_PROJECT_ID=medify-401a8
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@medify-401a8.iam.gserviceaccount.com
PORT=3001
NODE_ENV=development
JWT_SECRET=sua-chave-secreta-aqui
CORS_ORIGIN=*
```

---

## ⚠️ Importante

1. **Firewall do Windows:**
   - Certifique-se de que as portas 3001 e 8000 estão liberadas
   - Windows Defender pode bloquear conexões externas

2. **IP Dinâmico:**
   - O IP 4G pode mudar quando você reconectar
   - Verifique o IP novamente com `ipconfig` se não conectar

3. **Teste de Conexão:**
   - No celular, acesse: `http://10.194.23.207:3001/health`
   - Deve retornar JSON com status "ok"

4. **Mesma Rede:**
   - O dispositivo que vai acessar precisa estar na mesma rede 4G
   - Ou usar dados móveis do mesmo provedor

---

## 🧪 Testar Conexão

### No Celular (navegador):
```
http://10.194.23.207:3001/health
```

### No Computador:
```bash
curl http://10.194.23.207:3001/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development"
}
```

---

## 📝 Resumo

| Serviço | IP | Porta | Status |
|---------|----|----|--------|
| Backend Mobile | 10.194.23.207 | 3001 | ✅ Configurado |
| Django Web | 10.194.23.207 | 8000 | ✅ Configurado |
| App Mobile | 10.194.23.207 | 3001 | ✅ Configurado |

**Tudo pronto!** 🎉

