# 🌱 Instruções para Seed de Dados (Simulação de Uma Semana)

## 📋 Como Usar

### 1. Garantir que os usuários existem
Primeiro, execute o script de inicialização para criar os usuários:

```bash
npm run init:firebase
```

### 2. Criar dados simulados de uma semana
Execute o script de seed para criar dados de uma semana (2 consultas por dia):

```bash
npm run seed:data
```

## 🎯 O que o script cria:

### 📊 Dados Criados:

1. **👥 15 Pacientes**
   - Nomes variados
   - Dados completos (CPF, telefone, endereço, plano)
   - Datas de nascimento aleatórias

2. **📅 Consultas (1 semana, ~2 por dia)**
   - 7 dias de dados
   - 2 consultas por dia (manhã e tarde)
   - Total: ~14 consultas
   - Status variados: agendada, confirmada, realizada, cancelada
   - Vinculadas aos profissionais existentes

3. **📋 Prontuários (~2 por profissional)**
   - Histórico com 2 observações
   - Vinculados aos pacientes
   - Dados completos de histórico

## 🚀 Rodar apenas o Electron

### Opção 1: Build e rodar (recomendado)
```bash
npm run electron
```

Este comando:
1. Compila o TypeScript do Electron
2. Faz build do frontend
3. Abre o Electron

### Opção 2: Apenas rodar (se já tiver feito build)
```bash
npm run electron:standalone
```

## 📝 Fluxo Completo

1. **Limpar tudo (opcional):**
   ```bash
   npm run clear:firebase
   ```

2. **Criar usuários:**
   ```bash
   npm run init:firebase
   ```

3. **Criar dados simulados:**
   ```bash
   npm run seed:data
   ```

4. **Rodar o Electron:**
   ```bash
   npm run electron
   ```

5. **Fazer login com qualquer usuário criado:**
   - Clínica: `clinica@medify.com` / `123456`
   - Profissional: `profissional@medify.com` / `123456`
   - Recepcionista: `recepcionista@medify.com` / `123456`
   - Médico: `medico@medify.com` / `123456`
   - Enfermeiro: `enfermeiro@medify.com` / `123456`

## ✨ Resultado

Após executar o seed, você terá:
- ✅ Uma semana completa de consultas (2 por dia)
- ✅ Pacientes variados
- ✅ Prontuários com histórico
- ✅ Dados realistas para testar o sistema

Tudo isso registrado no Firebase, exatamente como você solicitou! 🎉

