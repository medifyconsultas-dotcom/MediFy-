import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Target 80% Coverage - Final Push', () => {
  describe('Multiple Edge Cases for Maximum Coverage', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'test-uid', email: 'test@example.com' });
    });

    it('GET /api/paciente/dashboard - combinação completa de casos', async () => {
      const consultaFutura = {
        id: 'cons-futura',
        data: () => ({
          id_paciente: 'pac-uid',
          data_consulta: { toDate: () => new Date(Date.now() + 86400000) },
          status: 'agendada',
          nm_profissional: 'Dr. Futuro',
        }),
      };

      const consultaRealizada = {
        id: 'cons-realizada',
        data: () => ({
          id_paciente: 'pac-uid',
          data_consulta: { toDate: () => new Date(Date.now() - 86400000) },
          status: 'realizada',
          nm_profissional: 'Dr. Passado',
        }),
      };

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
        if (col === 'consultas_autonomos') {
          return {
            where: () => ({
              get: async () => ({
                docs: [consultaFutura, consultaRealizada],
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
        .get('/api/paciente/dashboard')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/profissional/dashboard - casos complexos de status', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data: hoje.toISOString().split('T')[0],
            hora: '09:00',
            status: 'cancelada',
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            id_profissional: 'prof-uid',
            data: hoje.toISOString().split('T')[0],
            hora: '10:00',
            status: 'agendada',
          }),
        },
        {
          id: 'cons3',
          data: () => ({
            id_profissional: 'prof-uid',
            dataConsulta: Timestamp.fromDate(new Date(hoje.getTime() + 3600000)),
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
                data: () => ({ nome: 'Paciente' }),
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
        .get('/api/profissional/dashboard')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('GET /api/profissional/consultas - processamento completo com todas as variantes', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            dataConsulta: Timestamp.fromDate(new Date('2024-01-15T10:00:00')),
            paciente_nome: 'Paciente 1',
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            id_profissional: 'prof-uid',
            data: '2024-01-16',
            hora: '14:00',
            nomePaciente: 'Paciente 2',
          }),
        },
        {
          id: 'cons3',
          data: () => ({
            id_profissional: 'prof-uid',
            data_consulta: Timestamp.fromDate(new Date('2024-01-17T16:00:00')),
            id_paciente: 'pac-3',
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
                data: () => ({ nome: 'Paciente Teste' }),
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
        .get('/api/profissional/consultas?page=1&limit=5')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });
  });
});
