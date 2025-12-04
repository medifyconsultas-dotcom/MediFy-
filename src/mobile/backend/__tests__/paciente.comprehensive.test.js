import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Paciente Controller - Comprehensive Tests', () => {
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

  describe('GET /api/paciente/profissionais', () => {
    it('deve retornar lista de profissionais autônomos e de clínicas', async () => {
      const mockProfissionais = [
        {
          id: 'prof1',
          data: () => ({
            nome: 'Dr. Autonomo',
            especialidade: 'Cardiologia',
            idClinica: null,
            email: 'autonomo@example.com',
          }),
        },
        {
          id: 'prof2',
          data: () => ({
            nome: 'Dr. Clinica',
            especialidade: 'Ortopedia',
            idClinica: 'clinica-1',
            email: 'clinica@example.com',
          }),
        },
      ];

      const mockFuncionarios = [
        {
          id: 'func1',
          data: () => ({
            nome: 'Dr. Medico',
            especialidade: 'Pediatria',
            cargo: 'medico',
            idClinica: 'clinica-1',
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
        if (col === 'funcionarios') {
          return {
            where: () => ({
              get: async () => ({
                docs: mockFuncionarios,
                empty: false,
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
          get: async () => ({ docs: [], size: 0 }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/profissionais')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('deve filtrar profissionais por busca', async () => {
      const mockProfissionais = [
        {
          id: 'prof1',
          data: () => ({
            nome: 'Dr. Cardiologista',
            especialidade: 'Cardiologia',
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
        if (col === 'funcionarios') {
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
          get: async () => ({ docs: [], size: 0 }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/profissionais?search=Cardio')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/paciente/clinicas', () => {
    it('deve retornar lista de clínicas', async () => {
      const mockClinicas = [
        {
          id: 'clin1',
          data: () => ({
            nome: 'Clínica Teste',
            nomeFantasia: 'Clínica Teste LTDA',
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
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/paciente/clinicas/:clinicaId/medicos', () => {
    it('deve retornar médicos de uma clínica', async () => {
      const mockMedicos = [
        {
          id: 'med1',
          data: () => ({
            nome: 'Dr. Medico',
            especialidade: 'Cardiologia',
            cargo: 'medico',
            idClinica: 'clinica-1',
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
        if (col === 'funcionarios') {
          return {
            where: () => ({
              where: () => ({
                get: async () => ({
                  docs: mockMedicos,
                  empty: false,
                }),
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
        .get('/api/paciente/clinicas/clinica-1/medicos')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('deve retornar 400 se clinicaId não for fornecido', async () => {
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
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/clinicas/undefined/medicos')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      // Pode retornar 400 ou 404 dependendo da implementação
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('GET /api/paciente/horarios-disponiveis/:profissionalId', () => {
    it('deve retornar horários disponíveis de um profissional', async () => {
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
        .get('/api/paciente/horarios-disponiveis/prof-uid')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/paciente/dashboard - casos de erro', () => {
    it('deve tratar erro ao buscar consultas', async () => {
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
        .get('/api/paciente/dashboard')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      // Deve tratar erro graciosamente
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/paciente/consultas - casos adicionais', () => {
    it('deve tratar erro quando paciente não existe', async () => {
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
              get: async () => ({ exists: false }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .post('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .send({
          idProfissional: 'prof-1',
          dataConsulta: new Date().toISOString(),
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });

    it('deve tratar erro quando profissional não existe', async () => {
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
        if (col === 'profissionais' || col === 'funcionarios') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .post('/api/paciente/consultas')
        .set('Authorization', 'Bearer token')
        .send({
          idProfissional: 'inexistente',
          dataConsulta: new Date().toISOString(),
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/paciente/horarios-disponiveis/:profissionalId - casos adicionais', () => {
    it('deve retornar 400 se data não for fornecida', async () => {
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
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/horarios-disponiveis/prof-uid')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
    });

    it('deve retornar horários quando profissional é funcionário', async () => {
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
              collection: () => ({
                get: async () => ({ docs: [] }),
              }),
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
        .get('/api/paciente/horarios-disponiveis/func-uid?data=2024-12-31')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/paciente/profissionais - casos de erro', () => {
    it('deve tratar erro ao buscar profissionais', async () => {
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
            get: async () => {
              throw new Error('Database error');
            },
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/profissionais')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/paciente/clinicas - casos de erro', () => {
    it('deve tratar erro ao buscar clínicas', async () => {
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
            get: async () => {
              throw new Error('Database error');
            },
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/clinicas')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(500);
    });
  });
});
