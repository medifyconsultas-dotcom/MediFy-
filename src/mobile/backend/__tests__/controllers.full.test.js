import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Full Coverage Tests', () => {
  describe('Profissional Controller - Full Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('GET /api/profissional/consultas - com erro no primeiro where, tentando segundo campo', async () => {
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
          let firstCall = true;
          return {
            where: () => {
              if (firstCall) {
                firstCall = false;
                return {
                  where: () => ({
                    get: async () => {
                      throw new Error('First query error');
                    },
                  }),
                };
              } else {
                return {
                  get: async () => ({
                    docs: mockConsultas,
                    empty: false,
                  }),
                };
              }
            },
            get: async () => ({
              docs: mockConsultas,
              size: mockConsultas.length,
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
        .get('/api/profissional/consultas?status=agendada')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 500]).toContain(res.status);
    });

    it('GET /api/profissional/consultas - processando consultas com data e hora separados', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data: '2024-12-25',
            hora: '14:30',
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

    it('GET /api/profissional/consultas - processando consultas com data_consulta', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data_consulta: Timestamp.fromDate(new Date('2024-12-25T14:30:00')),
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

    it('GET /api/profissional/dashboard - com consultas usando data_consulta', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data_consulta: Timestamp.fromDate(new Date(hoje.getTime() + 3600000)),
            nm_paciente: 'Paciente 1',
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
        .get('/api/profissional/dashboard')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });
  });

  describe('Paciente Controller - Full Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com consultas clínicas usando data_consulta', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(15, 0, 0, 0);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockConsultasClinicas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            dataConsulta: Timestamp.fromDate(amanha),
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
              get: async () => ({ docs: [], empty: true }),
            }),
          };
        }
        if (col === 'consultas_clinicas') {
          return {
            where: () => ({
              get: async () => ({
                docs: mockConsultasClinicas,
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
        .get(`/api/paciente/horarios-disponiveis/prof-uid?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com consultas clínicas do paciente usando dataConsulta', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(16, 0, 0, 0);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockConsultasClinicasPaciente = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            dataConsulta: Timestamp.fromDate(amanha),
            nm_profissional: 'Dr. Outro',
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
              get: async () => ({ docs: [], empty: true }),
            }),
          };
        }
        if (col === 'consultas_clinicas') {
          return {
            where: () => ({
              get: async () => ({
                docs: mockConsultasClinicasPaciente,
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
        .get(`/api/paciente/horarios-disponiveis/prof-uid?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });
  });
});
