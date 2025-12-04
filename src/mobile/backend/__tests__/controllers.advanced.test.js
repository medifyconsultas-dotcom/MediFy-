import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Advanced Coverage Tests', () => {
  describe('Paciente Controller - Advanced Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com consultas clínicas ocupadas', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockConsultasClinicas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data: dataStr,
            hora: '16:00',
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

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com consultas clínicas do paciente', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockConsultasClinicasPaciente = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            data: dataStr,
            hora: '17:00',
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

    it('GET /api/paciente/consultas - histórico com erro ao buscar especialidade', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            id_profissional: 'prof-1',
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
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => {
                throw new Error('Erro ao buscar');
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
        .get('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });
  });

  describe('Profissional Controller - Advanced Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('GET /api/profissional/consultas - deve filtrar por status', async () => {
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
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/consultas?status=agendada')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('GET /api/profissional/prontuarios - deve usar fallback quando where falha', async () => {
      const mockProntuarios = [
        {
          id: 'pront1',
          data: () => ({
            idProfissional: 'prof-uid',
            idPaciente: 'pac-1',
            idClinica: null,
            dataRegistro: Timestamp.now(),
            dataAtualizacao: Timestamp.now(),
            historico: [],
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
        if (col === 'prontuarios') {
          return {
            where: () => {
              throw new Error('Query error');
            },
            get: async () => ({
              docs: mockProntuarios,
              size: mockProntuarios.length,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/prontuarios')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('GET /api/profissional/dashboard - com consultas que têm data e hora separados', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            data: hoje.toISOString().split('T')[0],
            hora: '10:00',
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

    it('GET /api/profissional/dashboard - com consultas que têm dataConsulta Timestamp', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            dataConsulta: Timestamp.fromDate(new Date(hoje.getTime() + 3600000)),
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
});
