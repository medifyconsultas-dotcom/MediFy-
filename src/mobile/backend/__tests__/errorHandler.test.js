import request from 'supertest';
import express from 'express';
import { errorHandler, notFound } from '../src/middleware/errorHandler.js';

describe('Error Handler Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('errorHandler', () => {
    it('deve tratar erro de validação Joi', () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Validation error');
        error.isJoi = true;
        error.details = [{ message: 'Email inválido' }];
        next(error);
      });
      app.use(errorHandler);

      return request(app)
        .get('/test')
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Erro de validação');
        });
    });

    it('deve tratar erro de validação ValidationError', () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Validation error');
        error.name = 'ValidationError';
        error.errors = { email: 'Email inválido' };
        next(error);
      });
      app.use(errorHandler);

      return request(app)
        .get('/test')
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Erro de validação');
        });
    });

    it('deve tratar erro de autenticação Firebase', () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Invalid token');
        error.code = 'auth/invalid-token';
        next(error);
      });
      app.use(errorHandler);

      return request(app)
        .get('/test')
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Erro de autenticação');
        });
    });

    it('deve tratar erro genérico com status code', () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Not found');
        error.status = 404;
        next(error);
      });
      app.use(errorHandler);

      return request(app)
        .get('/test')
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Erro interno do servidor');
        });
    });

    it('deve tratar erro genérico sem status code (500)', () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Internal error');
        next(error);
      });
      app.use(errorHandler);

      return request(app)
        .get('/test')
        .expect(500)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Erro interno do servidor');
        });
    });

    it('deve incluir stack trace em modo development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/test', (req, res, next) => {
        const error = new Error('Test error');
        next(error);
      });
      app.use(errorHandler);

      return request(app)
        .get('/test')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('stack');
          expect(res.body).toHaveProperty('originalError');
        })
        .finally(() => {
          process.env.NODE_ENV = originalEnv;
        });
    });

    it('não deve enviar resposta se headers já foram enviados', () => {
      app.get('/test', (req, res) => {
        res.status(200).json({ sent: true });
        const error = new Error('Late error');
        errorHandler(error, req, res, () => {
          // next callback
        });
      });
      app.use(errorHandler);

      return request(app)
        .get('/test')
        .expect(200)
        .expect((res) => {
          expect(res.body.sent).toBe(true);
        });
    });
  });

  describe('notFound', () => {
    it('deve retornar 404 para rota não encontrada', () => {
      app.get('/exists', (req, res) => res.json({ found: true }));
      app.use(notFound);

      return request(app)
        .get('/not-found')
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Rota não encontrada');
          expect(res.body.path).toBe('/not-found');
        });
    });
  });
});
