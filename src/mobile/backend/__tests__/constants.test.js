// Testes de constantes
import { USER_PROFILES, CONSULTA_STATUS, COLLECTIONS, ERROR_MESSAGES } from '../src/config/constants.js';

describe('Constants', () => {
  it('deve ter os perfis de usuário corretos', () => {
    expect(USER_PROFILES.PACIENTE).toBe('paciente');
    expect(USER_PROFILES.PROFISSIONAL).toBe('profissional');
    expect(USER_PROFILES.ADMIN).toBe('admin');
  });

  it('deve ter os status de consulta corretos', () => {
    expect(CONSULTA_STATUS.AGENDADA).toBe('agendada');
    expect(CONSULTA_STATUS.CONFIRMADA).toBe('confirmada');
    expect(CONSULTA_STATUS.REALIZADA).toBe('realizada');
    expect(CONSULTA_STATUS.CANCELADA).toBe('cancelada');
  });

  it('deve ter as collections definidas', () => {
    expect(COLLECTIONS.USERS).toBe('users');
    expect(COLLECTIONS.PACIENTES).toBe('pacientes');
    expect(COLLECTIONS.CONSULTAS).toBe('consultas');
  });

  it('deve ter mensagens de erro definidas', () => {
    expect(ERROR_MESSAGES.UNAUTHORIZED).toBe('Não autorizado');
    expect(ERROR_MESSAGES.NOT_FOUND).toBe('Recurso não encontrado');
  });
});

