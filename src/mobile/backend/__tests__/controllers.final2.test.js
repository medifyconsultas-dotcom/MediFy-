import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Final Coverage Tests Part 2', () => {
  describe('Paciente Controller - Final Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('GET /api/paciente/consultas - histórico com erro ao buscar consultas clínicas', async () => {
      const mockConsultasAutonomos = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            nm_profissional: 'Dr. Teste',
            data_consulta: '2024-01-15 10:00',
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
                docs: mockConsultasAutonomos,
                empty: false,
              }),
            }),
          };
        }
        if (col === 'consultas_clinicas') {
          return {
            where: () => {
              throw new Error('Erro ao buscar consultas clínicas');
            },
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

    it('GET /api/paciente/consultas - histórico com consultas clínicas usando dataConsulta', async () => {
      const mockConsultasClinicas = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            nm_profissional: 'Dr. Funcionario',
            dataConsulta: Timestamp.fromDate(new Date('2024-01-15T10:00:00')),
            status: 'realizada',
            id_clinica: 'clinica-1',
            nm_clinica: 'Clínica Teste',
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
        .get('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });
  });

  describe('Profissional Controller - Final Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('GET /api/profissional/dashboard - com erro ao buscar usando idProfissional', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            idProfissional: 'prof-uid',
            nm_paciente: 'Paciente 1',
            data: hoje.toISOString().split('T')[0],
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
                  get: async () => {
                    throw new Error('First query error');
                  },
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

      expect([200, 500]).toContain(res.status);
    });

    it('GET /api/profissional/dashboard - com erro ao buscar usando profissional_uid', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            profissional_uid: 'prof-uid',
            nm_paciente: 'Paciente 1',
            data: hoje.toISOString().split('T')[0],
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
          let callCount = 0;
          return {
            where: () => {
              callCount++;
              if (callCount === 1) {
                return {
                  get: async () => {
                    throw new Error('First query error');
                  },
                };
              } else if (callCount === 2) {
                return {
                  get: async () => {
                    throw new Error('Second query error');
                  },
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

      expect([200, 500]).toContain(res.status);
    });

    it('GET /api/profissional/dashboard - com consultas usando data e hora', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            nm_paciente: 'Paciente 1',
            data: hoje.toISOString().split('T')[0],
            hora: '14:00',
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
});
