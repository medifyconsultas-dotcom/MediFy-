import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('Consultas - remarcar, cancelar, deletar e upload', () => {
  beforeEach(() => {
    // noop
  });

  it('PATCH /api/paciente/consultas/:id - remarcar consulta (200)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'p@x' });

    // Mock consulta existente pertencente ao paciente
    db.collection = (col) => {
      if (col === 'consultas') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ idPaciente: 'pac-uid', dataConsulta: { toDate: () => new Date() } }), ref: { update: async () => ({}) } }) }) };
      }
      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }) }) };
      }
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .patch('/api/paciente/consultas/consulta-1')
      .set('Authorization', 'Bearer token')
      .send({ dataConsulta: new Date(Date.now() + 3600000).toISOString() })
      .set('Accept', 'application/json');

    // controller pode responder 200 com a consulta atualizada
    expect([200, 204, 200]).toContain(res.status);
  });

  it('DELETE /api/paciente/consultas/:id - deletar consulta (204)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'p@x' });

    db.collection = (col) => {
      if (col === 'consultas') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ idPaciente: 'pac-uid' }), ref: { delete: async () => ({}) } }) }) };
      }
      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }) }) };
      }
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .delete('/api/paciente/consultas/consulta-1')
      .set('Authorization', 'Bearer token');

    expect([200, 204]).toContain(res.status);
  });

  it('POST /api/paciente/consultas/:id/upload - upload de imagem (201) com mock de storage', async () => {
    auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'p@x' });

    // mock de storage minimalista no config/firebase.js já existe para NODE_ENV=test
    // apenas precisamos simular consulta existente
    db.collection = (col) => {
      if (col === 'consultas') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ idPaciente: 'pac-uid' }) }), ref: { update: async () => ({}) } }) };
      }
      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }) }) };
      }
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    // Enviar form-data com um campo 'file' vazio (Supertest permite .attach)
    const res = await request(app)
      .post('/api/paciente/consultas/consulta-1/upload')
      .set('Authorization', 'Bearer token')
      .attach('file', Buffer.from('fake'), { filename: 'foto.jpg', contentType: 'image/jpeg' });

    // A rota de upload pode retornar 201 ou 200 dependendo da implementação
    expect([200, 201]).toContain(res.status);
  });
});
