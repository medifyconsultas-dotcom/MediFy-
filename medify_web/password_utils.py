import re


def validate_password(password: str):
    """Valida a senha com as regras do projeto:
    - mínimo 8 caracteres
    - ao menos uma letra minúscula
    - ao menos uma letra maiúscula
    - ao menos um número
    - ao menos um caractere especial

    Retorna tupla (valid: bool, message: str|None)
    """
    if not password or len(password) < 8:
        return False, 'Senha deve ter pelo menos 8 caracteres.'

    if not re.search(r"[a-z]", password):
        return False, 'Senha deve conter ao menos uma letra minúscula.'

    if not re.search(r"[A-Z]", password):
        return False, 'Senha deve conter ao menos uma letra maiúscula.'

    if not re.search(r"[0-9]", password):
        return False, 'Senha deve conter ao menos um número.'

    if not re.search(r"[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?`~]", password):
        return False, 'Senha deve conter ao menos um caractere especial.'

    return True, None
