// Teste simples para verificar se o ambiente de testes está funcionando
describe('Testes Básicos', () => {
  it('deve executar um teste simples', () => {
    expect(1 + 1).toBe(2);
  });

  it('deve verificar se o ambiente de teste está configurado', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

