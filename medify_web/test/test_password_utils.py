import pytest
from medify_web.password_utils import validate_password


@pytest.mark.parametrize("pwd,expected,contains", [
    ("short", False, '8'),
    ("NOLOWER123!", False, 'minúscula'),
    ("noupper123!", False, 'maiúscula'),
    ("NoNumber!!", False, 'número'),
    ("NoSpecial123", False, 'caractere especial'),
    ("Senha123!", True, None),
])
def test_validate_password_cases(pwd, expected, contains):
    valid, msg = validate_password(pwd)
    assert valid is expected
    if not expected:
        assert msg is not None
        assert contains in msg
    else:
        assert msg is None
