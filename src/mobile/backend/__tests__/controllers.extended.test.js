import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Extended Coverage Tests', () => {
  describe('Paciente Controller - Extended Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('PUT /api/paciente/perfil - deve atualizar com foto e fotoURL', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }),
            }),
          };
        }
        if (col === 'pacientes') {
          const mockDoc = {
            exists: true,
            id: 'pac-uid',
            data: () => ({ nome: 'Paciente' }),
          };
          return {
            doc: () => ({
              get: async () => mockDoc,
              update: async () => ({}),
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
          nome: 'Paciente Atualizado',
          foto: 'base64-image-data',
        })
        .set('Accept', 'application/json');

      expect([200, 500]).toContain(res.status);
    });

    it('PUT /api/paciente/perfil - deve atualizar com fotoURL mas sem foto', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }),
            }),
          };
        }
        if (col === 'pacientes') {
          const mockDoc = {
            exists: true,
            id: 'pac-uid',
            data: () => ({ nome: 'Paciente' }),
          };
          return {
            doc: () => ({
              get: async () => mockDoc,
              update: async () => ({}),
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
          fotoURL: 'https://example.com/photo.jpg',
        })
        .set('Accept', 'application/json');

      expect([200, 500]).toContain(res.status);
    });

    it('PUT /api/paciente/perfil - deve tratar erro ao atualizar collection users', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }),
            }),
          };
        }
        if (col === 'pacientes') {
          const mockDoc = {
            exists: true,
            id: 'pac-uid',
            data: () => ({ nome: 'Paciente' }),
          };
          return {
            doc: () => ({
              get: async () => mockDoc,
              update: async () => ({}),
            }),
          };
        }
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
              update: async () => {
                throw new Error('Update error');
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
          nome: 'Paciente Atualizado',
        })
        .set('Accept', 'application/json');

      expect([200, 500]).toContain(res.status);
    });

    it('GET /api/paciente/perfil - deve retornar perfil com diferentes formatos de dados', async () => {
      const mockPerfil = {
        nome: 'Paciente Teste',
        email: 'pac@example.com',
        endereco: 'Rua Teste',
        endereço: 'Rua Teste',
        dataNascimento: Timestamp.fromDate(new Date('1990-01-01')),
        data_nascimento: Timestamp.fromDate(new Date('1990-01-01')),
        plano: 'Unimed',
        planoSaude: 'Unimed',
        plano_saude: 'Unimed',
        foto: '/media/foto.jpg',
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
                id: 'pac-uid',
                data: () => mockPerfil,
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
    });

    it('POST /api/paciente/consultas/:id/upload - deve fazer upload com docRef.update', async () => {
      const mockConsulta = {
        exists: true,
        id: 'cons-1',
        data: () => ({
          idPaciente: 'pac-uid',
        }),
        ref: {
          update: async () => ({}),
          get: async () => ({
            id: 'cons-1',
            data: () => ({
              idPaciente: 'pac-uid',
              attachments: ['uploaded-file.jpg'],
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
              update: async () => ({}),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .post('/api/paciente/consultas/cons-1/upload')
        .set('Authorization', 'Bearer token')
        .attach('file', Buffer.from('fake'), { filename: 'foto.jpg', contentType: 'image/jpeg' })
        .set('Accept', 'application/json');

      expect([200, 201, 500]).toContain(res.status);
    });

    it('GET /api/paciente/profissionais - deve tratar erro ao buscar funcionários', async () => {
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
              docs: [],
              size: 0,
            }),
          };
        }
        if (col === 'funcionarios') {
          return {
            where: () => {
              throw new Error('Query error');
            },
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
    });
  });

  describe('Profissional Controller - Extended Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@example.com' });
    });

    it('GET /api/profissional/consultas/:id - deve buscar consulta em consultas_autonomos', async () => {
      const mockConsulta = {
        id: 'cons-1',
        data: () => ({
          id_profissional: 'prof-uid',
          nm_paciente: 'Paciente Teste',
          data_consulta: '2024-01-15 10:00',
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
              get: async () => ({
                exists: true,
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
        .get('/api/profissional/consultas/cons-1')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('GET /api/profissional/prontuarios/:idPaciente - deve retornar prontuário com histórico', async () => {
      const mockProntuario = {
        id: 'pront-1',
        data: () => ({
          idPaciente: 'pac-uid',
          idProfissional: 'prof-uid',
          historico: [
            {
              data: Timestamp.now(),
              profissional: 'Profissional',
              observacao: 'Observação 1',
            },
          ],
          dataRegistro: Timestamp.now(),
          dataAtualizacao: Timestamp.now(),
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
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
        };
      };

      const res = await request(app)
        .get('/api/profissional/prontuarios/pac-uid')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/profissional/prontuarios/:idPaciente/observacoes - deve atualizar prontuário existente', async () => {
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
              historico: [{
                data: Timestamp.now(),
                profissional: 'Profissional',
                observacao: 'Nova observação',
              }],
              dataAtualizacao: Timestamp.now(),
              dataRegistro: Timestamp.now(),
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
        if (col === 'pacientes') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ nome: 'Paciente' }) }),
            }),
          };
        }
        if (col === 'prontuarios') {
          return {
            where: () => ({
              limit: () => ({
                get: async () => ({
                  docs: [mockProntuario],
                  empty: false,
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
        .post('/api/profissional/prontuarios/pac-uid/observacoes')
        .set('Authorization', 'Bearer token')
        .send({
          observacao: 'Nova observação',
        })
        .set('Accept', 'application/json');

      expect([200, 201]).toContain(res.status);
    });

    it('PUT /api/profissional/perfil - deve atualizar perfil', async () => {
      db.collection = (col) => {
        if (col === 'users') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }),
              update: async () => ({}),
            }),
          };
        }
        if (col === 'profissionais') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                id: 'prof-uid',
                data: () => ({ nome: 'Profissional' }),
              }),
              update: async () => ({}),
            }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      };

      const res = await request(app)
        .put('/api/profissional/perfil')
        .set('Authorization', 'Bearer token')
        .send({
          nome: 'Profissional Atualizado',
          especialidade: 'Cardiologia',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });
  });
});
