# Resumo de Mudanças: Sistema de Upload de Fotos

## 📋 Problema Original
Fotos não eram salvas quando pressionado "Salvar dados" nos perfis de Profissional, Paciente e Clínica.

## 🔍 Causa Raiz
- Templates usavam `{{ foto.url }}` em um campo string (Firestore não é Django ORM)
- Faltava suporte para multipart/form-data nos handlers
- Paciente tinha upload Firebase que conflitava com form local

## ✅ Solução Implementada

### 1. **Profissional** (views_profissionais.py)
- ✅ Handler `editar_perfil_profissional()` agora aceita `request.FILES['foto']`
- ✅ Salva arquivo em `/media/profissionais/{uid}_{timestamp}.ext`
- ✅ Atualiza Firestore com URL relativa
- ✅ Template corrigido: `{{ profissional.foto }}` (sem `.url`)

### 2. **Paciente** (views_paciente.py)
- ✅ Handler `perfilPaciente()` modificado para aceitar `request.FILES['foto']`
- ✅ Mesmo fluxo: salva em `/media/pacientes/{uid}_{timestamp}.ext`
- ✅ JavaScript simplificado: apenas preview local (removido Firebase upload)
- ✅ Input file agora tem `name="foto"` para ser incluído no POST

### 3. **Clínica** (views_clinica.py + firebase_services.py)
- ✅ Adicionada função `obter_clinica(clinica_id)` em firebase_services.py
- ✅ Handler `dashboard_clinica()` completamente reescrito
  - GET: Exibe form com dados atuais + upload
  - POST: Salva dados + foto em `/media/clinicas/{uid}_{timestamp}.ext`
- ✅ Novo template dashboardClinica.html com form de perfil

## 📁 Estrutura de Arquivos

```
/media/
├── profissionais/       # Fotos de profissionais
│   ├── {uid}_{ts1}.jpg
│   └── {uid}_{ts2}.jpg
├── pacientes/          # Fotos de pacientes
│   └── {uid}_{ts}.jpg
└── clinicas/           # Logos de clínicas
    └── {uid}_{ts}.jpg
```

## 🔐 Campo Firestore

Todos os três tipos armazenam em um campo `foto`:
```json
{
  "nome": "João Silva",
  "foto": "/media/profissionais/uid_1762837220.jpg",
  ...
}
```

## 🎯 Fluxo de Upload

1. **Frontend**: Usuário seleciona arquivo via `<input type="file" name="foto">`
2. **Form**: Envia POST com `enctype="multipart/form-data"`
3. **Backend**: 
   - Handler recebe `request.FILES['foto']`
   - Salva em disco `/media/{tipo}/{uid}_{timestamp}.ext`
   - Armazena URL em Firestore `foto` field
4. **UI**: Template renderiza `{{ entidade.foto }}` como `<img src="/media/...">`

## 📝 Formulários Atualizados

### editarPerfil.html (Profissional)
- ✅ Form com `enctype="multipart/form-data"`
- ✅ Input `name="foto"`
- ✅ Exibe preview de foto atual

### perfilPaciente.html (Paciente)
- ✅ Simplificado: removido Firebase JS complexo
- ✅ Input `name="foto"` para POST normal
- ✅ Preview local ao selecionar

### dashboardClinica.html (Clínica) - NOVO
- ✅ Form com campos: nome, telefone, endereço
- ✅ Upload de logo/foto
- ✅ Preview local

## 🧪 Como Testar

### Teste Manual - Profissional
1. Login como Profissional
2. Ir para "Editar Perfil"
3. Selecionar foto
4. Clicar "Salvar Perfil"
5. ✅ Verificar: Arquivo em `/media/profissionais/`
6. ✅ Verificar: Firestore tem URL em campo `foto`
7. ✅ Verificar: Foto exibe no dashboard

### Teste Manual - Paciente
1. Login como Paciente
2. Ir para Perfil
3. Selecionar foto (vai fazer preview local)
4. Clicar "Salvar Perfil"
5. ✅ Mesmos passos acima

### Teste Manual - Clínica
1. Login como Administrador de Clínica
2. Ir para Dashboard da Clínica
3. Preencher dados (opcional)
4. Selecionar logo/foto
5. Clicar "Salvar Perfil"
6. ✅ Mesmos passos acima

## 🛡️ Validações Ainda Faltando

- [ ] MIME type check (apenas jpg, png)
- [ ] File size limit (max 5MB)
- [ ] Autorização: usuário só pode atualizar próprio perfil
- [ ] Teste de persistência após logout/login
- [ ] Teste com imagens grandes

## 📊 Checklist de Código

- [x] Python syntax validado (py_compile)
- [x] Imports corretos
- [x] Uso correto de Firestore API
- [x] Media paths configurados
- [x] CSRF tokens inclusos
- [x] Messages Django para feedback
- [ ] Testes automatizados

## 🚀 Próximos Passos

1. **Testar manualmente** cada perfil
2. **Adicionar validações** (MIME, size)
3. **Criar testes automatizados** (medify_web/tests.py)
4. **Testar persistência** (logout/login)
5. **Cleanup de fotos antigas** (opcional - cron job)
