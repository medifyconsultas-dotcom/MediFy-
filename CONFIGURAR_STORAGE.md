# 🔧 Configurar Firebase Storage - Resolver CORS

## ⚠️ Erro de CORS no Upload de Imagens

O erro de CORS acontece porque as **regras de segurança do Firebase Storage** não estão configuradas.

## ✅ Solução: Configurar Regras do Storage

### Passo 1: Acessar o Console do Firebase Storage

1. Acesse: https://console.firebase.google.com/project/medify-401a8/storage/rules
2. Ou:
   - Vá para: https://console.firebase.google.com/project/medify-401a8
   - Clique em **Storage**
   - Vá na aba **Regras** (Rules)

### Passo 2: Copiar e Colar as Regras

O arquivo `storage.rules` já foi criado com as regras corretas. Copie o conteúdo e cole no console:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir upload de imagens para usuários autenticados
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024 // 5MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Regras específicas por pasta
    match /profissionais/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    match /pacientes/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    match /clinicas/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    match /funcionarios/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### Passo 3: Publicar as Regras

1. Clique em **"Publicar"** (Publish)
2. Aguarde alguns segundos para as regras serem aplicadas

### Passo 4: Testar

1. Recarregue a aplicação
2. Tente fazer upload de uma foto novamente
3. O erro de CORS deve desaparecer

## 🎨 Melhorias Implementadas

### Componente ImageUpload:
- ✅ Botão centralizado
- ✅ RGB glow suave e animado
- ✅ Animações ao clicar
- ✅ Preview melhorado
- ✅ Loading states
- ✅ Hover effects

### Funcionalidades:
- ✅ Validação de tipo de arquivo
- ✅ Validação de tamanho (máx 5MB)
- ✅ Preview antes de enviar
- ✅ Feedback visual
- ✅ Tratamento de erros melhorado

## 📝 Notas

- As regras permitem que usuários autenticados façam upload de imagens
- Limite de 5MB por arquivo
- Apenas imagens são permitidas
- Usuários só podem fazer upload para suas próprias pastas

