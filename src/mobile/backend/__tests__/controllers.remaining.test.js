import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

describe('Controllers - Remaining Coverage Tests', () => {
  describe('Paciente Controller - Remaining Cases', () => {
    beforeEach(() => {
      auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'pac@example.com' });
    });

    it('DELETE /api/paciente/consultas/:id - deve cancelar consulta em consultas_clinicas', async () => {
      const mockConsulta = {
        exists: true,
        id: 'cons-1',
        data: () => ({
          id_paciente: 'pac-uid',
          status: 'agendada',
        }),
        ref: {
          update: async () => ({}),
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
            doc: () => ({
              get: async () => ({ exists: false }),
            }),
          };
        }
        if (col === 'consultas_clinicas') {
          return {
            doc: () => ({
              get: async () => mockConsulta,
              update: async () => ({}),
            }),
          };
        }
        if (col === 'consultas') {
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
        .delete('/api/paciente/consultas/cons-1')
        .set('Authorization', 'Bearer token')
        .send({ motivo: 'Motivo de cancelamento' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('DELETE /api/paciente/consultas/:id - deve cancelar consulta na collection consultas', async () => {
      const mockConsulta = {
        exists: true,
        id: 'cons-1',
        data: () => ({
          idPaciente: 'pac-uid',
          status: 'agendada',
        }),
        ref: {
          update: async () => ({}),
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
        if (col === 'consultas_autonomos' || col === 'consultas_clinicas') {
          return {
            doc: () => ({
              get: async () => ({ exists: false }),
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
        .delete('/api/paciente/consultas/cons-1')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('GET /api/paciente/profissionais - deve buscar profissionais com busca', async () => {
      const mockProfissionais = [
        {
          id: 'prof1',
          data: () => ({
            nome: 'Dr. Teste',
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
              get: async () => ({ docs: [], empty: true }),
            }),
            get: async () => ({ docs: [], size: 0 }),
          };
        }
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          where: () => ({ get: async () => ({ docs: [], empty: true }) }),
          get: async () => ({ docs: [], size: 0 }),
        };
      };

      const res = await request(app)
        .get('/api/paciente/profissionais?search=Cardiologia')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
    });

    it('GET /api/paciente/profissionais - deve buscar funcionários quando query where falha', async () => {
      const mockFuncionarios = [
        {
          id: 'func1',
          data: () => ({
            nome: 'Dr. Funcionario',
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
            get: async () => ({ docs: [], size: 0 }),
          };
        }
        if (col === 'funcionarios') {
          return {
            where: () => {
              throw new Error('Query error');
            },
            get: async () => ({
              docs: mockFuncionarios,
              size: mockFuncionarios.length,
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
    });

    it('GET /api/paciente/clinicas - deve listar clínicas', async () => {
      const mockClinicas = [
        {
          id: 'clinica1',
          data: () => ({
            nomeFantasia: 'Clínica Teste',
            endereco: 'Rua Teste',
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
    });

    it('GET /api/paciente/clinicas/:clinicaId/medicos - deve listar médicos da clínica', async () => {
      const mockMedicos = [
        {
          id: 'medico1',
          data: () => ({
            nome: 'Dr. Médico',
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
    });
  });
});
