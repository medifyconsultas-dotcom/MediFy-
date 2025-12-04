import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('Controllers - Error Cases', () => {
  beforeEach(() => {
    auth.verifyIdToken = async () => ({ uid: 'user-uid', email: 'user@example.com' });
  });

  describe('Paciente Controller - Error Cases', () => {
    it('deve tratar erro genérico no dashboard', async () => {
      db.collection = () => {
        throw new Error('Unexpected error');
      };

      const res = await request(app)
        .get('/api/paciente/dashboard')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });

    it('deve tratar erro ao agendar consulta', async () => {
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
        throw new Error('Database error');
      };

      const res = await request(app)
        .post('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .send({
          idProfissional: 'prof-1',
          dataConsulta: new Date().toISOString(),
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });

    it('deve tratar erro ao buscar histórico', async () => {
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
        .get('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });

    it('deve tratar erro ao buscar detalhes da consulta', async () => {
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
        if (col === 'consultas_autonomos' || col === 'consultas_clinicas' || col === 'consultas') {
          return {
            doc: () => {
              throw new Error('Database error');
            },
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

      expect(res.status).toBe(500);
    });

    it('deve tratar erro ao atualizar perfil', async () => {
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
              get: async () => {
                throw new Error('Database error');
              },
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .put('/api/paciente/perfil')
        .set('Authorization', 'Bearer token')
        .send({
          nome: 'Novo Nome',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });
  });

  describe('Profissional Controller - Error Cases', () => {
    beforeEach(() => {
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
    });

    it('deve tratar erro genérico no dashboard', async () => {
      db.collection = () => {
        throw new Error('Unexpected error');
      };

      const res = await request(app)
        .get('/api/profissional/dashboard')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });

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
        .get('/api/profissional/consultas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });

    it('deve tratar erro ao buscar prontuário', async () => {
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
              throw new Error('Database error');
            },
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/prontuarios/pac-uid')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });
  });

  describe('Admin Controller - Error Cases', () => {
    beforeEach(() => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'admin' }) }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };
    });

    it('deve tratar erro ao criar clínica com erro no Firestore', async () => {
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
        if (col === 'clinicas' || col === 'users') {
          return {
            doc: () => ({
              set: async () => {
                throw new Error('Firestore error');
              },
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
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
});
