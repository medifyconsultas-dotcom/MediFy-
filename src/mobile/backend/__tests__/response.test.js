// Testes das funções de resposta
import { successResponse, errorResponse, paginatedResponse } from '../src/utils/response.js';

describe('Response Utils', () => {
  describe('successResponse', () => {
    it('deve retornar resposta de sucesso', () => {
      const mockRes = {
        status: (code) => ({
          json: (data) => ({ code, data }),
        }),
      };

      const result = successResponse(mockRes, { id: 1, nome: 'Teste' }, 'Sucesso', 200);

      expect(result.code).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.message).toBe('Sucesso');
      expect(result.data.data.nome).toBe('Teste');
    });
  });

  describe('errorResponse', () => {
    it('deve retornar resposta de erro', () => {
      const mockRes = {
        status: (code) => ({
          json: (data) => ({ code, data }),
        }),
      };

      const result = errorResponse(mockRes, 'Erro teste', 'Mensagem de erro', 400);

      expect(result.code).toBe(400);
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('Erro teste');
      expect(result.data.message).toBe('Mensagem de erro');
    });
  });

  describe('paginatedResponse', () => {
    it('deve retornar resposta paginada', () => {
      const mockRes = {
        status: (code) => ({
          json: (data) => ({ code, data }),
        }),
      };

      const data = [{ id: 1 }, { id: 2 }];
      const result = paginatedResponse(mockRes, data, 1, 10, 20, 'Sucesso');

      expect(result.code).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.data).toEqual(data);
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.limit).toBe(10);
      expect(result.data.pagination.total).toBe(20);
      expect(result.data.pagination.totalPages).toBe(2);
    });
  });
});

