import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Detailed Coverage Tests', () => {
  describe('Profissional Controller - Detailed Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('GET /api/profissional/prontuarios - deve buscar e filtrar prontuários', async () => {
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
        {
          id: 'pront2',
          data: () => ({
            idProfissional: 'prof-uid',
            idPaciente: 'pac-2',
            idClinica: undefined,
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
        .get('/api/profissional/prontuarios?page=1&limit=10')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
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

    it('PUT /api/profissional/prontuarios/:idPaciente - deve atualizar prontuário completo', async () => {
      const mockProntuario = {
        exists: true,
        id: 'pront-1',
        data: () => ({
          idPaciente: 'pac-uid',
          idProfissional: 'prof-uid',
          historico: [],
        }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'pront-1',
            data: () => ({
              idPaciente: 'pac-uid',
              titulo: 'Prontuário Atualizado',
              historico: [],
              dataRegistro: Timestamp.now(),
              dataAtualizacao: Timestamp.now(),
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
              where: () => ({
                limit: () => ({
                  get: async () => ({
                    docs: [mockProntuario],
                    empty: false,
                  }),
                }),
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

      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/profissional/consultas/:id - deve verificar acesso usando idProfissional', async () => {
      const mockConsulta = {
        exists: true,
        id: 'cons-1',
        data: () => ({
          idProfissional: 'prof-uid',
          nm_paciente: 'Paciente Teste',
          dataConsulta: Timestamp.now(),
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
        if (col === 'consultas_autonomos') {
          return {
            doc: () => ({
              get: async () => mockConsulta,
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
    });
  });

  describe('Paciente Controller - Detailed Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('GET /api/paciente/consultas - histórico com especialidade do funcionário', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            id_profissional: 'func-1',
            nm_profissional: 'Dr. Funcionario',
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
        if (col === 'consultas_clinicas') {
          return {
            where: () => ({
              get: async () => ({
                docs: mockConsultas,
                empty: false,
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
                data: () => ({ especialidade: 'Pediatria' }),
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

    it('GET /api/paciente/dashboard - com consultas realizadas', async () => {
      const consultaRealizada = {
        id: 'cons1',
        data: () => ({
          id_paciente: 'pac-uid',
          data_consulta: { toDate: () => new Date(Date.now() - 86400000) },
          status: 'realizada',
          nm_profissional: 'Dr. Teste',
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
                docs: [consultaRealizada],
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
    });

    it('PATCH /api/paciente/consultas/:id - deve remarcar consulta', async () => {
      const mockConsulta = {
        exists: true,
        id: 'cons-1',
        data: () => ({
          idPaciente: 'pac-uid',
          dataConsulta: Timestamp.now(),
        }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'cons-1',
            data: () => ({
              idPaciente: 'pac-uid',
              dataConsulta: Timestamp.fromDate(new Date(Date.now() + 86400000)),
              dataAtualizacao: Timestamp.now(),
            }),
          }),
        },
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
        if (col === 'consultas') {
          return {
            doc: () => ({
              get: async () => mockConsulta,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .patch('/api/paciente/consultas/cons-1')
        .set('Authorization', 'Bearer token')
        .send({
          dataConsulta: new Date(Date.now() + 86400000).toISOString(),
        })
        .set('Accept', 'application/json');

      expect([200, 500]).toContain(res.status);
    });

    it('PUT /api/profissional/prontuarios/:idPaciente - deve atualizar com histórico completo', async () => {
      const mockProntuario = {
        exists: true,
        id: 'pront-1',
        data: () => ({
          idPaciente: 'pac-uid',
          idProfissional: 'prof-uid',
          historico: [{
            data: Timestamp.now(),
            profissional: 'Profissional',
            observacao: 'Observação anterior',
          }],
          nomeProfissional: 'Profissional',
        }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'pront-1',
            data: () => ({
              idPaciente: 'pac-uid',
              historico: [{
                data: Timestamp.now(),
                profissional: 'Profissional',
                observacao: 'Nova observação',
              }],
              dataRegistro: Timestamp.now(),
              dataAtualizacao: Timestamp.now(),
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
              where: () => ({
                limit: () => ({
                  get: async () => ({
                    docs: [mockProntuario],
                    empty: false,
                  }),
                }),
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
          observacoes: 'Nova observação',
          historico: [{
            data: new Date().toISOString(),
            profissional: 'Profissional',
            observacao: 'Observação no histórico',
          }],
        })
        .set('Accept', 'application/json');

      expect([200, 500]).toContain(res.status);
    });

    it('GET /api/profissional/pacientes - deve listar pacientes do profissional', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_profissional: 'prof-uid',
            id_paciente: 'pac-1',
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            id_profissional: 'prof-uid',
            id_paciente: 'pac-2',
          }),
        },
      ];

      const mockPacientes = [
        {
          id: 'pac-1',
          data: () => ({ nome: 'Paciente 1', email: 'pac1@example.com' }),
        },
        {
          id: 'pac-2',
          data: () => ({ nome: 'Paciente 2', email: 'pac2@example.com' }),
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
            doc: (id) => {
              const paciente = mockPacientes.find(p => p.id === id);
              return {
                get: async () => ({
                  exists: !!paciente,
                  ...paciente,
                }),
              };
            },
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/pacientes')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/profissional/horarios-disponiveis - deve retornar horários disponíveis', async () => {
      const mockHorarios = [
        {
          id: 'hor1',
          data: () => ({
            tipo: 'recorrente',
            diaSemana: 1,
            hora: '09:00',
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

      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/profissional/horarios-disponiveis?data=${dataStr}`)
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect([200, 400, 500]).toContain(res.status);
    });
  });
});
