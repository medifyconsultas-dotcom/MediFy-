# 📝 Como Criar o Arquivo .env

## ✅ Opção 1: Copiar o arquivo de exemplo (Recomendado)

No PowerShell, execute:

```powershell
cd "C:\Users\illib\Downloads\basic app\src\mobile\backend"
Copy-Item ".env.example.complete" ".env"
```

## ✅ Opção 2: Criar manualmente

1. Crie um arquivo chamado `.env` na pasta `src/mobile/backend/`
2. Cole o seguinte conteúdo:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=medify-401a8
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDeectiyEGuMgRB\nzvXZP5KmdorCmEXWRO2B5E6nmI1RZk7PPaC/8FoAKYhwSngGGb1ALNSYHMf0ToGj\n1eOSTj6GwEOHTRruyUivQLL7fFDbknSeBLzN5On0lQC9gbFiE/IA7lysKtYTcwSZ\nb8JXycCw3RIpOJnx4XQ8DMMGdM1i3a5tJIq14/Bhr8hPNUYHgFLECiZT1whT10p5\nwWSIs55Nl4Rn616GCtQvICB7OomWpwB0RUgmBWsEVyt0/bwajOn2SuTVVy44922g\n0pNSmHvFxbcyHg/XEcPt+QTqeOISoypsRXZeHab9WyozUapcWsIbKg7c3e8xetVR\nHx2CAZi5AgMBAAECggEAGtOH3VD1bopUbhUFGx2p0s2/fKh831Hva7a6b0YbYEHc\nZevx+sMCLzvS2mt4Xo/y/I6LUg5CZCilRDqx1r39lyUO331CLqHx1EQScPW0EE3w\nJu++Tnt4ZIglDzTYzVFHYKpdXVtK9gxr9Q5/WjOXOxxlKLhNA9giOm11hM1HyNBl\nraGXQ9VvWE+gUNSy+J0CUyfSYshNyrC9JtB9dqw3qFfTLbc+V/6ULgoUsZdtr7IS\n+X+Syn8lTDXefsmY/EoE4//ZsIsLmNOLu151HZzp0ZiuESVdbHHPMl7e3SM8opQX\neyZ0drmfcSQ/ZwD/AcV6CkgyHvMMuQmNFnx81IvgwQKBgQD6Zt4t+bKBvCUGwhU4\nCySP2cHoBOnFSgPUHGPJVVkaxw6tGZ9diZwVKAZPjhaPdeulGNh2HvZqQs6QkzIK\neuem5z4gWeaCozPwN7m3FGw7m7DovpdZ9qCYenuU32EsrYAX/73mJrDrk7eN3/Mm\n8lXrHVsJIHLyrx/n2XXQaFFdyQKBgQDjcxi0guV6Ds9U7s+whEFckxpe+aAHvWfa\nFyUyqEK1hmOq05JY5dseDdjCgUtT5/OWt+DZaUxEqQFdv3hqBL/mnp2p0yARQqJI\nh10qT+RR9wsVLL7px4XdjU51JS7xaZV9D1DHr9E3ItWHlbeQ+pj0eoE+4DFE+Tw6\nvnlUlRsbcQKBgDB2cFHdndrWGyRvs8OhBHaC4rCRIt14Mb1/sSBqUFCKbiC6cMmd\ntIOzt2T2Tw989xqA8IQMAg0W2PvKQUkd+G+pGbERNTfbdlXrsxnn7fqra1XgbVKQ\nFQztx7VMdnY7Lit2573/hwZRFJl02o6TIGXczJ27lgO6OSaaQ98OEZFhAoGBAIFe\nScMCYLuYCN1qJ79iujqJgQpcOWWtmZA2cfXqNmdBVRco16iwtHzXq16WY94JpEcp\ntz5x4et7pUdJTJggs3Xc6hhZ+XdXyy4tsBQM9PSZ6zfUB5K45a8qXGHNEHJHd7t2\nJqAtpHYT3hgMVCimILGNrE2y/tMYX+WZyTEOzihBAoGAYvFw+IVf1bZ6Bn1yBKb6\ndkne6woZWsf2tPCPa3Voh8Xt0n79D+25M1ipLU4h8imOUJUjWeqTgNoRbCOyG+KH\necajGFrUTidaKgFEXojGGT1TlLpeGeRvCdNIL+eE5Psk240+MSusSxJ6nSRyas+f\n1PFj7C/glgQsxQO/QkD7EpA=\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@medify-401a8.iam.gserviceaccount.com

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (pode ser qualquer string aleatória)
JWT_SECRET=medify-super-secret-key-2024-change-in-production

# CORS (permitir todas as origens para mobile)
CORS_ORIGIN=*
```

## ✅ Verificar se está correto

Depois de criar o arquivo, execute:

```powershell
cd "C:\Users\illib\Downloads\basic app\src\mobile\backend"
npm run check-firebase
```

Se tudo estiver correto, você verá:
```
✅ Todas as variáveis de ambiente estão configuradas!
✅ Firebase Admin SDK inicializado com sucesso!
```

## ⚠️ Importante

- O arquivo `.env` está no `.gitignore` (não será commitado no Git)
- Mantenha suas credenciais seguras
- Nunca compartilhe o arquivo `.env`

