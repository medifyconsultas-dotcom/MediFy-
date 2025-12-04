/**
 * Middleware de tratamento de erros
 */
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Erro capturado pelo errorHandler:', err);
  console.error('Stack:', err.stack);

  // Se a resposta já foi enviada, não fazer nada
  if (res.headersSent) {
    return next(err);
  }

  // Erro de validação
  if (err.isJoi || err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Erro de validação',
      message: err.message,
      details: err.details || err.errors,
    });
  }

  // Erro do Firebase
  if (err.code && err.code.startsWith('auth/')) {
    return res.status(401).json({
      success: false,
      error: 'Erro de autenticação',
      message: err.message,
    });
  }

  // Erro padrão - usar formato compatível com o app mobile
  const statusCode = err.status || err.statusCode || 500;
  const errorMessage = err.message || 'Erro interno do servidor';
  
  return res.status(statusCode).json({
    success: false,
    error: 'Erro interno do servidor',
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.toString()
    }),
  });
};

/**
 * Middleware para rotas não encontradas
 */
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.path,
  });
};

