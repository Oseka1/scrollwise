import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const initial = {
  age: 19, academic_level: 1, gender: "Female", platform: "Instagram", device: "Smartphone",
  daily_hours: 5, weekend_extra_hours: 2, sleep_hours: 7, sleep_quality: 3,
  late_night: false, comparison: 2, stress: 14, gpa: 3.4,
};

const VERDICT = {
  Beneficial: { color: "var(--good)", line: "Social media use looks like it's helping this student." },
  Neutral: { color: "var(--mid)", line: "Social media use looks neither harmful nor helpful." },
  Negative: { color: "var(--bad)", line: "Social media use looks like it's hurting this student." },
};

function Slider({ label, name, min, max, step, unit = "", v, set }) {
  return (
    <label className="field">
      <span className="lab">{label}<b>{v[name]}{unit}</b></span>
      <input type="range" min={min} max={max} step={step} value={v[name]}
        onChange={(e) => set(name, Number(e.target.value))} />
    </label>
  );
}

function Select({ label, name, options, v, set, num }) {
  return (
    <label className="field">
      <span className="lab">{label}</span>
      <select value={v[name]} onChange={(e) => set(name, num ? Number(e.target.value) : e.target.value)}>
        {options.map((o) => Array.isArray(o)
          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
          : <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export default function App() {
  const [v, setV] = useState(initial);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));

  async function run(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${API}/predict`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      if (!r.ok) throw new Error("The server rejected that input.");
      setRes(await r.json());
    } catch (x) {
      setErr(x.message.includes("fetch") ? "Can't reach the API. Is the backend running?" : x.message);
    } finally { setBusy(false); }
  }

  const verdict = res && VERDICT[res.prediction];

  return (
    <div className="page">
      <header>
        <div className="brand"><i />Scrollwise</div>
        <p className="tag">How does social media use shape a student's life? Describe a student and the model tells you.</p>
      </header>

      <main>
        <form onSubmit={run} className="card form">
          <h2>01 · The student</h2>
          <div className="grid">
            <Select label="Academic level" name="academic_level" num v={v} set={set}
              options={[[0, "High School"], [1, "Undergraduate"], [2, "Postgraduate"]]} />
            <Select label="Gender" name="gender" v={v} set={set}
              options={["Female", "Male", "Non-Binary", "Prefer not to say"]} />
            <Slider label="Age" name="age" min={15} max={26} step={1} v={v} set={set} />
            <label className="field">
              <span className="lab">GPA</span>
              <input type="number" min="0" max="4" step="0.01" value={v.gpa ?? ""}
                onChange={(e) => set("gpa", e.target.value === "" ? null : Number(e.target.value))} />
            </label>
          </div>

          <h2>02 · Screen habits</h2>
          <div className="grid">
            <Select label="Main platform" name="platform" v={v} set={set}
              options={["Instagram", "TikTok", "YouTube", "Snapchat", "X (Twitter)", "Reddit", "LinkedIn"]} />
            <Select label="Main device" name="device" v={v} set={set}
              options={["Smartphone", "Laptop/PC", "Tablet"]} />
            <Slider label="Daily usage" name="daily_hours" min={1} max={14} step={0.1} unit=" h" v={v} set={set} />
            <Slider label="Extra hours on weekends" name="weekend_extra_hours" min={0} max={4.5} step={0.1} unit=" h" v={v} set={set} />
            <Select label="Compares self to others online" name="comparison" num v={v} set={set}
              options={[[0, "Never"], [1, "Rarely"], [2, "Sometimes"], [3, "Frequently"], [4, "Always"]]} />
            <label className="field toggle">
              <span className="lab">Uses it late at night</span>
              <button type="button" className={v.late_night ? "on" : ""} onClick={() => set("late_night", !v.late_night)}
                aria-pressed={v.late_night}>{v.late_night ? "Yes" : "No"}</button>
            </label>
          </div>

          <h2>03 · Sleep & stress</h2>
          <div className="grid">
            <Slider label="Sleep per night" name="sleep_hours" min={3} max={10.5} step={0.1} unit=" h" v={v} set={set} />
            <Slider label="Sleep quality (1–5)" name="sleep_quality" min={1} max={5} step={1} v={v} set={set} />
            <Slider label="Perceived stress (0–40)" name="stress" min={0} max={40} step={1} v={v} set={set} />
          </div>

          <button className="go" disabled={busy}>{busy ? "Reading the signals…" : "Predict impact →"}</button>
          {err && <p className="err">{err}</p>}
        </form>

        <aside className="card result">
          {!res ? (
            <div className="empty">
              <div className="ring" />
              <p>Fill in the student on the left and run the prediction.</p>
            </div>
          ) : (
            <div key={res.prediction + res.probabilities.Neutral} className="reveal">
              <span className="eyebrow">Predicted overall impact</span>
              <h1 style={{ color: verdict.color }}>{res.prediction}</h1>
              <p className="line">{verdict.line}</p>

              <div className="bars">
                {Object.entries(res.probabilities).sort((a, b) => b[1] - a[1]).map(([k, p]) => (
                  <div key={k} className="bar">
                    <span>{k}</span>
                    <div><em style={{ width: `${Math.max(p * 100, 1)}%`, background: VERDICT[k].color }} /></div>
                    <code>{(p * 100).toFixed(1)}%</code>
                  </div>
                ))}
              </div>

              <span className="eyebrow">What drove it</span>
              <ul className="drivers">
                {res.drivers.map((d) => (
                  <li key={d.factor}><span className={d.effect}>{d.effect === "toward" ? "▲" : "▼"}</span>
                    {d.factor} <small>{d.effect === "toward" ? "supports this result" : "pulls against it"}</small></li>
                ))}
              </ul>
            </div>
          )}
          <p className="note">Trained on a survey dataset of 4,500 students. A class project model, not professional advice.</p>
        </aside>
      </main>
    </div>
  );
}
