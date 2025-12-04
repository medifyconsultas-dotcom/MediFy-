import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Paciente Controller - Additional Functions', () => {
  beforeEach(() => {
    auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });

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
            get: async () => ({ exists: true, data: () => ({ nome: 'Paciente', perfil: 'paciente' }) }),
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

  describe('GET /api/paciente/historico', () => {
    it('deve retornar histórico de consultas paginado', async () => {
      const mockConsultas = [
        {
          id: 'cons1',
          data: () => ({
            id_paciente: 'pac-uid',
            nm_profissional: 'Dr. Teste',
            data_consulta: '2024-01-15 10:00',
            status: 'realizada',
          }),
        },
        {
          id: 'cons2',
          data: () => ({
            id_paciente: 'pac-uid',
            nm_profissional: 'Dr. Teste 2',
            data_consulta: '2024-01-10 14:00',
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
        if (col === 'consultas_autonomos' || col === 'consultas_clinicas') {
          return {
            where: () => ({
              get: async () => ({
                docs: col === 'consultas_autonomos' ? mockConsultas : [],
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
        .get('/api/paciente/historico?page=1&limit=10')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/paciente/consultas/:id', () => {
    it('deve retornar detalhes de uma consulta', async () => {
      const mockConsulta = {
        id: 'cons-1',
        data: () => ({
          id_paciente: 'pac-uid',
          nm_profissional: 'Dr. Teste',
          data_consulta: '2024-01-15 10:00',
          status: 'agendada',
          obs: 'Observação teste',
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
        if (col === 'consultas_autonomos' || col === 'consultas_clinicas') {
          return {
            doc: () => ({
              get: async () => ({
                exists: col === 'consultas_autonomos',
                ...mockConsulta,
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/consultas/cons-1')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
    });

    it('deve retornar 404 se consulta não existe', async () => {
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
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/consultas/inexistente')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/paciente/perfil', () => {
    it('deve retornar perfil do paciente', async () => {
      const mockPerfil = {
        nome: 'Paciente Teste',
        email: 'pac@example.com',
        telefone: '11999999999',
        endereco: 'Rua Teste, 123',
        dataNascimento: null,
        planoSaude: null,
        foto: 'Não',
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
                data: () => ({ ...mockPerfil, perfil: 'paciente' }),
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/perfil')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('nome');
    });
  });

  describe('PUT /api/paciente/perfil', () => {
    it('deve atualizar perfil do paciente', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }),
              update: async () => ({}),
            }),
          };
        }
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Paciente' }) }),
              update: async () => ({}),
            }),
          };
        }
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
            update: async () => ({}),
          }),
        };
      };

      const res = await request(app)
        .put('/api/paciente/perfil')
        .set('Authorization', 'Bearer token')
        .send({
          nome: 'Paciente Atualizado',
          telefone: '11988888888',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/paciente/profissionais', () => {
    it('deve listar profissionais disponíveis', async () => {
      const mockProfissionais = [
        {
          id: 'prof1',
          data: () => ({
            nome: 'Dr. Teste',
            especialidade: 'Cardiologia',
            idClinica: null,
          }),
        },
        {
          id: 'prof2',
          data: () => ({
            nome: 'Dr. Teste 2',
            especialidade: 'Ortopedia',
            idClinica: null,
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
            get: async () => ({
              docs: mockProfissionais,
              size: mockProfissionais.length,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          get: async () => ({ docs: [], size: 0 }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/profissionais')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/paciente/clinicas', () => {
    it('deve listar clínicas disponíveis', async () => {
      const mockClinicas = [
        {
          id: 'clin1',
          data: () => ({
            nome: 'Clínica Teste',
            endereco: 'Rua Teste, 123',
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
        if (col === 'clinicas') {
          return {
            get: async () => ({
              docs: mockClinicas,
              size: mockClinicas.length,
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          get: async () => ({ docs: [], size: 0 }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/clinicas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('PATCH /api/paciente/consultas/:id', () => {
    it('deve atualizar uma consulta (remarcar)', async () => {
      const mockConsulta = {
        exists: true,
        id: 'cons-1',
        data: () => ({
          id_paciente: 'pac-uid',
          status: 'agendada',
        }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'cons-1',
            data: () => ({
              id_paciente: 'pac-uid',
              status: 'agendada',
              data_consulta: '2024-02-15 10:00',
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
        if (col === 'consultas_autonomos') {
          return {
            where: () => ({
              get: async () => ({ docs: [], empty: true }),
            }),
            doc: () => ({
              get: async () => mockConsulta,
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
        .patch('/api/paciente/consultas/cons-1')
        .set('Authorization', 'Bearer token')
        .send({
          dataConsulta: new Date(Date.now() + 86400000).toISOString(),
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
