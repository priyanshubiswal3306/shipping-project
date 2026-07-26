import os
import pickle
import re
import google.generativeai as genai
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "delay_predictor.pkl")
ENC_PATH = os.path.join(BASE_DIR, "models", "label_encoder.pkl")

with open(MODEL_PATH, "rb") as f:
    clf = pickle.load(f)

with open(ENC_PATH, "rb") as f:
    le = pickle.load(f)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="AI Logistics Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "https://shipping-project-zeta.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    weight_in_gms: float
    discount_offered: float
    cost_of_the_product: float
    prior_purchases: int
    mode_of_shipment: str

class SmsRequest(BaseModel):
    mobile_number: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    prediction_context: Optional[str] = None
    history: Optional[List[ChatMessage]] = []

@app.post("/api/predict")
def predict(req: PredictRequest):
    try:
        mode_encoded = int(le.transform([str(req.mode_of_shipment)])[0])
    except Exception:
        mode_encoded = 0

    features = pd.DataFrame([{
        "Weight_in_gms": req.weight_in_gms,
        "Discount_offered": req.discount_offered,
        "Cost_of_the_Product": req.cost_of_the_product,
        "Prior_purchases": req.prior_purchases,
        "Mode_of_Shipment": mode_encoded,
    }])

    # Calculate probabilities
    probabilities = clf.predict_proba(features)[0]
    
    # FORCE standard Python floats to avoid JSON serialization drops
    prob_on_time = float(probabilities[0])
    prob_delayed = float(probabilities[1])
    
    if prob_delayed > 0.5:
        status = "Delayed"
        confidence = round(prob_delayed * 100, 1)
    else:
        status = "On Time"
        confidence = round(prob_on_time * 100, 1)

    return {"prediction": status, "probability": confidence}

@app.post("/api/register_sms")
def register_sms(req: SmsRequest):
    if not req.mobile_number or not re.fullmatch(r"\d+", req.mobile_number):
        return {"message": "Invalid input"}
    return {"message": f"Successfully registered! SMS alerts will be sent to {req.mobile_number}."}

SYSTEM_PROMPT = """You are an exclusive Supply Chain and Logistics AI Assistant.

CRITICAL INSTRUCTIONS:
1. STRICT DOMAIN GUARDRAIL: You must ONLY answer questions related to logistics, shipping, e-commerce, delivery, supply chain, and order tracking. If the user asks about ANYTHING else (e.g., science, history, coding, general trivia), you must politely refuse to answer. Example refusal: "I specialize in logistics and order tracking. I'm afraid I cannot answer questions outside of this domain."
2. BE CONCISE: Keep your answers brief, conversational, and directly address the user's question. Aim for 2 to 4 sentences maximum.
3. USE CONTEXT NATURALLY: You will receive the package's prediction status as hidden context. Use this silently to inform your answer.
4. DIRECT ANSWERS: Provide simple, realistic customer-support answers.
5. NO HEAVY FORMATTING: Avoid using heavy markdown like large headers (###) or excessive bolding so it looks natural in a chat window."""

@app.post("/api/chat")
def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured.")

    user_message = req.message
    if req.prediction_context:
        user_message = f"[Current Package Status: {req.prediction_context}]\n\n{req.message}"

    gemini_history = []
    for msg in (req.history or []):
        role = "model" if msg.role == "model" else "user"
        gemini_history.append({
            "role": role,
            "parts": [msg.content],
        })

    try:
        model = genai.GenerativeModel(
            model_name="gemini-flash-latest",
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=1024,
            ),
        )

        chat_session = model.start_chat(history=gemini_history)
        response = chat_session.send_message(user_message)
        return {"reply": response.text}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(exc)}")

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": clf is not None}