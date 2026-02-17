// Test route
app.get("/test-alert", async (req, res) => {
  try {
    await sendTelegramAlert("✅ Test alert from your Weather Station server!");
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
            `🚨 Weather Alert!\n` +
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
