// ---------------------------------------------------------------
// Currency Converter - script.js
// All rates are "units of currency per 1 USD" (USD is the base).
// Convert A -> B:  amount / rate[A] * rate[B]
// ---------------------------------------------------------------

// Sample (offline) rates - used if the live API cannot be reached.
const CURRENCIES = [
  { country: "Japan",                 code: "JPY", flag: "\u{1F1EF}\u{1F1F5}", perUsd: 150.0 },
  { country: "India",                 code: "INR", flag: "\u{1F1EE}\u{1F1F3}", perUsd: 84.0 },
  { country: "US",                    code: "USD", flag: "\u{1F1FA}\u{1F1F8}", perUsd: 1.0 },
  { country: "UAE",                   code: "AED", flag: "\u{1F1E6}\u{1F1EA}", perUsd: 3.6725 },
  { country: "China",                 code: "CNY", flag: "\u{1F1E8}\u{1F1F3}", perUsd: 7.2 },
  { country: "Korea",                 code: "KRW", flag: "\u{1F1F0}\u{1F1F7}", perUsd: 1380.0 },
  { country: "UK",                    code: "GBP", flag: "\u{1F1EC}\u{1F1E7}", perUsd: 0.77 },
  { country: "Africa (South Africa)", code: "ZAR", flag: "\u{1F1FF}\u{1F1E6}", perUsd: 18.0 },
  { country: "Egypt",                 code: "EGP", flag: "\u{1F1EA}\u{1F1EC}", perUsd: 49.0 },
  { country: "Russia",                code: "RUB", flag: "\u{1F1F7}\u{1F1FA}", perUsd: 95.0 },
  { country: "Norway",                code: "NOK", flag: "\u{1F1F3}\u{1F1F4}", perUsd: 10.8 },
];

const API_URL = "https://open.er-api.com/v6/latest/USD";

// Working copy of the rates: code -> perUsd
const rates = {};
CURRENCIES.forEach((c) => (rates[c.code] = c.perUsd));

// ---------- DOM ----------
const amountEl = document.getElementById("amount");
const fromEl = document.getElementById("fromCurrency");
const toEl = document.getElementById("toCurrency");
const swapBtn = document.getElementById("swapBtn");
const refreshBtn = document.getElementById("refreshBtn");
const errorEl = document.getElementById("error");
const resultFromEl = document.getElementById("resultFrom");
const resultToEl = document.getElementById("resultTo");
const resultRateEl = document.getElementById("resultRate");
const statusEl = document.getElementById("status");
const ratesTitleEl = document.getElementById("ratesTitle");
const ratesListEl = document.getElementById("ratesList");

// ---------- Helpers ----------
function getCurrency(code) {
  return CURRENCIES.find((c) => c.code === code);
}

function convert(amount, fromCode, toCode) {
  return (amount / rates[fromCode]) * rates[toCode];
}

function format(value) {
  // Show more decimals for very small values so they don't look like 0.00
  const digits = Math.abs(value) < 1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value);
}

function fillSelects() {
  CURRENCIES.forEach((c) => {
    const label = `${c.flag} ${c.country} (${c.code})`;
    fromEl.add(new Option(label, c.code));
    toEl.add(new Option(label, c.code));
  });
  fromEl.value = "USD";
  toEl.value = "INR";
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

// ---------- Rendering ----------
function update() {
  const from = fromEl.value;
  const to = toEl.value;
  const amount = parseFloat(amountEl.value);

  if (amountEl.value.trim() === "" || isNaN(amount)) {
    showError("Please enter an amount.");
    resultFromEl.innerHTML = "&nbsp;";
    resultToEl.innerHTML = "&nbsp;";
  } else if (amount < 0) {
    showError("Amount cannot be negative.");
    resultFromEl.innerHTML = "&nbsp;";
    resultToEl.innerHTML = "&nbsp;";
  } else {
    showError("");
    const result = convert(amount, from, to);
    resultFromEl.textContent = `${format(amount)} ${from} =`;
    resultToEl.textContent = `${format(result)} ${to}`;
  }

  const unitRate = convert(1, from, to);
  resultRateEl.textContent = `1 ${from} = ${unitRate.toFixed(4)} ${to}`;

  renderRatesList(from);
}

function renderRatesList(fromCode) {
  const from = getCurrency(fromCode);
  ratesTitleEl.textContent = `1 ${from.code} (${from.country}) equals`;
  ratesListEl.innerHTML = "";

  CURRENCIES.filter((c) => c.code !== fromCode).forEach((c) => {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.textContent = `${c.flag} ${c.country} (${c.code})`;

    const value = document.createElement("span");
    value.className = "value";
    value.textContent = format(convert(1, fromCode, c.code));

    li.append(name, value);
    ratesListEl.appendChild(li);
  });
}

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = "status" + (type ? " " + type : "");
}

// ---------- Live rates ----------
async function loadLiveRates() {
  setStatus("Loading rates...", "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(API_URL, { signal: controller.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);

    const data = await response.json();
    if (data.result !== "success" || !data.rates) throw new Error("Bad data");

    CURRENCIES.forEach((c) => {
      if (typeof data.rates[c.code] === "number") {
        rates[c.code] = data.rates[c.code];
      }
    });

    const when = data.time_last_update_utc
      ? data.time_last_update_utc.slice(0, 16)
      : new Date().toUTCString().slice(0, 16);
    setStatus(`Live rates (updated ${when})`, "live");
  } catch (err) {
    // Fall back to the sample rates already in `rates`
    CURRENCIES.forEach((c) => (rates[c.code] = c.perUsd));
    setStatus("Offline - using sample rates", "offline");
  } finally {
    clearTimeout(timer);
    update();
  }
}

// ---------- Events ----------
amountEl.addEventListener("input", update);
fromEl.addEventListener("change", update);
toEl.addEventListener("change", update);

swapBtn.addEventListener("click", () => {
  const temp = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = temp;
  update();
});

refreshBtn.addEventListener("click", loadLiveRates);

// ---------- Start ----------
fillSelects();
update();
loadLiveRates();
