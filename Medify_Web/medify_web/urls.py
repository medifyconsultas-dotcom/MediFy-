from django.urls import path
from . import views, views_auth, views_clinica, views_consultas, views_paciente, views_profissionais
from django.http import JsonResponse

app_name = 'medify_web'

urlpatterns = [
    path('', views.index, name='index'),

    #Authentication paths
    path('auth/', views_auth.auth_view, name='auth'),
    path('cadastrar/', views_auth.cadastrar_view, name='cadastrar'),
    path('auth/esqueci/', views_auth.esqueci_senha_view, name='esqueci_senha'),
    path('auth/alterar_senha/', views_auth.alterar_senha_view, name='alterar_senha'),
    path('logout/', views_auth.logout_view, name='logout'),

    #Paciente
    path('paciente/agendar/', views_consultas.consultaGeral, name='consultaGeral'),
    path('paciente/marcar/<str:medico_id>/', views_consultas.consultaMedico, name='consultaMedico'),
    path('paciente/consulta/cancelar/<str:consulta_id>/', views_consultas.cancelar_consulta, name='cancelar_consulta'),
    path('paciente/consulta/remarcar/<str:consulta_id>/', views_consultas.remarcar_consulta, name='remarcar_consulta'),
    path('paciente/consulta/deletar/<str:consulta_id>/', views_consultas.deletar_consulta_view, name='deletar_consulta'),
    path('paciente/consultas/deletar_tudo/', views_consultas.deletar_todas_consultas_paciente, name='deletar_todas_consultas_paciente'),
    path('paciente/consulta/deletar_permanente/<str:consulta_id>/', views_consultas.deletar_consulta_permanente, name='deletar_consulta_permanente'),
    path('paciente/agenda/', views_paciente.ver_agenda, name='verAgenda'),
    path('paciente/agenda/events/', views_paciente.paciente_agenda_events, name='paciente_agenda_events'),
    path('paciente/perfil/', views_paciente.perfilPaciente, name='perfilPaciente'),
    path('paciente/perfil/upload_photo/', views_paciente.upload_profile_photo, name='upload_profile_photo'),
    path('paciente/redefinir_senha/', views_paciente.enviar_redefinicao_senha, name='enviar_redefinicao_senha'),
    path('paciente/dashboard/', views_paciente.dashboard_paciente, name='dashboard_paciente'),
    path('paciente/visualizar/<str:paciente_uid>/', views_paciente.visualizar_paciente, name='visualizar_paciente'),
    
    #Clinica
    path('clinica/dashboard/', views_clinica.dashboard_clinica, name='dashboard_clinica'),
    
    #Profissionais
    path('profissional/dashboard/', views_profissionais.dashboard_profissional, name='dashboard_profissional'),
    # Perfil do médico (público)
    path('medico/perfil/<str:medico_id>/', views_profissionais.perfil_medico, name='perfil_medico'),    
    
]

def api_ai_model(request):
    from django.conf import settings
    return JsonResponse({'default_ai_model': getattr(settings, 'DEFAULT_AI_MODEL', None)})

urlpatterns += [
    path('api/ai/model/', api_ai_model, name='api_ai_model'),
]
