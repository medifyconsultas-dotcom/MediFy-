# Lista de especialidades médicas padronizadas
ESPECIALIDADES_PADRONIZADAS = [
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
]

# Mapeamento de variações comuns para especialidades padronizadas
MAPEAMENTO_VARIACOES = {
    # Cardiologia
    'cardiologista': 'Cardiologia',
    'cardio': 'Cardiologia',
    'cardiol': 'Cardiologia',
    
    # Dermatologia
    'dermatologista': 'Dermatologia',
    'dermatol': 'Dermatologia',
    'pele': 'Dermatologia',
    
    # Endocrinologia
    'endocrinologista': 'Endocrinologia',
    'endocrino': 'Endocrinologia',
    'diabetes': 'Endocrinologia',
    
    # Gastroenterologia
    'gastroenterologista': 'Gastroenterologia',
    'gastro': 'Gastroenterologia',
    'gastrologia': 'Gastroenterologia',
    
    # Ginecologia
    'ginecologista': 'Ginecologia',
    'gineco': 'Ginecologia',
    'ginec': 'Ginecologia',
    'obstetrícia': 'Ginecologia',
    'obstetria': 'Ginecologia',
    
    # Neurologia
    'neurologista': 'Neurologia',
    'neuro': 'Neurologia',
    'neurol': 'Neurologia',
    
    # Oftalmologia
    'oftalmologista': 'Oftalmologia',
    'oftalmo': 'Oftalmologia',
    'olhos': 'Oftalmologia',
    
    # Ortopedia
    'ortopedista': 'Ortopedia',
    'ortopedia': 'Ortopedia',
    'osso': 'Ortopedia',
    'traumatologia': 'Traumatologia',
    
    # Otorrinolaringologia
    'otorrinolaringologista': 'Otorrinolaringologia',
    'otorrino': 'Otorrinolaringologia',
    'ouvido': 'Otorrinolaringologia',
    'nariz': 'Otorrinolaringologia',
    'garganta': 'Otorrinolaringologia',
    
    # Pediatria
    'pediatra': 'Pediatria',
    'pediatria': 'Pediatria',
    'pediat': 'Pediatria',
    'criança': 'Pediatria',
    
    # Psiquiatria
    'psiquiatra': 'Psiquiatria',
    'psiquiatria': 'Psiquiatria',
    'psiqui': 'Psiquiatria',
    'mental': 'Psiquiatria',
    
    # Urologia
    'urologista': 'Urologia',
    'urologia': 'Urologia',
    'urol': 'Urologia',
    
    # Clínica Geral
    'clinica geral': 'Clínica Geral',
    'clinico geral': 'Clínica Geral',
    'medicina geral': 'Clínica Geral',
    'geral': 'Clínica Geral',
    'clinico': 'Clínica Geral',
    
    # Cirurgia
    'cirurgia': 'Cirurgia Geral',
    'cirurgião': 'Cirurgia Geral',
    'cirurgiao': 'Cirurgia Geral',
    
    # Oncologia
    'oncologista': 'Oncologia',
    'oncologia': 'Oncologia',
    'cancer': 'Oncologia',
    'câncer': 'Oncologia',
    
    # Geriatria
    'geriatra': 'Geriatria',
    'geriatria': 'Geriatria',
    'idoso': 'Geriatria',
    
    # Reumatologia
    'reumatologista': 'Reumatologia',
    'reumatologia': 'Reumatologia',
    'reumato': 'Reumatologia',
    
    # Pneumologia
    'pneumologista': 'Pneumologia',
    'pneumologia': 'Pneumologia',
    'pulmao': 'Pneumologia',
    'pulmão': 'Pneumologia',
    
    # Infectologia
    'infectologista': 'Infectologia',
    'infectologia': 'Infectologia',
    'infecto': 'Infectologia',
    
    # Nefrologia
    'nefrologista': 'Nefrologia',
    'nefrologia': 'Nefrologia',
    'nefro': 'Nefrologia',
    'rim': 'Nefrologia',
    
    # Alergologia
    'alergologista': 'Alergologia',
    'alergologia': 'Alergologia',
    'alergia': 'Alergologia',
    
    # Hematologia
    'hematologista': 'Hematologia',
    'hematologia': 'Hematologia',
    'sangue': 'Hematologia',
}


def normalize_string(s):
    """Normaliza uma string removendo acentos e convertendo para minúsculas"""
    import unicodedata
    s = s.lower().strip()
    # Remove acentos
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s


def levenshtein_distance(s1, s2):
    """Calcula a distância de Levenshtein entre duas strings"""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]


def find_best_match(input_str):
    """Encontra a especialidade mais similar"""
    normalized_input = normalize_string(input_str)
    
    # Primeiro, verifica se há um mapeamento direto
    if normalized_input in MAPEAMENTO_VARIACOES:
        return MAPEAMENTO_VARIACOES[normalized_input]
    
    # Verifica correspondência exata (case-insensitive)
    for esp in ESPECIALIDADES_PADRONIZADAS:
        if normalize_string(esp) == normalized_input:
            return esp
    
    # Verifica se a entrada está contida em alguma especialidade ou vice-versa
    for esp in ESPECIALIDADES_PADRONIZADAS:
        normalized_esp = normalize_string(esp)
        if normalized_esp in normalized_input or normalized_input in normalized_esp:
            return esp
    
    # Calcula distância de Levenshtein para encontrar a mais similar
    best_match = None
    min_distance = float('inf')
    
    for especialidade in ESPECIALIDADES_PADRONIZADAS:
        normalized_esp = normalize_string(especialidade)
        distance = levenshtein_distance(normalized_input, normalized_esp)
        
        # Considera uma correspondência se a distância for pequena em relação ao tamanho
        max_distance = max(len(normalized_input), len(normalized_esp)) * 0.4
        
        if distance < min_distance and distance <= max_distance:
            min_distance = distance
            best_match = especialidade
    
    return best_match


def corrigir_especialidade(input_str):
    """
    Corrige e padroniza uma especialidade médica
    :param input_str: A especialidade inserida pelo usuário
    :return: A especialidade padronizada ou None se não encontrar correspondência
    """
    if not input_str or not input_str.strip():
        return None
    
    trimmed = input_str.strip()
    
    # Se já está na lista padronizada, retorna como está
    if trimmed in ESPECIALIDADES_PADRONIZADAS:
        return trimmed
    
    # Tenta encontrar correspondência
    match = find_best_match(trimmed)
    return match


def get_especialidades_padronizadas():
    """Obtém todas as especialidades padronizadas"""
    return ESPECIALIDADES_PADRONIZADAS

