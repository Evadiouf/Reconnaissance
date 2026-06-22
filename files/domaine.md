# Contexte métier — Voicebot
# Charger à la demande : "Lis .claude/context/domaine.md avant de répondre"

---

## Domaine
Voicebot vocal sur canal téléphonique (SIP/VoIP) destiné au marché sénégalais.
Le système doit permettre des interactions vocales naturelles par téléphone,
potentiellement dans les langues nationales (Wolof, Pulaar, Sérère) en plus du français.
La cible inclut des utilisateurs peu ou non alphabétisés, habitués au téléphone classique.

## Vocabulaire spécifique

| Terme      | Définition courte                                              |
|------------|----------------------------------------------------------------|
| SIP        | Session Initiation Protocol — protocole standard de téléphonie VoIP |
| ASR        | Automatic Speech Recognition — transcription de la voix en texte |
| TTS        | Text-to-Speech — synthèse vocale texte vers audio              |
| VAD        | Voice Activity Detection — détection de début/fin de parole    |
| DTMF       | Touches clavier téléphonique (0-9, *, #) — fallback si ASR échoue |
| Latence E2E| Délai total entre fin de parole utilisateur et début de réponse vocale |
| Turn       | Un échange complet : parole utilisateur → réponse bot          |

## Contraintes techniques critiques

- Latence cible : < 1.5 secondes end-to-end (au-delà, l'utilisateur raccroche)
- Audio téléphonique : 8kHz, codec G.711 ou G.729 — qualité inférieure au microphone
- Connexion instable : le système doit gérer les coupures et les reprises de session
- Fallback DTMF obligatoire si ASR échoue (ex. bruit ambiant élevé)
- Coût d'hébergement : solution réaliste pour une startup sénégalaise

## Contraintes contexte Sénégal

| Dimension          | Réalité locale                                               |
|--------------------|--------------------------------------------------------------|
| Réseau téléphonique| Couverture variable hors Dakar, qualité audio dégradée       |
| Coût infrastructure| Serveurs locaux ou cloud africain (AWS Cape Town, OVH)       |
| Langues            | Wolof majoritaire, français administratif, multilinguisme fréquent |
| Utilisateurs       | Peuvent ne pas savoir lire — interface 100% vocale requise   |
| Opérateurs         | Orange, Free, Expresso — intégrations possibles              |

## Décisions ouvertes (phase théorie)

- [ ] Choix du stack technique (Python/FastAPI vs Node.js)
- [ ] Choix du moteur ASR (Whisper local, Google STT, ASR Wolof custom)
- [ ] Choix du moteur TTS (Adia TTS 2, Google TTS, ElevenLabs)
- [ ] Choix de la plateforme SIP (Asterisk, FreeSWITCH, Twilio)
- [ ] Architecture de dialogue (FSM, LLM, hybride)
- [ ] Langue(s) supportées au lancement

## Références à consulter si nécessaire

- Protocole SIP : RFC 3261
- Asterisk (PBX open source) : https://www.asterisk.org
- FreeSWITCH : https://freeswitch.org
- Whisper (ASR open source) : https://github.com/openai/whisper
- Adia TTS 2 (TTS Wolof interne CONCREE) : src/tts/ du projet Adia
