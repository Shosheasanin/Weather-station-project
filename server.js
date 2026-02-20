const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const TELEGRAM_BOT_TOKEN = "8570485987:AAHJoxmm79GrxO0BciTljIBOf3CUfAKd868";
const TELEGRAM_CHAT_ID = "6195019917";

const TEMP_LIMIT = 30; 
const HUM_LIMIT = 70;  

const ALERT_COOLDOWN_MS = 60 * 1000;
let lastAlertTime = 0;

function canSendAlert() {
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) return false;
  lastAlertTime = now;
  return true;
}

const dbPath = path.join(__dirname, "weather.db");
const db = new sqlite3.Database(dbPath);

db.run(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function isNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

async function sendTelegramAlert(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.log("Telegram error:", data);
  }
}

// ROUTES

// Test route
app.get("/test-alert", async (req, res) => {
  try {
    await sendTelegramAlert("Test alert from your Weather Station server!");
    res.send("Telegram alert sent");
  } catch (err) {
    res.status(500).send("Failed to send Telegram alert");
  }
});

// ESP32 sends data here
app.post("/api/readings", (req, res) => {
  const { temperature, humidity } = req.body;

  if (!isNumber(temperature) || !isNumber(humidity)) {
    return res.status(400).json({ error: "Invalid data (use numbers)" });
  }

  db.run(
    "INSERT INTO readings (temperature, humidity) VALUES (?, ?)",
    [temperature, humidity],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // Send Telegram alert if values are over the limit 
      try {
        const tooHot = temperature >= TEMP_LIMIT;
        const tooHumid = humidity >= HUM_LIMIT;

        if ((tooHot || tooHumid) && canSendAlert()) {
          const msg =
            `Weather Alert!\n` +
            `Temp: ${temperature}°C (limit ${TEMP_LIMIT}°C)\n` +
            `Humidity: ${humidity}% (limit ${HUM_LIMIT}%)`;

          await sendTelegramAlert(msg);
        }
      } catch (e) {
        console.log("Alert send failed:", e.message);
      }

      res.json({ ok: true, id: this.lastID });
    }
  );
});

// Latest reading
app.get("/api/readings/latest", (req, res) => {
  db.get("SELECT * FROM readings ORDER BY id DESC LIMIT 1", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

// Last 10 readings
app.get("/api/readings/history", (req, res) => {
  db.all("SELECT * FROM readings ORDER BY id DESC LIMIT 10", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.reverse());
  });
});

//  START SERVER
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
