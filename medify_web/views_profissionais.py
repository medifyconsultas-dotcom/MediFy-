from django.shortcuts import render, redirect
from django.http import HttpResponseNotFound
from django.conf import settings

def dashboard_profissional(request):
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')
    else:
         return render(request, 'Profissional/dashboardProfissional.html')


def perfil_medico(request, medico_id):
    """Exibe perfil público de um médico/profissional.
    Tenta primeiro carregar o documento em `profissionais` com `obter_profissional`.
    Se não encontrado, busca em `listar_medicos_clinicas()` (médicos vinculados a clínicas).
    """
    from .firebase_services import obter_profissional, listar_medicos_clinicas, obter_clinica
    profissional = None
    try:
        profissional = obter_profissional(medico_id)
    except Exception:
        profissional = None

    if not profissional:
        # procurar entre médicos armazenados nas clínicas
        try:
            medicos_clinica = listar_medicos_clinicas() or []
            for m in medicos_clinica:
                if str(m.get('id') or m.get('uid')) == str(medico_id):
                    profissional = m
                    break
        except Exception:
            profissional = None

    clinica = None
    if profissional:
        clinica_uid = profissional.get('clinica_uid') or profissional.get('idClinica') or profissional.get('clinica_id')
        if clinica_uid:
            try:
                clinica = obter_clinica(clinica_uid)
            except Exception:
                clinica = None

    if not profissional:
        return HttpResponseNotFound('Médico não encontrado')

    return render(request, 'Profissional/perfilMedico.html', {'profissional': profissional, 'clinica': clinica})
   
