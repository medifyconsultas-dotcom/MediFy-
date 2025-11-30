import medify_web.especialidades as esp


def test_normalize_string_removes_accents_and_lowercases():
    s = 'Cardiologia Áccêntos '
    out = esp.normalize_string(s)
    assert 'cardiologia accentos' == out


def test_levenshtein_distance_basic():
    assert esp.levenshtein_distance('a', '') == 1
    assert esp.levenshtein_distance('kitten', 'sitting') == 3
    assert esp.levenshtein_distance('flaw', 'lawn') == 2


def test_find_best_match_direct_mapping():
    # mapping contains 'cardiologista' -> 'Cardiologia'
    assert esp.find_best_match('cardiologista') == 'Cardiologia'


def test_find_best_match_exact_and_substring():
    # exact
    assert esp.find_best_match('Pediatria') == 'Pediatria'
    # substring
    assert esp.find_best_match('pediatria infantil') == 'Pediatria'


def test_find_best_match_fuzzy_returns_none_if_no_close():
    # gibberish unlikely to match
    assert esp.find_best_match('zzzzzzzz') is None


def test_corrigir_especialidade_edge_cases():
    assert esp.corrigir_especialidade('') is None
    assert esp.corrigir_especialidade('   ') is None
    # already standardized
    assert esp.corrigir_especialidade('Cardiologia') == 'Cardiologia'
    # variation
    assert esp.corrigir_especialidade('cardio') == 'Cardiologia'


def test_get_especialidades_padronizadas_returns_list():
    lst = esp.get_especialidades_padronizadas()
    assert isinstance(lst, list)
    assert 'Cardiologia' in lst
