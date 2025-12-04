/**
 * Utilitários para formatação de respostas
 */

export const successResponse = (res, data, message = 'Sucesso', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, error, message = 'Erro', statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
  });
};

export const paginatedResponse = (res, data, page, limit, total, message = 'Sucesso') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

