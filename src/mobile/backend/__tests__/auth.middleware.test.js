import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('Auth Middleware - Additional Tests', () => {
  describe('authenticate middleware', () => {
    it('deve retornar 401 quando Authorization header está ausente', async () => {
      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token de autenticação não fornecido');
    });

    it('deve retornar 401 quando token está mal formatado', async () => {
      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'InvalidFormat token123')
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
    });

    it('deve retornar 401 quando token é inválido', async () => {
      auth.verifyIdToken = async () => {
        throw new Error('Invalid token');
      };

      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'Bearer invalid-token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token inválido');
    });

    it('deve retornar 401 quando token está vazio', async () => {
      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'Bearer ')
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
    });
  });

  describe('requireProfile middleware', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'user-uid', email: 'user@example.com' });
    });

    it('deve retornar 401 quando req.user não existe', async () => {
      // Simular autenticação passou mas req.user não foi definido
      auth.verifyIdToken = async () => {
        throw new Error('Should not reach here');
      };

      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Accept', 'application/json');

      expect(res.status).toBe(401);
    });

    it('deve retornar 403 quando perfil não é permitido', async () => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });

      db.collection = (col) => {
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({ perfil: 'paciente', nome: 'Paciente' }),
              }),
            }),
          };
        }
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({ perfil: 'paciente' }),
              }),
            }),
          };
        }
        return { doc: () => ({ get: async () => ({ exists: false }) }) };
      };

      // Tentar acessar rota que requer perfil profissional com usuário paciente
      const res = await request(app)
        .get('/api/profissional/dashboard')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('deve retornar 404 quando perfil não é encontrado em nenhuma collection', async () => {
      auth.verifyIdToken = async () => ({ uid: 'user-uid', email: 'user@example.com' });

      db.collection = () => ({
        doc: () => ({
          get: async () => ({ exists: false }),
        }),
        where: () => ({
          get: async () => ({ empty: true, docs: [] }),
        }),
      });

      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Perfil do usuário não encontrado');
    });

    it('deve inferir perfil pela collection quando não tem campo perfil', async () => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });

      db.collection = (col) => {
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({ nome: 'Paciente' }), // Sem campo perfil
              }),
            }),
          };
        }
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
            }),
          };
        }
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
          where: () => ({
            get: async () => ({ empty: true }),
          }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('deve tratar erro ao buscar perfil por email para funcionários', async () => {
      auth.verifyIdToken = async () => ({ uid: 'func-uid', email: 'func@example.com' });

      db.collection = (col) => {
        if (col === 'funcionarios') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
            }),
            where: () => {
              throw new Error('Query error');
            },
          };
        }
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
            }),
          };
        }
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });

    it('deve tratar erro genérico ao verificar perfil', async () => {
      auth.verifyIdToken = async () => ({ uid: 'user-uid', email: 'user@example.com' });

      db.collection = () => {
        throw new Error('Unexpected error');
      };

      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('deve encontrar funcionário por email e usar cargo como perfil', async () => {
      auth.verifyIdToken = async () => ({ uid: 'func-uid', email: 'medico@example.com' });

      db.collection = (col) => {
        if (col === 'funcionarios') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
            }),
            where: () => ({
              get: async () => ({
                empty: false,
                docs: [{
                  data: () => ({
                    nome: 'Dr. Medico',
                    cargo: 'medico',
                  }),
                }],
              }),
            }),
          };
        }
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
            }),
          };
        }
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      };

      // Este teste requer uma rota que aceite perfil medico
      // Por enquanto, apenas verificamos que o middleware processa corretamente
      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      // O perfil medico não é permitido para rota de paciente
      expect(res.status).toBe(403);
    });
  });
});
