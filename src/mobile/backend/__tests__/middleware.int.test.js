import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('Middleware authentication and requireProfile', () => {
  beforeEach(() => {
    // noop
  });

  it('GET /api/paciente/perfil - sem token retorna 401', async () => {
    const res = await request(app)
      .get('/api/paciente/perfil')
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/paciente/perfil - com token válido e perfil paciente retorna 200', async () => {
    // Mock do verifyIdToken para aceitar qualquer token e retornar uid
    auth.verifyIdToken = async (token) => ({ uid: 'uid-123', email: 'u@example.com', email_verified: true });

    // Mock do Firestore para users (requireProfile) e para pacientes (getPerfil)
    db.collection = (col) => {
      if (col === 'users') {
        return {
          doc: () => ({
            get: async () => ({ exists: true, id: 'uid-123', data: () => ({ perfil: 'paciente', nome: 'Teste' }) }),
          }),
        };
      }

      if (col === 'pacientes') {
        return {
          doc: () => ({
            get: async () => ({ exists: true, id: 'uid-123', data: () => ({ nome: 'Teste', perfil: 'paciente' }) }),
          }),
        };
      }

      // default stub
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .get('/api/paciente/perfil')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('nome', 'Teste');
    expect(res.body.data).toHaveProperty('id');
  });
});
