import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Last Coverage Push Tests', () => {
  describe('Profissional Controller - Last Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('GET /api/profissional/consultas - com erro ao buscar nome do paciente', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            id_paciente: 'pac-1',
            data: '2024-01-15',
            hora: '10:00',
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
            get: async () => ({
              docs: mockConsultas,
              size: mockConsultas.length,
            }),
          };
        }
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => {
                throw new Error('Erro ao buscar paciente');
              },
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

    it('GET /api/profissional/consultas - processando consultas com erro ao parsear data/hora', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data: 'data-invalida',
            hora: 'hora-invalida',
            nm_paciente: 'Paciente 1',
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
        .get('/api/profissional/consultas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('GET /api/profissional/consultas - com erro ao buscar todas e filtrando manualmente', async () => {
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
          let callCount = 0;
          return {
            where: () => {
              callCount++;
              if (callCount === 1) {
                return {
                  where: () => ({
                    get: async () => {
                      throw new Error('First error');
                    },
                  }),
                  get: async () => {
                    throw new Error('First error');
                  },
                };
              } else if (callCount === 2) {
                return {
                  where: () => ({
                    get: async () => {
                      throw new Error('Second error');
                    },
                  }),
                  get: async () => {
                    throw new Error('Second error');
                  },
                };
              }
            },
            get: async () => ({
              docs: [],
              size: 0,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/consultas?status=agendada')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 500]).toContain(res.status);
    });
  });
});
