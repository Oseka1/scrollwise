import json
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

HERE = Path(__file__).parent
model = joblib.load(HERE / "model.joblib")
scaler = joblib.load(HERE / "scaler.joblib")
meta = json.loads((HERE / "meta.json").read_text())
COLS = meta["feature_columns"]
CLASSES = meta["classes"]  # index i == LabelEncoder class i

LABELS = {
    "Age": "Age",
    "Academic_Level": "Academic level",
    "Daily_Usage_Hours": "Daily usage",
    "Weekend_Extra_Hours": "Weekend extra hours",
    "Sleep_Duration_Hours": "Sleep duration",
    "Sleep_Quality_Score": "Sleep quality",
    "Late_Night_Usage": "Late-night use",
    "Social_Comparison_Frequency": "Social comparison",
    "Perceived_Stress_Score": "Stress level",
    "Academic_Performance_GPA": "GPA",
}

app = FastAPI(title="Scrollwise API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class Student(BaseModel):
    age: int = Field(ge=13, le=40)
    academic_level: int = Field(ge=0, le=2)  # 0 High School, 1 Undergraduate, 2 Postgraduate
    gender: str  # Female | Male | Non-Binary | Prefer not to say
    platform: str  # Instagram | LinkedIn | Reddit | Snapchat | TikTok | X (Twitter) | YouTube
    device: str  # Smartphone | Laptop/PC | Tablet
    daily_hours: float = Field(ge=0, le=24)
    weekend_extra_hours: float = Field(ge=0, le=12)
    sleep_hours: float = Field(ge=0, le=16)
    sleep_quality: int = Field(ge=1, le=5)
    late_night: bool
    comparison: int = Field(ge=0, le=4)  # 0 Never ... 4 Always
    stress: float | None = Field(default=None, ge=0, le=40)
    gpa: float | None = Field(default=None, ge=0, le=4)


def to_row(s: Student) -> pd.DataFrame:
    row = dict.fromkeys(COLS, 0.0)
    row.update(
        Age=s.age,
        Academic_Level=s.academic_level,
        Daily_Usage_Hours=s.daily_hours,
        Weekend_Extra_Hours=s.weekend_extra_hours,
        Sleep_Duration_Hours=s.sleep_hours,
        Sleep_Quality_Score=s.sleep_quality,
        Late_Night_Usage=int(s.late_night),
        Social_Comparison_Frequency=s.comparison,
        Perceived_Stress_Score=s.stress if s.stress is not None else meta["impute_means"]["Perceived_Stress_Score"],
        Academic_Performance_GPA=s.gpa if s.gpa is not None else meta["impute_means"]["Academic_Performance_GPA"],
    )
    # One-hot columns; Female and Smartphone were dropped in training (all zeros)
    for key in (f"Gender_{s.gender}", f"Primary_Platform_{s.platform}", f"Device_Type_{s.device}"):
        if key in row:
            row[key] = 1.0
    return pd.DataFrame([row], columns=COLS)


@app.get("/health")
def health():
    return {"ok": True, "accuracy": meta["accuracy"]["logreg"]}


@app.post("/predict")
def predict(s: Student):
    x = scaler.transform(to_row(s))
    proba = model.predict_proba(x)[0]
    idx = int(proba.argmax())
    contrib = model.coef_[idx] * x[0]  # per-feature push toward the predicted class
    drivers = sorted(
        ((LABELS[c], float(v)) for c, v in zip(COLS, contrib) if c in LABELS),
        key=lambda t: abs(t[1]),
        reverse=True,
    )[:4]
    return {
        "prediction": CLASSES[idx],
        "probabilities": {c: float(p) for c, p in zip(CLASSES, proba)},
        "drivers": [{"factor": f, "effect": "toward" if v > 0 else "away"} for f, v in drivers],
    }
