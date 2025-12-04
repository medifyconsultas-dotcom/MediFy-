from firebase_admin import firestore

def check_patient_consultations(uid):
    """Debug function to check all possible locations of consultations for a patient."""
    db = firestore.client()
    print("\n" + "="*50)
    print(f"Debugging consultations for patient {uid}")
    print("="*50)
    
    # 1. Check patient document
    try:
        patient = db.collection('pacientes').document(uid).get()
        print(f"\n1. Patient document exists: {patient.exists}")
        if patient.exists:
            data = patient.to_dict()
            print(f"Patient data: {data}")
    except Exception as e:
        print(f"Error checking patient: {e}")

    # 2. Check consultas_clinicas
    try:
        clinicas_docs = db.collection('consultas_clinicas').where("id_paciente", "==", uid).stream()
        clinicas = [doc.to_dict() for doc in clinicas_docs]
        print(f"\n2. Consultas clínicas found: {len(clinicas)}")
        for c in clinicas:
            print(f"Consultation: {c.get('data')} {c.get('hora')} - {c.get('status')} - {c.get('profissional_nome')}")
    except Exception as e:
        print(f"Error checking consultas_clinicas: {e}")

    # 3. Check consultas_autonomos
    try:
        autonomos_docs = db.collection('consultas_autonomos').where("id_paciente", "==", uid).stream()
        autonomos = [doc.to_dict() for doc in autonomos_docs]
        print(f"\n3. Consultas autônomos found: {len(autonomos)}")
        for c in autonomos:
            print(f"Consultation: {c.get('data')} {c.get('hora')} - {c.get('status')} - {c.get('profissional_nome')}")
    except Exception as e:
        print(f"Error checking consultas_autonomos: {e}")

    # 4. Check patient's consultas subcollection
    try:
        subcoll_docs = db.collection('pacientes').document(uid).collection('consultas').stream()
        subcoll = [doc.to_dict() for doc in subcoll_docs]
        print(f"\n4. Patient's consultas subcollection: {len(subcoll)}")
        for c in subcoll:
            print(f"Consultation: {c.get('data')} {c.get('hora')} - {c.get('status')} - {c.get('profissional_nome')}")
    except Exception as e:
        print(f"Error checking patient's subcollection: {e}")

    print("\n" + "="*50)