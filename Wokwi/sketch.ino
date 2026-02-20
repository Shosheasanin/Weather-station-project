#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

#define DHTPIN 23
#define DHTTYPE DHT22

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

//  CLOUD FLARE URL 
const char* SERVER_URL = "https://selective-populations-array-annotation.trycloudflare.com/api/readings";


DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200); #Start serial communication with the computer at 115200 bits per second
  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(300); #Wait 0.3 seconds before checking WiFi status again
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("DHT read failed");
    delay(5000); #Wait 5 seconds before trying to read the sensor again
    return;
  }

  Serial.printf("Temp: %.1f | Hum: %.1f\n", temp, hum);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String json =
      "{"
      "\"temperature\":" + String(temp, 1) + ","
      "\"humidity\":" + String(hum, 1) +
      "}";

    int httpCode = http.POST(json);
    String response = http.getString();

    Serial.printf("POST code: %d\n", httpCode);
    Serial.println(response);

    http.end();
  }

  // delay(20000); // send every 20 seconds database gets 1 reading every 20 seconds
}