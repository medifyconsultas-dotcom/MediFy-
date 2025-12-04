import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Profissional Controller - Comprehensive Tests', () => {
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
    it('deve listar consultas com filtro de status', async () => {
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
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/profissional/consultas', () => {
    it('deve criar nova consulta', async () => {
      const mockPaciente = {
        id: 'pac-uid',
        data: () => ({
          nome: 'Paciente Teste',
          email: 'pac@example.com',
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
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                ...mockPaciente,
              }),
            }),
          };
        }
        if (col === 'consultas_autonomos') {
          return {
            where: () => ({
              get: async () => ({
                docs: [],
                empty: true,
              }),
            }),
            add: async (data) => ({
              id: 'new-consulta',
              ...data,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .post('/api/profissional/consultas')
        .set('Authorization', 'Bearer token')
        .send({
          idPaciente: 'pac-uid',
          dataConsulta: '2024-01-15',
          horaConsulta: '10:00',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/profissional/prontuarios', () => {
    it('deve criar novo prontuário', async () => {
      const mockPaciente = {
        id: 'pac-uid',
        data: () => ({
          nome: 'Paciente Teste',
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
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                ...mockPaciente,
              }),
            }),
          };
        }
        if (col === 'prontuarios') {
          return {
            where: () => ({
              get: async () => ({
                docs: [],
                empty: true,
              }),
            }),
            add: async (data) => ({
              id: 'new-prontuario',
              ...data,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .post('/api/profissional/prontuarios')
        .set('Authorization', 'Bearer token')
        .send({
          idPaciente: 'pac-uid',
          titulo: 'Prontuário Inicial',
          conteudo: 'Conteúdo do prontuário',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/profissional/prontuarios', () => {
    it('deve listar prontuários do profissional', async () => {
      const mockProntuarios = [
        {
          id: 'pront1',
          data: () => ({
            id_profissional: 'prof-uid',
            id_paciente: 'pac-uid',
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
            where: () => ({
              get: async () => ({
                docs: mockProntuarios,
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
        .get('/api/profissional/prontuarios')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/profissional/prontuarios/:idPaciente', () => {
    it('deve atualizar prontuário existente', async () => {
      const mockProntuario = {
        exists: true,
        id: 'pront-1',
        data: () => ({
          id_paciente: 'pac-uid',
          id_profissional: 'prof-uid',
          historico: [],
        }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'pront-1',
            data: () => ({
              id_paciente: 'pac-uid',
              titulo: 'Prontuário Atualizado',
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
        if (col === 'prontuarios') {
          return {
            where: () => ({
              get: async () => ({
                docs: [mockProntuario],
                empty: false,
              }),
            }),
            doc: () => ({
              get: async () => mockProntuario,
              update: async () => ({}),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .put('/api/profissional/prontuarios/pac-uid')
        .set('Authorization', 'Bearer token')
        .send({
          titulo: 'Prontuário Atualizado',
          conteudo: 'Novo conteúdo',
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
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/profissional/horarios-disponiveis', () => {
    it('deve retornar horários disponíveis do profissional', async () => {
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
                docs: [],
                empty: true,
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
        .get('/api/profissional/horarios-disponiveis')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/profissional/dashboard - casos de erro', () => {
    it('deve tratar erro ao buscar consultas', async () => {
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
              throw new Error('Database error');
            },
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/dashboard')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/profissional/prontuarios/:idPaciente/observacoes', () => {
    it('deve adicionar observação ao prontuário', async () => {
      const mockProntuario = {
        exists: true,
        id: 'pront-1',
        data: () => ({
          id_paciente: 'pac-uid',
          id_profissional: 'prof-uid',
          historico: [],
        }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'pront-1',
            data: () => ({
              id_paciente: 'pac-uid',
              historico: [{
                data: Timestamp.now(),
                profissional: 'Profissional',
                observacao: 'Nova observação',
              }],
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
        if (col === 'prontuarios') {
          return {
            where: () => ({
              get: async () => ({
                docs: [mockProntuario],
                empty: false,
              }),
            }),
            doc: () => ({
              get: async () => mockProntuario,
              update: async () => ({}),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .post('/api/profissional/prontuarios/pac-uid/observacoes')
        .set('Authorization', 'Bearer token')
        .send({
          observacao: 'Nova observação',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
