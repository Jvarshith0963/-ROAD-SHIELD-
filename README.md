# 🚦 Smart Road Safety System

> **Speed + Weather Aware AI Assistant** — Real-time speed violation detection, dynamic zone alerts, and weather intelligence using ML + WebSockets.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                             │
│                    React.js Dashboard (Port 3000)                   │
│         Speedometer · Zone Selector · Weather · ML Results          │
│              Real-time popups via Socket.io WebSocket               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  HTTP REST + WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NODE.JS BACKEND (Port 4000)                      │
│   Express + Socket.io · Prisma ORM · Winston Logger · Helmet        │
│                                                                     │
│   POST /api/speed-check ──► ML Service ──► alerts fan-out          │
│   GET  /api/weather      ──► OpenWeatherMap API (cached 10 min)    │
│   GET  /api/alerts        ──► PostgreSQL                           │
└──────────┬────────────────────────────────────────┬────────────────┘
           │  HTTP (axios)                          │  Prisma
           ▼                                        ▼
┌─────────────────────┐                 ┌──────────────────────────┐
│  PYTHON ML SERVICE  │                 │     PostgreSQL (Port 5432)│
│  FastAPI (Port 8000)│                 │                          │
│                     │                 │  speed_checks            │
│  POST /predict      │                 │  alerts                  │
│  GET  /health       │                 │  weather_cache           │
│  GET  /model/info   │                 └──────────────────────────┘
│                     │
│  GradientBoosting   │
│  Classifier         │
│  Acc: 99.83%        │
│  AUC: 1.00          │
└─────────────────────┘
```

---

## Folder Structure

```
smart-road-safety/
├── docker-compose.yml
│
├── ml-service/                   # Python FastAPI + ML
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                    # FastAPI inference API
│   ├── train.py                  # ML training pipeline
│   ├── data/
│   │   ├── generate_dataset.py   # Synthetic dataset (50k rows)
│   │   └── speed_violations.csv  # Generated dataset
│   └── model/
│       ├── speed_classifier.pkl  # Trained model
│       └── model_metadata.json   # Metrics + feature importance
│
├── backend/                      # Node.js + Express
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── server.js             # Entry + Socket.io
│       ├── app.js                # Express setup
│       ├── config/
│       │   ├── logger.js         # Winston logger
│       │   └── database.js       # Prisma singleton
│       ├── routes/index.js
│       ├── controllers/
│       │   ├── speedController.js
│       │   ├── weatherController.js
│       │   └── alertController.js
│       ├── services/
│       │   ├── mlService.js      # Calls Python API
│       │   ├── weatherService.js # OWM + caching
│       │   └── alertService.js   # Persist + Socket.io emit
│       └── middleware/
│           └── errorHandler.js
│
└── frontend/                     # React.js
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── index.js
        ├── App.js                # Complete dashboard
        ├── services/api.js       # Axios client
        └── hooks/
            ├── useAlertSocket.js # Socket.io hook
            └── useSpeedSimulator.js
```

---

## ML Model Details

| Item | Detail |
|------|--------|
| **Algorithm** | Gradient Boosting Classifier (scikit-learn) |
| **Why GBT?** | Best tabular performance; fast inference; interpretable |
| **Dataset** | Synthetic (50,000 rows, 23.8% violation rate) |
| **Features** | Zone type, weather, speed limit, actual speed, time, road condition, visibility, traffic density + 4 engineered |
| **Test Accuracy** | **99.83%** |
| **ROC-AUC** | **1.00** |
| **Inference time** | < 1 ms |
| **Top Features** | speed_excess, speed_ratio, speed_limit, actual_speed, visibility |

### Real Datasets (for production)
- [UK Road Safety Data](https://www.data.gov.uk/dataset/cb7ae6f0-4be6-4935-9277-47e5ce24a11f/road-safety-data) — Kaggle
- [US Traffic Speed Dataset](https://www.kaggle.com/datasets/paultimothymooney/internet-archive-metadata) 
- [OpenTraffic](https://github.com/opentraffic) — GPS speed traces

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+, Python 3.11+, PostgreSQL 15+

### 1. ML Service
```bash
cd ml-service
pip install -r requirements.txt
python data/generate_dataset.py   # Generate dataset
python train.py                   # Train model (~30s)
uvicorn app:app --port 8000       # Start API
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env: add WEATHER_API_KEY from openweathermap.org
npm install
npx prisma migrate dev
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

---

## Docker (Recommended)

```bash
# Copy env file
cp backend/.env.example .env
echo "WEATHER_API_KEY=your_key_here" >> .env

# Build + start everything
docker compose up --build

# App available at:
#   Frontend:   http://localhost:3000
#   Backend:    http://localhost:4000
#   ML Service: http://localhost:8000
```

---

## API Reference

### POST `/api/speed-check`
```json
{
  "vehicleId":        "V-001",
  "zoneType":         "school",
  "speedLimit":       20,
  "actualSpeed":      35,
  "weatherCondition": "rain",
  "lat":              28.6139,
  "lon":              77.2090
}
```
**Response:**
```json
{
  "speed":   { "limit": 20, "actual": 35, "excess": 15 },
  "ml":      { "violation": true, "risk_level": "CRITICAL", "violation_prob": 0.97 },
  "weather": { "condition": "rain", "temp": 24, "alerts": [...] }
}
```

### GET `/api/weather?lat=28.61&lon=77.20`
Returns weather 10 km ahead of coordinates.

### GET `/api/alerts?unacknowledgedOnly=true`
Returns recent alerts with severity and type.

### WebSocket Events
```javascript
socket.on("alert", (alert) => {
  // { id, type, severity, message, vehicleId, createdAt }
});
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `WEATHER_API_KEY` | [OpenWeatherMap](https://openweathermap.org/api) API key (free) |
| `ML_SERVICE_URL` | Python ML service URL (default: http://localhost:8000) |
| `PORT` | Backend port (default: 4000) |
| `FRONTEND_URL` | For CORS (default: http://localhost:3000) |

---

## Production Deployment

### Cloud (AWS/GCP/Azure)
1. Push images to ECR/GCR/ACR
2. Deploy with ECS/GKE/AKS
3. Use RDS/Cloud SQL for PostgreSQL
4. Use Redis for Socket.io scaling (add `@socket.io/redis-adapter`)
5. Put API Gateway / Load Balancer in front

### Scaling Considerations
- ML Service: stateless → scale horizontally behind a load balancer
- Backend: add Redis adapter for Socket.io multi-instance support
- Weather cache: already in DB (10 min TTL)
- Rate limiting: already configured (200 req/min per IP)
