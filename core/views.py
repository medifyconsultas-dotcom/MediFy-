from django.http import JsonResponse
from django.views import View
import json
from .firebase_services import criar_paciente, listar_pacientes, obter_paciente

class PacienteListView(View):
    def get(self, request):
        pacientes = listar_pacientes()
        return JsonResponse(pacientes, safe=False)

    def post(self, request):
        dados = json.loads(request.body)
        criar_paciente(dados)
        return JsonResponse({"status": "Paciente criado"})

class PacienteDetailView(View):
    def get(self, request, id_paciente):
        paciente = obter_paciente(id_paciente)
        if paciente:
            return JsonResponse(paciente)
        return JsonResponse({"erro": "Não encontrado"}, status=404)
