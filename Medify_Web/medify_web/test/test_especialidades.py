import pytest

from medify_web import especialidades as esp


def test_normalize_string_removes_accents_and_lowercases():
    assert esp.normalize_string('ÁççÊnt Ô') == 'accent o'


def test_levenshtein_distance_basic():
    assert esp.levenshtein_distance('kitten', 'sitting') == 3
    assert esp.levenshtein_distance('', 'abc') == 3


def test_find_best_match_mappings_and_variations():
    assert esp.find_best_match('cardiologista') == 'Cardiologia'
    assert esp.find_best_match('cardio') == 'Cardiologia'
    assert esp.find_best_match('oftalmo') == 'Oftalmologia'


def test_corrigir_especialidade_and_get_list():
    assert esp.corrigir_especialidade('Cardiologia') == 'Cardiologia'
    assert esp.corrigir_especialidade('') is None
    pads = esp.get_especialidades_padronizadas()
    assert isinstance(pads, list)
    assert 'Cardiologia' in pads
