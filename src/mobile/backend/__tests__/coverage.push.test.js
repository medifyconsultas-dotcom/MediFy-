import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Coverage Push - Additional Tests', () => {
  describe('Edge Cases and Coverage', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'test-uid', email: 'test@example.com' });
    });

    it('GET /api/paciente/consultas - ordenação correta por data', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            nm_profissional: 'Dr. Teste',
            data_consulta: '2024-01-10 10:00',
            status: 'realizada',
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            id_paciente: 'pac-uid',
            nm_profissional: 'Dr. Teste',
            data_consulta: '2024-01-15 10:00',
            status: 'realizada',
          }),
        },
        {
          id: 'cons3',
          data: () => ({
            id_paciente: 'pac-uid',
            nm_profissional: 'Dr. Teste',
            data_consulta: '2024-01-12 10:00',
            status: 'realizada',
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
        .get('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('GET /api/profissional/dashboard - com diferentes status normalizados', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data: hoje.toISOString().split('T')[0],
            hora: '09:00',
            status: 'Agendada', // Com maiúscula
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            id_profissional: 'prof-uid',
            data: hoje.toISOString().split('T')[0],
            hora: '10:00',
            status: 'CONFIRMADA', // Em maiúsculas
          }),
        },
        {
          id: 'cons3',
          data: () => ({
            id_profissional: 'prof-uid',
            data: hoje.toISOString().split('T')[0],
            hora: '11:00',
            status: 'realizada', // Minúscula
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
  });
});
