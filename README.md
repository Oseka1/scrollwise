# Scrollwise

Predicts whether a student's social media use is Beneficial, Neutral or Negative for their life (Logistic Regression, ~96.9% test accuracy).

## Run the backend
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload      # http://localhost:8000

## Run the frontend
    cd frontend
    npm install
    npm run dev                    # http://localhost:5173

Set `VITE_API_URL` if the API lives elsewhere. Keep scikit-learn at 1.8.0 so the saved model and scaler load cleanly.
