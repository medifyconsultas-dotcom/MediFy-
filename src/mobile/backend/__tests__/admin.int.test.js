import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Admin Controller - Integration Tests', () => {
  beforeEach(() => {
    // Mock do authenticate middleware
    auth.verifyIdToken = async () => ({ uid: 'admin-uid', email: 'admin@example.com' });
    
    // Mock padrão do requireProfile para retornar admin
    const defaultCollectionMock = (col) => {
      if (col === 'users') {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => ({ perfil: 'admin', nome: 'Admin' }) }),
          }),
        };
      }
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };
    
    db.collection = defaultCollectionMock;
  });

  describe('GET /api/admin/dashboard', () => {
    it('deve retornar dashboard com estatísticas', async () => {
      const mockCollections = {
        clinicas: { docs: [{ id: 'c1' }, { id: 'c2' }], size: 2 },
        profissionais: { docs: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], size: 3 },
        funcionarios: { docs: [{ id: 'f1' }], size: 1 },
        pacientes: { docs: [{ id: 'pac1' }, { id: 'pac2' }, { id: 'pac3' }, { id: 'pac4' }], size: 4 },
        consultas: { docs: [{ id: 'cons1' }, { id: 'cons2' }], size: 2 },
      };

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
        
        if (col === 'consultas') {
          const trintaDiasAtras = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
          return {
            where: () => ({
              get: async () => mockCollections.consultas,
            }),
          };
        }
        
        return {
          get: async () => mockCollections[col] || { docs: [], size: 0 },
        };
      };

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer admin-token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalClinicas');
      expect(res.body.data).toHaveProperty('totalProfissionais');
      expect(res.body.data).toHaveProperty('totalFuncionarios');
      expect(res.body.data).toHaveProperty('totalPacientes');
      expect(res.body.data).toHaveProperty('totalConsultas');
    });

    it('deve tratar erros ao buscar dashboard', async () => {
      db.collection = () => {
        throw new Error('Database error');
      };

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer admin-token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/clinicas', () => {
    it('deve listar clínicas com paginação', async () => {
      const mockClinicas = [
        { id: 'c1', data: () => ({ nome: 'Clínica 1', email: 'c1@example.com' }) },
        { id: 'c2', data: () => ({ nome: 'Clínica 2', email: 'c2@example.com' }) },
        { id: 'c3', data: () => ({ nome: 'Clínica 3', email: 'c3@example.com' }) },
      ];

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
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
        
        return { get: async () => ({ docs: [], size: 0 }) };
      };

      const res = await request(app)
        .get('/api/admin/clinicas?page=1&limit=10')
        .set('Authorization', 'Bearer admin-token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination).toBeDefined();
    });

    it('deve tratar erros ao listar clínicas', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
        throw new Error('Database error');
      };

      const res = await request(app)
        .get('/api/admin/clinicas')
        .set('Authorization', 'Bearer admin-token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/admin/clinicas', () => {
    it('deve criar nova clínica com sucesso', async () => {
      auth.getUserByEmail = async () => {
        throw new Error('not found');
      };
      auth.createUser = async () => ({
        uid: 'new-clinica-uid',
        email: 'clinica@example.com',
      });

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
        
        return {
          doc: () => ({
            set: async () => ({}),
          }),
        };
      };

      const res = await request(app)
        .post('/api/admin/clinicas')
        .set('Authorization', 'Bearer admin-token')
        .send({
          nome: 'Nova Clínica',
          email: 'clinica@example.com',
          telefone: '11999999999',
          endereco: 'Rua Teste, 123',
          cnpj: '12345678000190',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.nome).toBe('Nova Clínica');
    });

    it('deve retornar erro se email já existe', async () => {
      auth.getUserByEmail = async () => ({
        uid: 'existing-uid',
        email: 'clinica@example.com',
      });

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
      };

      const res = await request(app)
        .post('/api/admin/clinicas')
        .set('Authorization', 'Bearer admin-token')
        .send({
          nome: 'Nova Clínica',
          email: 'clinica@example.com',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('deve tratar erros ao criar clínica', async () => {
      auth.getUserByEmail = async () => {
        throw new Error('not found');
      };
      auth.createUser = async () => {
        throw new Error('Firebase error');
      };

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
      };

      const res = await request(app)
        .post('/api/admin/clinicas')
        .set('Authorization', 'Bearer admin-token')
        .send({
          nome: 'Nova Clínica',
          email: 'clinica@example.com',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/admin/clinicas/:id', () => {
    it('deve atualizar clínica existente', async () => {
      const mockClinica = {
        exists: true,
        id: 'clinica-uid',
        data: () => ({ nome: 'Clínica Original', email: 'c@example.com' }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'clinica-uid',
            data: () => ({ nome: 'Clínica Atualizada', email: 'c@example.com' }),
          }),
        },
      };

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
        
        if (col === 'clinicas' || col === 'users') {
          return {
            doc: () => ({
              get: async () => mockClinica,
              update: async () => ({}),
            }),
          };
        }
      };

      const res = await request(app)
        .put('/api/admin/clinicas/clinica-uid')
        .set('Authorization', 'Bearer admin-token')
        .send({
          nome: 'Clínica Atualizada',
          telefone: '11988888888',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
    });

    it('deve retornar 404 se clínica não existe', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
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
        .put('/api/admin/clinicas/inexistente')
        .set('Authorization', 'Bearer admin-token')
        .send({ nome: 'Clínica' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/profissionais', () => {
    it('deve listar profissionais com paginação', async () => {
      const mockProfissionais = [
        { id: 'p1', data: () => ({ nome: 'Profissional 1', email: 'p1@example.com' }) },
        { id: 'p2', data: () => ({ nome: 'Profissional 2', email: 'p2@example.com' }) },
      ];

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
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
        
        return { get: async () => ({ docs: [], size: 0 }) };
      };

      const res = await request(app)
        .get('/api/admin/profissionais')
        .set('Authorization', 'Bearer admin-token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/admin/profissionais', () => {
    it('deve criar novo profissional com sucesso', async () => {
      auth.getUserByEmail = async () => {
        throw new Error('not found');
      };
      auth.createUser = async () => ({
        uid: 'new-prof-uid',
        email: 'prof@example.com',
      });

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
        
        return {
          doc: () => ({
            set: async () => ({}),
          }),
        };
      };

      const res = await request(app)
        .post('/api/admin/profissionais')
        .set('Authorization', 'Bearer admin-token')
        .send({
          nome: 'Novo Profissional',
          email: 'prof@example.com',
          telefone: '11999999999',
          especialidade: 'Cardiologia',
          senha: 'senha123',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.nome).toBe('Novo Profissional');
    });

    it('deve retornar erro se email já existe', async () => {
      auth.getUserByEmail = async () => ({
        uid: 'existing-uid',
        email: 'prof@example.com',
      });

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
      };

      const res = await request(app)
        .post('/api/admin/profissionais')
        .set('Authorization', 'Bearer admin-token')
        .send({
          nome: 'Novo Profissional',
          email: 'prof@example.com',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/admin/profissionais/:id', () => {
    it('deve atualizar profissional existente', async () => {
      const mockProfissional = {
        exists: true,
        id: 'prof-uid',
        data: () => ({ nome: 'Profissional Original', email: 'p@example.com' }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'prof-uid',
            data: () => ({ nome: 'Profissional Atualizado', email: 'p@example.com' }),
          }),
        },
      };

      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
        
        return {
          doc: () => ({
            get: async () => mockProfissional,
            update: async () => ({}),
          }),
        };
      };

      const res = await request(app)
        .put('/api/admin/profissionais/prof-uid')
        .set('Authorization', 'Bearer admin-token')
        .send({
          nome: 'Profissional Atualizado',
          especialidade: 'Cardiologia',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('deve retornar 404 se profissional não existe', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
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
        .put('/api/admin/profissionais/inexistente')
        .set('Authorization', 'Bearer admin-token')
        .send({ nome: 'Profissional' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });
  });
});
