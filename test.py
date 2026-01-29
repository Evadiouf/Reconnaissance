"""
Test simplifié - Capture webcam et reconnaissance
Version sans affichage de fenêtre (pour problèmes OpenCV GUI)
"""

import requests
import base64
import json
import cv2
import time

# ============ CONFIGURATION ============
API_URL = "http://153.92.223.185:5001"
API_KEY = "sk-naratech-key-2024"

HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

print("=" * 80)
print("  🎥 TEST DE RECONNAISSANCE FACIALE - VERSION SIMPLIFIÉE")
print("=" * 80)

def image_to_base64(image):
    """Convertit une image OpenCV en base64"""
    _, buffer = cv2.imencode('.jpg', image)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    return img_base64

def capture_photo():
    """Capture une photo depuis la webcam"""
    print("\n📸 Ouverture de la webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Impossible d'ouvrir la webcam")
        return None
    
    print("✅ Webcam ouverte")
    print("⏳ Préparation (3 secondes)...")
    time.sleep(3)
    
    # Capture de quelques frames pour stabiliser
    for i in range(10):
        ret, frame = cap.read()
    
    # Capture finale
    ret, frame = cap.read()
    
    cap.release()
    
    if ret:
        print("✅ Photo capturée")
        # Sauvegarder localement pour vérification
        cv2.imwrite("capture_temp.jpg", frame)
        print("💾 Photo sauvegardée: capture_temp.jpg")
        return frame
    else:
        print("❌ Échec de la capture")
        return None

def recognize_face(image):
    """Envoie l'image à l'API pour reconnaissance"""
    try:
        print("\n📤 Envoi de l'image à l'API...")
        img_base64 = image_to_base64(image)
        
        payload = {
            "image_base64": img_base64,
            "return_embeddings": False
        }
        
        response = requests.post(
            f"{API_URL}/recognize",
            headers=HEADERS,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Erreur API: {response.status_code}")
            print(response.json())
            return None
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def add_employee(employee_id, employee_name, image):
    """Ajoute un employé via l'API"""
    try:
        print(f"\n➕ Ajout de l'employé: {employee_id}")
        img_base64 = image_to_base64(image)
        
        payload = {
            "employee_id": employee_id,
            "employee_name": employee_name,
            "image_base64": img_base64
        }
        
        response = requests.post(
            f"{API_URL}/training_image/add",
            headers=HEADERS,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ {data['message']}")
            print(f"   Employee ID: {data['employee_id']}")
            print(f"   Fichier: {data['image_path']}")
            print(f"   Qualité: {data['quality_info']['quality_score']:.3f}")
            print(f"   Taille visage: {data['quality_info']['face_size']:.0f}px")
            return True
        else:
            print(f"\n❌ Erreur:")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            return False
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def list_employees():
    """Liste tous les employés"""
    try:
        print("\n📋 Liste des employés enregistrés:")
        print("-" * 80)
        response = requests.get(
            f"{API_URL}/training_image/list",
            headers={"X-API-Key": API_KEY}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"Total: {data['total']} employé(s)\n")
            for img in data['images']:
                print(f"  #{img['index']} - {img['employee_id']}")
                print(f"       Fichier: {img['filename']}")
                print(f"       Taille: {img['file_size_kb']} KB\n")
            return True
        else:
            print(f"❌ Erreur: {response.json()}")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    while True:
        print("\n" + "=" * 80)
        print("  🎯 MENU PRINCIPAL")
        print("=" * 80)
        print("  1. Capturer et tester la reconnaissance")
        print("  2. Capturer et ajouter un employé")
        print("  3. Lister les employés")
        print("  4. Tester avec une image existante")
        print("  5. Quitter")
        print("=" * 80)
        
        choice = input("\nChoisissez une option (1-5): ").strip()
        
        if choice == "1":
            # Test reconnaissance
            frame = capture_photo()
            if frame is not None:
                result = recognize_face(frame)
                if result and result['success']:
                    detections = result['detections']
                    print(f"\n✅ {result['message']}")
                    print(f"⏱️  Temps: {result['processing_time_ms']:.1f}ms")
                    
                    if len(detections) > 0:
                        print(f"\n👤 Détections:")
                        for i, det in enumerate(detections, 1):
                            print(f"\n  #{i}:")
                            print(f"    Nom: {det['name']}")
                            print(f"    Confiance: {det['confidence_level']}")
                            print(f"    Similarité: {det['similarity']:.3f} ({det['similarity']*100:.1f}%)")
                    else:
                        print("\n⚠️  Aucun visage reconnu")
        
        elif choice == "2":
            # Ajouter employé
            employee_id = input("\nEntrez l'ID de l'employé (ex: EMP001): ").strip()
            if not employee_id:
                print("❌ ID employé requis")
                continue
            
            employee_name = input("Entrez le nom de l'employé (optionnel): ").strip()
            
            frame = capture_photo()
            if frame is not None:
                add_employee(employee_id, employee_name, frame)
        
        elif choice == "3":
            # Lister employés
            list_employees()
        
        elif choice == "4":
            # Test avec image existante
            img_path = input("\nChemin de l'image (ex: photo.jpg): ").strip()
            try:
                frame = cv2.imread(img_path)
                if frame is not None:
                    print(f"✅ Image chargée: {img_path}")
                    result = recognize_face(frame)
                    if result and result['success']:
                        detections = result['detections']
                        print(f"\n✅ {result['message']}")
                        print(f"⏱️  Temps: {result['processing_time_ms']:.1f}ms")
                        
                        if len(detections) > 0:
                            print(f"\n👤 Détections:")
                            for i, det in enumerate(detections, 1):
                                print(f"\n  #{i}:")
                                print(f"    Nom: {det['name']}")
                                print(f"    Confiance: {det['confidence_level']}")
                                print(f"    Similarité: {det['similarity']:.3f} ({det['similarity']*100:.1f}%)")
                else:
                    print(f"❌ Impossible de charger l'image: {img_path}")
            except Exception as e:
                print(f"❌ Erreur: {e}")
        
        elif choice == "5":
            print("\n👋 Au revoir!")
            break
        
        else:
            print("\n❌ Option invalide")

if __name__ == "__main__":
    print("\n🔍 Vérification de la connexion à l'API...")
    try:
        response = requests.get(f"{API_URL}/", timeout=5)
        if response.status_code == 200:
            print("✅ API accessible")
            main()
        else:
            print(f"❌ API inaccessible (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Impossible de se connecter à l'API: {e}")