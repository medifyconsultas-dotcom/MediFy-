from django.shortcuts import render, redirect
import requests
import datetime
from django.contrib import messages
import os
from django.conf import settings

API_KEY_FIREBASE = "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94"
PROJECT_ID = "medify-401a8"


def dashboard_clinica(request):
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    else:
        return redirect('medify_web:dashboard_clinica')
