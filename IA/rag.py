import os 
import requests
import sys
from langchain_core.documents import Document
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from langchain_ollama import OllamaEmbeddings  
from langchain_google_genai import ChatGoogleGenerativeAI  
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

print("--- Démarrage de l'API RAG ---")

# ==================== CHARGEMENT DES DONNÉES ====================
def fetch_statistiques():
    print("Appel à /api/logement...")
    response = requests.get("http://localhost:3000/api/v1/logement", timeout=10)
    response.raise_for_status()
    data = response.json()
    
    documents = []
    if data.get("status") == 200 and "data" in data:
        stats = data["data"]
        occupees = stats.get("Occupée", 0)
        disponibles = stats.get("Disponible", 0)
        total = occupees + disponibles
        
        print(f"-> Statistiques: {occupees} occupées, {disponibles} disponibles")
        
        content = f"""
Statistiques globales des logements:
- Nombre total des chambres occupées: {occupees}
- Nombre total des chambres disponibles: {disponibles}
- Nombre total de chambres: {total}
- Taux d'occupation: {round((occupees/total)*100, 1) if total > 0 else 0}%
        """.strip()
        
        doc = Document(
            page_content=content,
            metadata={
                "source": "api_statistiques",
                "type": "statistiques_globales",
                "occupees": occupees,
                "disponibles": disponibles
            }
        )
        documents.append(doc)
    
    return documents

def fetch_chambres():
    print("Appel à /api/logement/detail_chambre...")
    response = requests.get("http://localhost:3000/api/v1/logement/detail_chambre", timeout=10)
    response.raise_for_status()
    data = response.json()
    
    documents = []
    if data.get("status") == 200 and "data" in data:
        chambres = data["data"]
        print(f"-> Trouvé {len(chambres)} chambres détaillées")
        
        for chambre in chambres:
            numero = chambre.get('numero_chambre', 'N/A')
            etat = chambre.get('etat', 'N/A')
            surface = chambre.get('surface', 'N/A')
            etudiant = chambre.get('etudiant_nom', 'Aucun')
            type_chambre = chambre.get('type_chambre', 'N/A')
            etage = chambre.get('etage', 'N/A')
            batiment = chambre.get('batiment', 'N/A')
            
            content = f"""
Chambre numéro {numero}:
- État: {etat}
- Surface: {surface} m²
- Type de chambre: {type_chambre}
- Étage: {etage}
- Bâtiment: {batiment}
- Occupant: {etudiant if etat == "Occupée" else "Aucun (chambre disponible)"}
            """.strip()
            
            doc = Document(
                page_content=content,
                metadata={
                    "source": "api_chambres",
                    "numero_chambre": str(numero),
                    "etat": etat,
                    "type_chambre": type_chambre,
                    "batiment": batiment,
                    "etage": int(etage) if str(etage).isdigit() else etage,
                    "surface": int(surface) if isinstance(surface, (int, float)) else surface,
                    "etudiant": etudiant
                }
            )
            documents.append(doc)
    
    return documents

try:
    stats_docs = fetch_statistiques()
    chambres_docs = fetch_chambres()
    all_docs = stats_docs + chambres_docs
except Exception as e:
    print(f"❌ ERREUR: {e}")
    sys.exit(1)

if not all_docs:
    print("❌ ERREUR: Aucune donnée chargée")
    sys.exit(1)

print(f"✅ {len(all_docs)} documents chargés")

# ==================== CONFIGURATION RAG ====================
embedding_function = OllamaEmbeddings(model="nomic-embed-text")
vectorstore = Chroma.from_documents(
    documents=all_docs,
    embedding=embedding_function,
    persist_directory="./chroma_db_logements"
)
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 70})

GEMINI_API_KEY = "AIzaSyDI5_RcZbF0BUHLHi2OP-z-36yg2cfu3fo"
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.2
)

template = """Vous êtes un assistant IA spécialisé dans la gestion des logements étudiants. 
Répondez à la question en vous basant sur le contexte suivant et aussi sur d'autres connaissances générales si nécessaire.

Soyez précis, concis et professionnel. Si vous ne trouvez pas l'information, dites-le clairement.

CONTEXTE:
{context}

QUESTION:
{question}

RÉPONSE:
"""

prompt = ChatPromptTemplate.from_template(template)

def format_docs(docs):
    return "\n\n---\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

print("✅ RAG configuré\n")

# ==================== API FASTAPI ====================
app = FastAPI(title="RAG Chatbot API", version="1.0.0")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite + votre backend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    response: str
    success: bool
    error: str = None

@app.get("/")
async def root():
    return {
        "message": "RAG Chatbot API is running",
        "endpoints": {
            "chat": "/api/chat",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "documents_loaded": len(all_docs),
        "model": "gemini-2.5-flash"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: QuestionRequest):
    """
    Endpoint principal pour poser des questions au RAG
    """
    try:
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="La question ne peut pas être vide")
        
        question = request.question.strip()
        print(f"[QUESTION] {question}")
        
        # Invocation du RAG
        response = rag_chain.invoke(question)
        
        print(f"[RÉPONSE] {response[:100]}...")
        
        return ChatResponse(
            response=response,
            success=True
        )
    
    except Exception as e:
        print(f"[ERREUR] {str(e)}")
        return ChatResponse(
            response="",
            success=False,
            error=str(e)
        )

# ==================== MODE TERMINAL (optionnel) ====================
def terminal_mode():
    print("=== TEST RAG TERMINAL ===\n")
    
    questions = [
        "Combien de chambres sont disponibles ?",
        "Qui occupe la chambre 102 ?",
        "Quelles sont les chambres disponibles au bâtiment D ?"
    ]
    
    for i, question in enumerate(questions, 1):
        print(f"\n[Q{i}] {question}")
        try:
            response = rag_chain.invoke(question)
            print(f"[R{i}] {response}")
        except Exception as e:
            print(f"[ERREUR] {e}")
    
    print("\n\n=== MODE INTERACTIF ===")
    print("Tapez 'exit' pour quitter\n")
    
    while True:
        question = input("Votre question: ").strip()
        if question.lower() in ['exit', 'quit', 'q']:
            print("Au revoir!")
            break
        if not question:
            continue
        
        try:
            response = rag_chain.invoke(question)
            print(f"\n{response}\n")
        except Exception as e:
            print(f"ERREUR: {e}\n")

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Démarrage du serveur FastAPI sur http://localhost:8000")
    print("📖 Documentation: http://localhost:8000/docs\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)