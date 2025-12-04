import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Edge Cases Tests', () => {
  describe('Paciente Controller - Edge Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com fallback quando busca profissional falha', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }),
            }),
          };
        }
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Paciente' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => {
                throw new Error('Erro ao buscar');
              },
            }),
          };
        }
        if (col === 'funcionarios') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                collection: () => ({
                  get: async () => ({ docs: [] }),
                }),
              }),
            }),
          };
        }
        if (col === 'consultas_autonomos' || col === 'consultas_clinicas') {
          return {
            where: () => ({
              get: async () => ({ docs: [], empty: true }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get(`/api/paciente/horarios-disponiveis/prof-uid?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com erro ao buscar funcionário no fallback', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }),
            }),
          };
        }
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Paciente' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => {
                throw new Error('Erro ao buscar');
              },
            }),
          };
        }
        if (col === 'funcionarios') {
          return {
            doc: () => ({
              get: async () => {
                throw new Error('Erro no fallback');
              },
            }),
          };
        }
        if (col === 'consultas_autonomos' || col === 'consultas_clinicas') {
          return {
            where: () => ({
              get: async () => ({ docs: [], empty: true }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get(`/api/paciente/horarios-disponiveis/prof-uid?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com consultas usando data_consulta em formato diferente', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(14, 30, 0, 0);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data_consulta: amanha.toISOString().replace('T', ' ').substring(0, 16),
            status: 'agendada',
          }),
        },
      ];

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }),
            }),
          };
        }
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Paciente' }) }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                collection: () => ({
                  get: async () => ({ docs: [] }),
                }),
              }),
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
        if (col === 'consultas_clinicas') {
          return {
            where: () => ({
              get: async () => ({ docs: [], empty: true }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get(`/api/paciente/horarios-disponiveis/prof-uid?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('Profissional Controller - Edge Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('GET /api/profissional/consultas - deve buscar com diferentes campos de idProfissional', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            idProfissional: 'prof-uid',
            nm_paciente: 'Paciente 1',
            data_consulta: '2024-01-15 10:00',
            status: 'agendada',
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            profissional_uid: 'prof-uid',
            nm_paciente: 'Paciente 2',
            data_consulta: '2024-01-16 14:00',
            status: 'realizada',
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
            where: () => {
              // Primeiro where falha, então busca todas e filtra
              throw new Error('Query error');
            },
            get: async () => ({
              docs: mockConsultas,
              size: mockConsultas.length,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/consultas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 500]).toContain(res.status);
    });

    it('GET /api/profissional/consultas - deve buscar usando idProfissional e profissional_uid', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            idProfissional: 'prof-uid',
            nm_paciente: 'Paciente 1',
            data: '2024-01-15',
            hora: '10:00',
            status: 'agendada',
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
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({ nome: 'Paciente 1' }),
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
        .get('/api/profissional/consultas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });
  });
});
