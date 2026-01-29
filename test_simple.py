
import requests
import base64
import json

# ============ CONFIGURATION ============
API_URL = "http://153.92.223.185:5001"
API_KEY = "sk-naratech-key-2024"  # Clé API fournie par l'équipe IA

# Headers requis pour toutes les requêtes
HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

print("=" * 80)
print("  TEST DE L'API DE RECONNAISSANCE FACIALE NARATECH")
print("=" * 80)

# ============ TEST 1: Endpoint Racine (Info API) ============
print("\n📋 TEST 1: Information API (GET /)")
print("-" * 80)

try:
    response = requests.get(f"{API_URL}/")
    print(f"✅ Status Code: {response.status_code}")
    print(f"📄 Response:")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
except Exception as e:
    print(f"❌ Erreur: {e}")

# ============ TEST 2: Health Check ============
print("\n🏥 TEST 2: Health Check (GET /health)")
print("-" * 80)

try:
    response = requests.get(
        f"{API_URL}/health",
        headers={"X-API-Key": API_KEY}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Status: {data['status']}")
        print(f"👥 Personnes chargées: {data['loaded_persons']}")
        print(f"🤖 Modèle: {data['model_info']['model_name']}")
        print(f"📏 Détection: {data['model_info']['det_size']}")
    else:
        print(f"❌ Erreur {response.status_code}: {response.text}")
except Exception as e:
    print(f"❌ Erreur: {e}")

# ============ TEST 3: Reconnaissance Faciale (Base64) ============
print("\n🔍 TEST 3: Reconnaissance Faciale (POST /recognize)")
print("-" * 80)

# Vérifier si l'image de test existe
import os
test_image = "Hawoly_DEME.jpg"

if os.path.exists(test_image):
    try:
        # Lire et encoder l'image en base64
        with open(test_image, "rb") as f:
            img_base64 = base64.b64encode(f.read()).decode()
        
        # Payload de la requête
        payload = {
            "image_base64": img_base64,
            "return_embeddings": False,
            "return_quality_info": True
        }
        
        # Envoi de la requête
        response = requests.post(
            f"{API_URL}/recognize",
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès: {result['message']}")
            print(f"⏱️  Temps de traitement: {result['processing_time_ms']:.1f}ms")
            print(f"📐 Dimensions: {result['frame_width']}x{result['frame_height']}")
            print(f"\n👤 Détections ({len(result['detections'])}):")
            
            for i, det in enumerate(result['detections'], 1):
                print(f"\n  Detection #{i}:")
                print(f"    Nom: {det['name']}")
                print(f"    Confiance: {det['confidence_level']}")
                print(f"    Similarité: {det['similarity']:.3f} ({det['similarity']*100:.1f}%)")
                print(f"    Qualité: {det['quality_score']:.3f}")
                print(f"    BBox: {det['bbox']}")
        else:
            print(f"❌ Erreur {response.status_code}")
            print(f"Détails: {response.json()}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
else:
    print(f"⚠️  Image de test '{test_image}' non trouvée")
    print("   Placez une image de test dans le même dossier que ce script")

# ============ TEST 4: Upload de Fichier ============
print("\n📤 TEST 4: Upload de Fichier (POST /recognize/file)")
print("-" * 80)

if os.path.exists(test_image):
    try:
        # Ouvrir le fichier en mode binaire
        with open(test_image, "rb") as f:
            files = {"file": (test_image, f, "image/jpeg")}
            
            # Envoi de la requête (attention: pas de Content-Type dans headers pour multipart)
            response = requests.post(
                f"{API_URL}/recognize/file",
                headers={"X-API-Key": API_KEY},  # Seulement l'API Key
                files=files
            )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès: {result['message']}")
            print(f"⏱️  Temps de traitement: {result['processing_time_ms']:.1f}ms")
            print(f"👤 Visages détectés: {len(result['detections'])}")
        else:
            print(f"❌ Erreur {response.status_code}")
            print(f"Détails: {response.json()}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")



print("=" * 80)
print("✅ TESTS TERMINÉS")
print("=" * 80)
print("\n📝 NOTES IMPORTANTES:")
print("   1. L'API nécessite TOUJOURS le header 'X-API-Key'")
print("   2. L'image doit être encodée en base64 (sans préfixe data:image)")
print("   3. Les seuils de confiance: HAUTE (≥0.65), MOYENNE (≥0.45), FAIBLE (≥0.35)")
print("   4. L'API retourne les coordonnées bbox pour afficher les rectangles sur les visages")
print("\n📧 Contact: Équipe IA - En cas de problème, contactez l'administrateur système")
print("=" * 80)