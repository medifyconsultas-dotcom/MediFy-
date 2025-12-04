// Mock do Firebase para testes
export const db = {
  collection: (name) => ({
    doc: (id) => ({
      get: async () => ({
        exists: false,
        data: () => null,
        id,
      }),
      set: async (data) => ({ id, ...data }),
      update: async (data) => ({ id, ...data }),
      ref: {
        update: async (data) => ({ id, ...data }),
      },
    }),
    add: async (data) => ({ id: 'mock-id', ...data }),
    where: (field, op, value) => ({
      where: (field2, op2, value2) => ({
        orderBy: (field3, direction) => ({
          limit: (num) => ({
            get: async () => ({
              docs: [],
              size: 0,
              empty: true,
            }),
          }),
          get: async () => ({
            docs: [],
            size: 0,
            empty: true,
          }),
        }),
        limit: (num) => ({
          get: async () => ({
            docs: [],
            size: 0,
            empty: true,
          }),
        }),
        get: async () => ({
          docs: [],
          size: 0,
          empty: true,
        }),
      }),
      orderBy: (field2, direction) => ({
        limit: (num) => ({
          get: async () => ({
            docs: [],
            size: 0,
            empty: true,
          }),
        }),
        get: async () => ({
          docs: [],
          size: 0,
          empty: true,
        }),
      }),
      limit: (num) => ({
        get: async () => ({
          docs: [],
          size: 0,
          empty: true,
        }),
      }),
      get: async () => ({
        docs: [],
        size: 0,
        empty: true,
      }),
    }),
    get: async () => ({
      docs: [],
      size: 0,
      empty: true,
    }),
  }),
};

export const auth = {
  getUserByEmail: async (email) => {
    if (email === 'naoexiste@example.com') {
      throw new Error('User not found');
    }
    return {
      uid: 'mock-uid',
      email,
      emailVerified: true,
    };
  },
  createUser: async (userData) => ({
    uid: 'mock-uid-' + Date.now(),
    email: userData.email,
    emailVerified: false,
  }),
  verifyIdToken: async (token) => ({
    uid: 'mock-uid',
    email: 'test@example.com',
    email_verified: true,
  }),
  createCustomToken: async (uid) => 'mock-custom-token-' + uid,
};

export default { db, auth };

