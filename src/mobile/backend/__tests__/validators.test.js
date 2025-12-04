// Testes de validação
import { loginSchema, registerSchema, agendamentoSchema } from '../src/utils/validators.js';

describe('Validators', () => {
  describe('loginSchema', () => {
    it('deve validar login com email e senha válidos', () => {
      const { error } = loginSchema.validate({
        email: 'teste@example.com',
        password: '123456',
      });
      expect(error).toBeUndefined();
    });

    it('deve rejeitar email inválido', () => {
      const { error } = loginSchema.validate({
        email: 'email-invalido',
        password: '123456',
      });
      expect(error).toBeDefined();
    });

    it('deve rejeitar senha muito curta', () => {
      const { error } = loginSchema.validate({
        email: 'teste@example.com',
        password: '123',
      });
      expect(error).toBeDefined();
    });
  });

  describe('registerSchema', () => {
    it('deve validar registro completo', () => {
      const { error } = registerSchema.validate({
        email: 'novo@example.com',
        password: '123456',
        nome: 'Novo Usuário',
        perfil: 'paciente',
      });
      expect(error).toBeUndefined();
    });

    it('deve rejeitar perfil inválido', () => {
      const { error } = registerSchema.validate({
        email: 'teste@example.com',
        password: '123456',
        nome: 'Teste',
        perfil: 'perfil-invalido',
      });
      expect(error).toBeDefined();
    });
  });
});

