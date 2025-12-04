// Lista de especialidades médicas padronizadas
export const ESPECIALIDADES_PADRONIZADAS = [
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Ortopedia',
  'Otorrinolaringologia',
  'Pediatria',
  'Psiquiatria',
  'Urologia',
  'Clínica Geral',
  'Medicina do Trabalho',
  'Medicina Esportiva',
  'Medicina de Família',
  'Anestesiologia',
  'Cirurgia Geral',
  'Cirurgia Plástica',
  'Oncologia',
  'Radiologia',
  'Medicina Intensiva',
  'Medicina Preventiva',
  'Reumatologia',
  'Alergologia',
  'Hematologia',
  'Nefrologia',
  'Pneumologia',
  'Infectologia',
  'Geriatria',
  'Mastologia',
  'Proctologia',
  'Angiologia',
  'Cardiologia Pediátrica',
  'Cirurgia Cardiovascular',
  'Cirurgia de Cabeça e Pescoço',
  'Cirurgia do Aparelho Digestivo',
  'Cirurgia Pediátrica',
  'Cirurgia Torácica',
  'Cirurgia Vascular',
  'Coloproctologia',
  'Dermatologia Pediátrica',
  'Endocrinologia Pediátrica',
  'Fisiatria',
  'Fonoaudiologia',
  'Genética Médica',
  'Hepatologia',
  'Imunologia',
  'Medicina de Emergência',
  'Medicina Legal',
  'Medicina Nuclear',
  'Neurocirurgia',
  'Nutrologia',
  'Oftalmologia Pediátrica',
  'Patologia',
  'Psiquiatria Infantil',
  'Radioterapia',
  'Reprodução Humana',
  'Terapia Intensiva',
  'Traumatologia',
  'Ultrassonografia',
] as const

// Mapeamento de variações comuns para especialidades padronizadas
const MAPEAMENTO_VARIACOES: Record<string, string> = {
  // Cardiologia
  'cardiologista': 'Cardiologia',
  'cardio': 'Cardiologia',
  'cardiol': 'Cardiologia',
  
  // Dermatologia
  'dermatologista': 'Dermatologia',
  'dermatol': 'Dermatologia',
  'pele': 'Dermatologia',
  
  // Endocrinologia
  'endocrinologista': 'Endocrinologia',
  'endocrino': 'Endocrinologia',
  'diabetes': 'Endocrinologia',
  
  // Gastroenterologia
  'gastroenterologista': 'Gastroenterologia',
  'gastro': 'Gastroenterologia',
  'gastrologia': 'Gastroenterologia',
  
  // Ginecologia
  'ginecologista': 'Ginecologia',
  'gineco': 'Ginecologia',
  'ginec': 'Ginecologia',
  'obstetrícia': 'Ginecologia',
  'obstetria': 'Ginecologia',
  
  // Neurologia
  'neurologista': 'Neurologia',
  'neuro': 'Neurologia',
  'neurol': 'Neurologia',
  
  // Oftalmologia
  'oftalmologista': 'Oftalmologia',
  'oftalmo': 'Oftalmologia',
  'olhos': 'Oftalmologia',
  
  // Ortopedia
  'ortopedista': 'Ortopedia',
  'ortopedia': 'Ortopedia',
  'osso': 'Ortopedia',
  'traumatologia': 'Traumatologia',
  
  // Otorrinolaringologia
  'otorrinolaringologista': 'Otorrinolaringologia',
  'otorrino': 'Otorrinolaringologia',
  'ouvido': 'Otorrinolaringologia',
  'nariz': 'Otorrinolaringologia',
  'garganta': 'Otorrinolaringologia',
  
  // Pediatria
  'pediatra': 'Pediatria',
  'pediatria': 'Pediatria',
  'pediat': 'Pediatria',
  'criança': 'Pediatria',
  
  // Psiquiatria
  'psiquiatra': 'Psiquiatria',
  'psiquiatria': 'Psiquiatria',
  'psiqui': 'Psiquiatria',
  'mental': 'Psiquiatria',
  
  // Urologia
  'urologista': 'Urologia',
  'urologia': 'Urologia',
  'urol': 'Urologia',
  
  // Clínica Geral
  'clinica geral': 'Clínica Geral',
  'clinico geral': 'Clínica Geral',
  'medicina geral': 'Clínica Geral',
  'geral': 'Clínica Geral',
  'clinico': 'Clínica Geral',
  
  // Cirurgia
  'cirurgia': 'Cirurgia Geral',
  'cirurgião': 'Cirurgia Geral',
  'cirurgiao': 'Cirurgia Geral',
  
  // Oncologia
  'oncologista': 'Oncologia',
  'oncologia': 'Oncologia',
  'cancer': 'Oncologia',
  'câncer': 'Oncologia',
  
  // Geriatria
  'geriatra': 'Geriatria',
  'geriatria': 'Geriatria',
  'idoso': 'Geriatria',
  
  // Reumatologia
  'reumatologista': 'Reumatologia',
  'reumatologia': 'Reumatologia',
  'reumato': 'Reumatologia',
  
  // Pneumologia
  'pneumologista': 'Pneumologia',
  'pneumologia': 'Pneumologia',
  'pulmao': 'Pneumologia',
  'pulmão': 'Pneumologia',
  
  // Infectologia
  'infectologista': 'Infectologia',
  'infectologia': 'Infectologia',
  'infecto': 'Infectologia',
  
  // Nefrologia
  'nefrologista': 'Nefrologia',
  'nefrologia': 'Nefrologia',
  'nefro': 'Nefrologia',
  'rim': 'Nefrologia',
  
  // Alergologia
  'alergologista': 'Alergologia',
  'alergologia': 'Alergologia',
  'alergia': 'Alergologia',
  
  // Hematologia
  'hematologista': 'Hematologia',
  'hematologia': 'Hematologia',
  'sangue': 'Hematologia',
}

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Calcula a similaridade entre duas strings usando Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  const len1 = str1.length
  const len2 = str2.length

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        )
      }
    }
  }

  return matrix[len1][len2]
}

/**
 * Encontra a especialidade mais similar
 */
function findBestMatch(input: string): string | null {
  const normalizedInput = normalizeString(input)
  
  // Primeiro, verifica se há um mapeamento direto
  if (MAPEAMENTO_VARIACOES[normalizedInput]) {
    return MAPEAMENTO_VARIACOES[normalizedInput]
  }
  
  // Verifica correspondência exata (case-insensitive)
  const exactMatch = ESPECIALIDADES_PADRONIZADAS.find(
    esp => normalizeString(esp) === normalizedInput
  )
  if (exactMatch) {
    return exactMatch
  }
  
  // Verifica se a entrada está contida em alguma especialidade ou vice-versa
  const containsMatch = ESPECIALIDADES_PADRONIZADAS.find(esp => {
    const normalizedEsp = normalizeString(esp)
    return normalizedEsp.includes(normalizedInput) || normalizedInput.includes(normalizedEsp)
  })
  if (containsMatch) {
    return containsMatch
  }
  
  // Calcula distância de Levenshtein para encontrar a mais similar
  let bestMatch: string | null = null
  let minDistance = Infinity
  
  for (const especialidade of ESPECIALIDADES_PADRONIZADAS) {
    const normalizedEsp = normalizeString(especialidade)
    const distance = levenshteinDistance(normalizedInput, normalizedEsp)
    
    // Considera uma correspondência se a distância for pequena em relação ao tamanho
    const maxDistance = Math.max(normalizedInput.length, normalizedEsp.length) * 0.4
    
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance
      bestMatch = especialidade
    }
  }
  
  return bestMatch
}

/**
 * Corrige e padroniza uma especialidade médica
 * @param input - A especialidade inserida pelo usuário
 * @returns A especialidade padronizada ou null se não encontrar correspondência
 */
export function corrigirEspecialidade(input: string): string | null {
  if (!input || !input.trim()) {
    return null
  }
  
  const trimmed = input.trim()
  
  // Se já está na lista padronizada, retorna como está
  if (ESPECIALIDADES_PADRONIZADAS.includes(trimmed as any)) {
    return trimmed
  }
  
  // Tenta encontrar correspondência
  const match = findBestMatch(trimmed)
  return match
}

/**
 * Obtém todas as especialidades padronizadas
 */
export function getEspecialidadesPadronizadas(): readonly string[] {
  return ESPECIALIDADES_PADRONIZADAS
}

