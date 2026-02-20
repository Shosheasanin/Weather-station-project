const BASE_URL = "http://localhost:3001";
// Google Charts
google.charts.load("current", { packages: ["corechart"] });

google.charts.setOnLoadCallback(() => {
  refreshDashboard();
  setInterval(refreshDashboard, 5000);
});


// API CALLS

async function getLatestReading() {
  const res = await fetch(`${BASE_URL}/api/readings/latest`);
  if (!res.ok) throw new Error("Failed to fetch latest reading");
  return res.json();
}

async function getReadingHistory() {
  const res = await fetch(`${BASE_URL}/api/readings/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}


// UI UPDATE 

function updateLatestCard(data) {
  document.getElementById("temp").textContent =
    data?.temperature ?? "--";

  document.getElementById("hum").textContent =
    data?.humidity ?? "--";

  document.getElementById("time").textContent =
    data?.created_at
      ? new Date(data.created_at).toLocaleString()
      : "--";
}

function updateTable(rows) {
  const tbody = document.getElementById("rows");

  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td>${r.id}</td>
        <td>${r.temperature}</td>
        <td>${r.humidity}</td>
        <td>${new Date(r.created_at).toLocaleString()}</td>
      </tr>
    `
    )
    .join("");
}

// G CHART F

function updateTemperatureChart(rows) {
  const dataTable = new google.visualization.DataTable();

  dataTable.addColumn("string", "Time");
  dataTable.addColumn("number", "Temperature (°C)");

  rows.forEach((r) => {
    dataTable.addRow([
      new Date(r.created_at).toLocaleTimeString(),
      Number(r.temperature),
    ]);
  });

  const options = {
    title: "Temperature (Last 10 Readings)",
    curveType: "function",
    legend: { position: "bottom" },
    hAxis: { title: "Time" },
    vAxis: { title: "Temperature (°C)" },
  };

  const chart = new google.visualization.LineChart(
    document.getElementById("tempChart")
  );

  chart.draw(dataTable, options);
}

// DASHBOARD REFRESH

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