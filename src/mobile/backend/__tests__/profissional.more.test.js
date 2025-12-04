import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Profissional Controller - Additional Functions', () => {
  beforeEach(() => {
    auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });

    db.collection = (col) => {
      if (col === 'users') {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
          }),
        };
      }
      if (col === 'profissionais') {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => ({ nome: 'Profissional', perfil: 'profissional' }) }),
          }),
        };
      }
      return {
        doc: () => ({ get: async () => ({ exists: false }) }),
        where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        get: async () => ({ docs: [], size: 0 }),
      };
    };
  });

  describe('GET /api/profissional/consultas', () => {
    it('deve listar consultas do profissional com paginação', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            nm_paciente: 'Paciente 1',
            data_consulta: '2024-01-15 10:00',
            status: 'agendada',
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            id_profissional: 'prof-uid',
            nm_paciente: 'Paciente 2',
            data_consulta: '2024-01-16 14:00',
            status: 'confirmada',
          }),
        },
      ];

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Profissional' }) }),
            }),
          };
        }
        if (col === 'consultas_autonomos') {
          return {
            where: () => ({
              get: async () => ({
                docs: mockConsultas,
                empty: false,
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/consultas?page=1&limit=10')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/profissional/consultas/:id', () => {
    it('deve retornar detalhes de uma consulta', async () => {
      const mockConsulta = {
        id: 'cons-1',
        data: () => ({
          id_profissional: 'prof-uid',
          nm_paciente: 'Paciente Teste',
          data_consulta: '2024-01-15 10:00',
          status: 'agendada',
        }),
      };

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Profissional' }) }),
            }),
          };
        }
        if (col === 'consultas_autonomos') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                ...mockConsulta,
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/consultas/cons-1')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
    });

    it('deve retornar 404 se consulta não existe', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Profissional' }) }),
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
        .get('/api/profissional/consultas/inexistente')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/profissional/consultas/:id/status', () => {
    it('deve atualizar status da consulta', async () => {
      const mockConsulta = {
        exists: true,
        id: 'cons-1',
        data: () => ({
          id_profissional: 'prof-uid',
          status: 'agendada',
        }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'cons-1',
            data: () => ({
              id_profissional: 'prof-uid',
              status: 'confirmada',
            }),
          }),
        },
      };

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Profissional' }) }),
            }),
          };
        }
        if (col === 'consultas_autonomos') {
          return {
            doc: () => ({
              get: async () => mockConsulta,
              update: async () => ({}),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .patch('/api/profissional/consultas/cons-1/status')
        .set('Authorization', 'Bearer token')
        .send({
          status: 'confirmada',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('deve retornar 400 para status inválido', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Profissional' }) }),
            }),
          };
        }
        if (col === 'consultas_autonomos') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({ id_profissional: 'prof-uid', status: 'agendada' }),
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .patch('/api/profissional/consultas/cons-1/status')
        .set('Authorization', 'Bearer token')
        .send({
          status: 'status-invalido',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/profissional/perfil', () => {
    it('deve retornar perfil do profissional', async () => {
      const mockPerfil = {
        nome: 'Profissional Teste',
        email: 'prof@example.com',
        telefone: '11999999999',
        especialidade: 'Cardiologia',
        perfil: 'profissional',
      };

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => mockPerfil,
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/perfil')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('nome');
    });
  });

  describe('PUT /api/profissional/perfil', () => {
    it('deve atualizar perfil do profissional', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
              update: async () => ({}),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Profissional' }) }),
              update: async () => ({}),
            }),
          };
        }
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
            update: async () => ({}),
          }),
        };
      };

      const res = await request(app)
        .put('/api/profissional/perfil')
        .set('Authorization', 'Bearer token')
        .send({
          nome: 'Profissional Atualizado',
          especialidade: 'Neurologia',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/profissional/pacientes', () => {
    it('deve listar pacientes do profissional', async () => {
      const mockPacientes = [
        {
          id: 'pac1',
          data: () => ({
            nome: 'Paciente 1',
            email: 'pac1@example.com',
          }),
        },
        {
          id: 'pac2',
          data: () => ({
            nome: 'Paciente 2',
            email: 'pac2@example.com',
          }),
        },
      ];

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Profissional' }) }),
            }),
          };
        }
        if (col === 'pacientes') {
          return {
            get: async () => ({
              docs: mockPacientes,
              size: mockPacientes.length,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          get: async () => ({ docs: [], size: 0 }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/pacientes')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/profissional/prontuarios/:idPaciente', () => {
    it('deve retornar prontuário do paciente', async () => {
      const mockProntuario = {
        id: 'pront-1',
        data: () => ({
          id_paciente: 'pac-uid',
          historico: [],
          dataCriacao: Timestamp.now(),
        }),
      };

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Profissional' }) }),
            }),
          };
        }
        if (col === 'prontuarios') {
          return {
            where: () => ({
              get: async () => ({
                docs: [mockProntuario],
                empty: false,
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/prontuarios/pac-uid')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});
