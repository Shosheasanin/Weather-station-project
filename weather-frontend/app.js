// Cloudflare tunnel base URL 
const BASE_URL = "https://selective-populations-array-annotation.trycloudflare.com";

let temperatureChart = null;

async function getLatestReading() {
  const res = await fetch(`${BASE_URL}/api/readings/latest`);
  return res.json();
}

async function getReadingHistory() {
  const res = await fetch(`${BASE_URL}/api/readings/history`);
  return res.json();
}

function updateLatestCard(data) {
  document.getElementById("temp").textContent = data.temperature ?? "--";
  document.getElementById("hum").textContent = data.humidity ?? "--";
  document.getElementById("time").textContent = data.created_at ?? "--";
}

function updateTable(rows) {
  const tbody = document.getElementById("rows");
  tbody.innerHTML = rows
    .map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.temperature}</td>
        <td>${r.humidity}</td>
        <td>${r.created_at}</td>
      </tr>
    `)
    .join("");
}

function updateTemperatureChart(rows) {
  const labels = rows.map(r => r.created_at);
  const temps = rows.map(r => Number(r.temperature));
  const canvas = document.getElementById("tempChart");

  if (!temperatureChart) {
    temperatureChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Temperature (°C)",
            data: temps,
            borderWidth: 2,
          },
        ],
      },
    });
    return;
  }

  temperatureChart.data.labels = labels;
  temperatureChart.data.datasets[0].data = temps;
  temperatureChart.update();
}

async function refreshDashboard() {
  try {
    const [latest, history] = await Promise.all([
      getLatestReading(),
      getReadingHistory(),
    ]);

    updateLatestCard(latest);
    updateTable(history);
    updateTemperatureChart(history);
  } catch (err) {
    console.error("Dashboard update failed:", err);
  }
}

refreshDashboard();
setInterval(refreshDashboard, 5000);
