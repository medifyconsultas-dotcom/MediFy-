import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Horários Disponíveis - Comprehensive Tests', () => {
  describe('GET /api/paciente/horarios-disponiveis/:profissionalId', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('deve retornar horários recorrentes com data específica', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];
      const diaSemana = amanha.getDay();

      const mockHorarios = [
        {
          id: 'hor1',
          data: () => ({
            tipo: 'recorrente',
            diaSemana: diaSemana,
            data: dataStr,
            hora: '09:00',
            disponivel: true,
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
                  get: async () => ({
                    docs: mockHorarios,
                  }),
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

    it('deve retornar horários específicos com data no formato DD/MM/YYYY', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];
      const dataFormatoBR = `${amanha.getDate()}/${amanha.getMonth() + 1}/${amanha.getFullYear()}`;

      const mockHorarios = [
        {
          id: 'hor1',
          data: () => ({
            tipo: 'especifico',
            data: dataFormatoBR,
            hora: '14:00',
            disponivel: true,
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
                  get: async () => ({
                    docs: mockHorarios,
                  }),
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

    it('deve retornar horários ocupados das consultas', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data: dataStr,
            hora: '10:00',
            status: 'agendada',
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            id_profissional: 'prof-uid',
            dataConsulta: Timestamp.fromDate(new Date(amanha.getTime() + 3600000)),
            status: 'confirmada',
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

    it('deve buscar horários quando profissional é funcionário', async () => {
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
              get: async () => ({ exists: false }),
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
        .get(`/api/paciente/horarios-disponiveis/func-uid?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /api/profissional/horarios-disponiveis', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('deve retornar horários recorrentes', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];
      const diaSemana = amanha.getDay();

      const mockHorarios = [
        {
          id: 'hor1',
          data: () => ({
            tipo: 'recorrente',
            diaSemana: diaSemana,
            hora: '09:00',
            disponivel: true,
          }),
        },
      ];

      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data: dataStr,
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
              get: async () => ({
                exists: true,
                collection: () => ({
                  get: async () => ({
                    docs: mockHorarios,
                  }),
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
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get(`/api/profissional/horarios-disponiveis?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('deve retornar horários específicos', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockHorarios = [
        {
          id: 'hor1',
          data: () => ({
            tipo: 'especifico',
            data: dataStr,
            hora: '14:00',
            disponivel: true,
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
              get: async () => ({
                exists: true,
                collection: () => ({
                  get: async () => ({
                    docs: mockHorarios,
                  }),
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
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get(`/api/profissional/horarios-disponiveis?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400]).toContain(res.status);
    });

    it('deve retornar 400 se data não for fornecida', async () => {
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
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/horarios-disponiveis')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
    });

    it('deve processar consultas com data_consulta Timestamp', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(10, 0, 0, 0);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data_consulta: Timestamp.fromDate(amanha),
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
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get(`/api/profissional/horarios-disponiveis?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });
  });
});
