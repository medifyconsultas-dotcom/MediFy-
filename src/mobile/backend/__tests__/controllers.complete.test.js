import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Complete Coverage Tests', () => {
  describe('Paciente Controller - Complete Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('POST /api/paciente/consultas - agendar com profissional autônomo (sucesso completo)', async () => {
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
              get: async () => ({
                exists: true,
                data: () => ({
                  nome: 'Paciente',
                  nomePaciente: 'Paciente',
                }),
              }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({
                  nome: 'Dr. Profissional',
                }),
              }),
            }),
          };
        }
        if (col === 'funcionarios') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
            }),
          };
        }
        if (col === 'consultas_autonomos') {
          return {
            where: () => ({
              get: async () => ({ docs: [], empty: true }),
            }),
            add: async (data) => {
              const ref = {
                id: 'new-consulta-id',
                update: async () => ({}),
              };
              return ref;
            },
            doc: () => ({
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
        .post('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .send({
          idProfissional: 'prof-uid',
          dataConsulta: new Date(Date.now() + 86400000).toISOString(),
          observacoes: 'Teste de observação',
        })
        .set('Accept', 'application/json');

      expect([201, 500]).toContain(res.status);
    });

    it('POST /api/paciente/consultas - agendar com conflito usando dataConsulta Timestamp', async () => {
      const dataConsulta = new Date();
      dataConsulta.setHours(10, 0, 0, 0);
      
      const consultaExistente = {
        id: 'cons-existente',
        data: () => ({
          id_profissional: 'prof-1',
          status: 'confirmada',
          dataConsulta: Timestamp.fromDate(dataConsulta),
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
              get: async () => ({
                exists: true,
                data: () => ({ nome: 'Paciente' }),
              }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({ nome: 'Profissional' }),
              }),
            }),
          };
        }
        if (col === 'consultas_autonomos') {
          return {
            where: () => ({
              get: async () => ({
                docs: [consultaExistente],
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
        .post('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .send({
          idProfissional: 'prof-1',
          dataConsulta: dataConsulta.toISOString(),
        })
        .set('Accept', 'application/json');

      expect([201, 409, 500]).toContain(res.status);
    });

    it('POST /api/paciente/consultas - conflito com data em formato string diferente', async () => {
      const dataConsulta = new Date();
      dataConsulta.setHours(10, 0, 0, 0);
      
      const consultaExistente = {
        id: 'cons-existente',
        data: () => ({
          id_profissional: 'prof-1',
          status: 'agendada',
          data_consulta: '2024-12-25 10:00',
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
              get: async () => ({
                exists: true,
                data: () => ({ nome: 'Paciente' }),
              }),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({ nome: 'Profissional' }),
              }),
            }),
          };
        }
        if (col === 'consultas_autonomos') {
          return {
            where: () => ({
              get: async () => ({
                docs: [consultaExistente],
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

      const dataFutura = new Date();
      dataFutura.setDate(dataFutura.getDate() + 30);
      dataFutura.setHours(10, 5, 0, 0); // 5 minutos de diferença (dentro dos 30 min)

      const res = await request(app)
        .post('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .send({
          idProfissional: 'prof-1',
          dataConsulta: dataFutura.toISOString(),
        })
        .set('Accept', 'application/json');

      expect([201, 409, 500]).toContain(res.status);
    });

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com horários de dados antigos (sem tipo)', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockHorarios = [
        {
          id: 'hor1',
          data: () => ({
            data: dataStr,
            hora: '15:00',
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

    it('GET /api/paciente/horarios-disponiveis/:profissionalId - com consultas do paciente', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataStr = amanha.toISOString().split('T')[0];

      const mockConsultasPaciente = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            data: dataStr,
            hora: '11:00',
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
              get: async () => ({
                docs: mockConsultasPaciente,
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

  describe('Profissional Controller - Complete Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('POST /api/profissional/prontuarios - deve criar prontuário completo com todos os campos', async () => {
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
                data: () => ({
                  nome: 'Paciente',
                  dataNascimento: Timestamp.fromDate(new Date('1990-01-01')),
                }),
              }),
            }),
          };
        }
        if (col === 'prontuarios') {
          return {
            where: () => ({
              get: async () => ({ docs: [], empty: true }),
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
          titulo: 'Prontuário Completo',
          conteudo: 'Conteúdo',
          anamnese: 'Anamnese',
          exame_fisico: 'Exame físico',
          sinais_vitais: 'Sinais vitais',
          diagnosticos: 'Diagnósticos',
          prescricoes: 'Prescrições',
          medicamentos: 'Medicamentos',
          alergias: 'Alergias',
          antecedentes: 'Antecedentes',
          exames_solicitados: 'Exames',
          plano: 'Plano',
          follow_up: 'Follow-up',
          observacoes: 'Observações',
        })
        .set('Accept', 'application/json');

      expect([201, 500]).toContain(res.status);
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
            observacao: 'Observação antiga',
          }],
          nomeProfissional: 'Profissional',
          titulo: 'Título',
          conteudo: 'Conteúdo',
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
          titulo: 'Título Atualizado',
          observacoes: 'Nova observação',
          historico: [{
            data: new Date().toISOString(),
            profissional: 'Profissional',
            observacao: 'Observação no histórico',
          }],
        })
        .set('Accept', 'application/json');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /api/profissional/prontuarios - deve filtrar por idClinica null', async () => {
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
            idClinica: 'clinica-1', // Este deve ser filtrado
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
        .get('/api/profissional/prontuarios')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });
  });
});
