// Configuração do Firebase para testes - usa mock se não houver variáveis de ambiente
import dotenv from 'dotenv';

dotenv.config();

// Sempre usar mock em modo de teste
if (process.env.NODE_ENV === 'test' || !process.env.FIREBASE_PROJECT_ID) {
  const { db, auth } = await import('./firebase.mock.js');
  export { db, auth };
  export default { db, auth };
} else {
  // Usar Firebase real
  const firebase = await import('./firebase.js');
  export const { db, auth } = firebase;
  export default firebase;
}
