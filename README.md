# 🚚 LogistiQ – AI Logistics & Delivery Tracker

A production-ready, full-stack AI application that predicts e-commerce delivery delays using a Random Forest ML model, and provides an AI-powered supply chain assistant via Google Gemini.

---

## 📁 Project Structure

```
ai-logistics-tracker/
├── backend/
│   ├── data/
│   │   └── Train.csv              ← Place Kaggle dataset here
│   ├── models/
│   │   ├── delay_predictor.pkl    ← Generated after training
│   │   └── label_encoder.pkl      ← Generated after training
│   ├── main.py                    ← FastAPI server
│   ├── train_model.py             ← ML training script
│   ├── requirements.txt
│   └── .env                       ← Add your Gemini API key here
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## ⚙️ Setup & Installation

### Step 1 – Get the Dataset

1. Go to: https://www.kaggle.com/datasets/prachi13/customer-analytics
2. Download `Train.csv`
3. Place it at `backend/data/Train.csv`

### Step 2 – Get a Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Create a new API key
3. Open `backend/.env` and replace the placeholder:
   ```
   GEMINI_API_KEY=your_actual_key_here
   ```

### Step 3 – Backend Setup

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train the ML model (requires Train.csv in data/)
python train_model.py

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

Backend will be running at: http://localhost:8000
API docs available at: http://localhost:8000/docs

### Step 4 – Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be running at: http://localhost:5173

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict` | Predict delivery delay from 5 features |
| POST | `/api/register_sms` | Register a mobile number for SMS alerts |
| POST | `/api/chat` | Chat with the AI supply chain assistant |
| GET | `/health` | Health check |

### POST `/api/predict`
```json
{
  "weight_in_gms": 4500,
  "discount_offered": 10,
  "cost_of_the_product": 250,
  "prior_purchases": 3,
  "mode_of_shipment": "Ship"
}
```
Response: `{"prediction": "Delayed" | "On Time"}`

### POST `/api/register_sms`
```json
{ "mobile_number": "9876543210" }
```
Response: `{"message": "Successfully registered! ..."}`
If non-digits present: `{"message": "Invalid input"}`

### POST `/api/chat`
```json
{
  "message": "Why might my package be delayed?",
  "prediction_context": "Package is predicted to be: Delayed",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "model", "content": "Hi there!" }
  ]
}
```

---

## 🤖 ML Model Details

- **Algorithm:** Random Forest Classifier (150 trees, max_depth=10)
- **Dataset:** Kaggle E-Commerce Shipping Data (10,999 records)
- **Features:** Weight, Discount, Product Cost, Prior Purchases, Shipment Mode
- **Target:** `Reached.on.Time_Y.N` (1=Delayed, 0=On Time)
- **Encoding:** LabelEncoder for Mode_of_Shipment (Ship / Flight / Road)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Axios, Vanilla CSS |
| Backend | FastAPI, Uvicorn, Pydantic |
| ML | Scikit-Learn (Random Forest), Pandas |
| AI | Google Gemini (`gemini-flash-latest`) |
| Config | python-dotenv |
