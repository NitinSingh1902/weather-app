/* ==========================================================================
   SkyCast Weather App
   API: Open-Meteo (Free, No API Key Required)
   ========================================================================== */

// ==========================================================================
// 1. App State & Weather Code Definitions
// ==========================================================================
let currentUnit = 'c'; // 'c' for Celsius, 'f' for Fahrenheit
let weatherData = null;
let currentCity = 'London';
let currentCountry = 'UK';
let manualThemeOverride = false;
let rainNotificationsEnabled = localStorage.getItem('skyPulse_rain_notifications') === 'true';
let currentRainAlert = null;
const seenAlerts = new Set();

const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
const thunderstormCodes = [95, 96, 99];
const heavyRainCodes = [65, 67, 82, 95, 96, 99];

// WMO Weather code lookup (icon, description, rain properties)
const weatherMap = {
  0:  { desc: 'Clear Sky', icon: '☀️', isRain: false },
  1:  { desc: 'Mainly Clear', icon: '🌤️', isRain: false },
  2:  { desc: 'Partly Cloudy', icon: '⛅', isRain: false },
  3:  { desc: 'Overcast', icon: '☁️', isRain: false },
  45: { desc: 'Foggy', icon: '🌫️', isRain: false },
  48: { desc: 'Depositing Rime Fog', icon: '🌫️', isRain: false },
  51: { desc: 'Light Drizzle', icon: '🌦️', isRain: true, rainType: 'Light Drizzle' },
  53: { desc: 'Moderate Drizzle', icon: '🌧️', isRain: true, rainType: 'Moderate Drizzle' },
  55: { desc: 'Dense Drizzle', icon: '🌧️', isRain: true, rainType: 'Dense Drizzle' },
  56: { desc: 'Light Freezing Drizzle', icon: '🌨️', isRain: true, rainType: 'Light Freezing Drizzle' },
  57: { desc: 'Dense Freezing Drizzle', icon: '🌨️', isRain: true, rainType: 'Dense Freezing Drizzle' },
  61: { desc: 'Slight Rain', icon: '🌧️', isRain: true, rainType: 'Slight Rain' },
  63: { desc: 'Moderate Rain', icon: '🌧️', isRain: true, rainType: 'Moderate Rain' },
  65: { desc: 'Heavy Rain', icon: '🌧️', isRain: true, rainType: 'Heavy Torrential Rain' },
  66: { desc: 'Light Freezing Rain', icon: '🌨️', isRain: true, rainType: 'Light Freezing Rain' },
  67: { desc: 'Heavy Freezing Rain', icon: '🌨️', isRain: true, rainType: 'Heavy Freezing Rain' },
  71: { desc: 'Slight Snow', icon: '❄️', isRain: false },
  73: { desc: 'Moderate Snow', icon: '❄️', isRain: false },
  75: { desc: 'Heavy Snow', icon: '❄️', isRain: false },
  77: { desc: 'Snow Grains', icon: '❄️', isRain: false },
  80: { desc: 'Slight Rain Showers', icon: '🌦️', isRain: true, rainType: 'Slight Rain Showers' },
  81: { desc: 'Moderate Rain Showers', icon: '🌧️', isRain: true, rainType: 'Moderate Rain Showers' },
  82: { desc: 'Violent Rain Showers', icon: '⛈️', isRain: true, rainType: 'Violent Rain Showers' },
  85: { desc: 'Slight Snow Showers', icon: '🌨️', isRain: false },
  86: { desc: 'Heavy Snow Showers', icon: '🌨️', isRain: false },
  95: { desc: 'Thunderstorm', icon: '🌩️', isRain: true, rainType: 'Thunderstorm with Rain' },
  96: { desc: 'Thunderstorm with Slight Hail', icon: '⛈️', isRain: true, rainType: 'Thunderstorm with Hail' },
  99: { desc: 'Thunderstorm with Heavy Hail', icon: '⛈️', isRain: true, rainType: 'Severe Thunderstorm with Hail' }
};

// ==========================================================================
// 2. DOM Elements
// ==========================================================================
const searchForm         = document.getElementById('search-form');
const cityInput          = document.getElementById('city-input');
const locationBtn        = document.getElementById('location-btn');
const unitCelsiusBtn     = document.getElementById('unit-celsius');
const unitFahrenheitBtn  = document.getElementById('unit-fahrenheit');
const themeToggleBtn     = document.getElementById('theme-toggle');

// Bell Widget & Notifications
const cornerBellBtn      = document.getElementById('corner-bell-btn');
const cornerBellBadge    = document.getElementById('corner-bell-badge');
const cornerNotifyPanel  = document.getElementById('corner-notify-panel');
const cornerPanelClose   = document.getElementById('corner-panel-close');
const cornerPanelBody    = document.getElementById('corner-panel-body');
const pushPermissionBtn  = document.getElementById('push-permission-btn');
const toastContainer     = document.getElementById('toast-container');

// Main Weather Overview
const cityNameEl         = document.getElementById('city-name');
const dateTimeEl         = document.getElementById('current-date-time');
const tempEl             = document.getElementById('temperature');
const conditionEl        = document.getElementById('weather-condition');
const weatherIconEl      = document.getElementById('weather-icon');
const feelsLikeEl        = document.getElementById('feels-like');
const tempHighEl         = document.getElementById('temp-high');
const tempLowEl          = document.getElementById('temp-low');

// Detailed Weather Metrics
const humidityEl         = document.getElementById('humidity');
const windSpeedEl        = document.getElementById('wind-speed');
const windDirEl          = document.getElementById('wind-direction');
const uvIndexEl          = document.getElementById('uv-index');
const pressureEl         = document.getElementById('pressure');
const precipEl           = document.getElementById('precipitation');
const sunriseEl          = document.getElementById('sunrise');
const sunsetEl           = document.getElementById('sunset');

// Containers & Canvas
const hourlyContainer    = document.getElementById('hourly-container');
const dailyContainer     = document.getElementById('daily-container');
const currentWeatherCard = document.getElementById('current-weather');
const rainCanvas         = document.getElementById('rain-canvas');

// ==========================================================================
// 3. App Initialization & Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  autoSetTimeTheme();
  updateNotificationButtonUI();
  getUserLocationOnLoad();
});

function setupEventListeners() {
  // Search Form Submit
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
      getWeatherByCity(city);
      cityInput.value = '';
    }
  });

  // Current GPS Location Button
  locationBtn.addEventListener('click', getUserLocation);

  // Temperature Unit Toggles
  unitCelsiusBtn.addEventListener('click', () => switchUnit('c'));
  unitFahrenheitBtn.addEventListener('click', () => switchUnit('f'));

  // Day/Night Manual Theme Toggle
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleManualTheme);
  }

  // Bell Dropdown Notification Panel
  if (cornerBellBtn) {
    cornerBellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (cornerNotifyPanel) {
        const willOpen = cornerNotifyPanel.classList.contains('hidden');
        cornerNotifyPanel.classList.toggle('hidden');
        if (willOpen) markCurrentAlertAsSeen();
      }
    });
  }

  if (cornerPanelClose) {
    cornerPanelClose.addEventListener('click', (e) => {
      e.stopPropagation();
      if (cornerNotifyPanel) {
        cornerNotifyPanel.classList.add('hidden');
        markCurrentAlertAsSeen();
      }
    });
  }

  if (pushPermissionBtn) {
    pushPermissionBtn.addEventListener('click', toggleRainNotifications);
  }

  // Close notification panel when clicking outside
  document.addEventListener('click', (e) => {
    if (cornerNotifyPanel && !cornerNotifyPanel.classList.contains('hidden')) {
      if (!cornerNotifyPanel.contains(e.target) && !cornerBellBtn.contains(e.target)) {
        cornerNotifyPanel.classList.add('hidden');
      }
    }
  });
}

// ==========================================================================
// 4. Weather & Geocoding API Calls
// ==========================================================================

// Load user's location automatically on first visit
function getUserLocationOnLoad() {
  if (!navigator.geolocation) {
    getWeatherByCity('London');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchReverseGeocodeAndWeather(position.coords.latitude, position.coords.longitude);
    },
    (err) => {
      console.warn('Geolocation denied or unavailable. Loading London default.', err);
      getWeatherByCity('London');
    }
  );
}

// Manual GPS request via button
function getUserLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchReverseGeocodeAndWeather(position.coords.latitude, position.coords.longitude);
    },
    () => {
      alert('Unable to retrieve location. Permission denied.');
    }
  );
}

// Convert latitude and longitude to city name, then fetch weather data
async function fetchReverseGeocodeAndWeather(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    const loc = await res.json();
    currentCity = loc.city || loc.locality || 'Your Location';
    currentCountry = loc.countryName || '';
  } catch {
    currentCity = 'Your Location';
    currentCountry = '';
  }
  await fetchWeatherData(lat, lon);
}

// Search for weather data by city name using Open-Meteo Geocoding
async function getWeatherByCity(cityName) {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    const res = await fetch(geoUrl);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      alert(`City "${cityName}" not found! Please try another city.`);
      return;
    }

    const location = data.results[0];
    currentCity = location.name;
    currentCountry = location.country || '';

    await fetchWeatherData(location.latitude, location.longitude);
  } catch (error) {
    console.error('Error fetching weather:', error);
    alert('Failed to get weather data. Please check your internet connection.');
  }
}

// Fetch complete current, hourly, and daily weather forecast
async function fetchWeatherData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;

  const res = await fetch(url);
  weatherData = await res.json();

  // Auto theme based on day/night flag
  if (weatherData.current && weatherData.current.is_day !== undefined) {
    autoSetTimeTheme(weatherData.current.is_day);
  }

  displayWeather();
}

// ==========================================================================
// 5. Weather UI Rendering
// ==========================================================================

// Display all weather metrics on the page
function displayWeather() {
  if (!weatherData) return;

  const current = weatherData.current;
  const daily = weatherData.daily;
  const hourly = weatherData.hourly;
  const cond = weatherMap[current.weather_code] || { desc: 'Clear', icon: '☀️' };

  // Main Section
  cityNameEl.textContent = `${currentCity}${currentCountry ? ', ' + currentCountry : ''}`;
  tempEl.textContent = `${formatTemp(current.temperature_2m)}°${currentUnit.toUpperCase()}`;
  conditionEl.textContent = `${cond.icon} ${cond.desc}`;
  weatherIconEl.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><text x='50%' y='60%' font-size='48' text-anchor='middle' dominant-baseline='middle'>${cond.icon}</text></svg>`;

  feelsLikeEl.textContent = `${formatTemp(current.apparent_temperature)}°${currentUnit.toUpperCase()}`;
  tempHighEl.textContent = `${formatTemp(daily.temperature_2m_max[0])}°${currentUnit.toUpperCase()}`;
  tempLowEl.textContent = `${formatTemp(daily.temperature_2m_min[0])}°${currentUnit.toUpperCase()}`;

  // Weather Details
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windSpeedEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  windDirEl.textContent = getWindDirection(current.wind_direction_10m);
  uvIndexEl.textContent = Math.round(daily.uv_index_max[0] || 0);
  pressureEl.textContent = `${Math.round(current.surface_pressure)} hPa`;
  precipEl.textContent = `${daily.precipitation_sum[0] || 0} mm`;

  // Sunrise and Sunset in 12-hour mode with AM/PM
  if (daily.sunrise && daily.sunrise[0]) sunriseEl.textContent = formatTime12(daily.sunrise[0], true);
  if (daily.sunset && daily.sunset[0]) sunsetEl.textContent = formatTime12(daily.sunset[0], true);

  // Rain Animation inside card, Hourly & Daily Forecasts, and Rain Alerts
  updateCurrentWeatherRainType(current.weather_code, current.precipitation);
  displayHourly(hourly);
  displayDaily(daily);
  processRainAlerts(hourly, current);
}

// Find index for the current/upcoming hour in the hourly forecast
function getRealTimeHourIndex(hourlyTimes, currentTimeStr) {
  if (!hourlyTimes || hourlyTimes.length === 0) return 0;

  if (currentTimeStr && currentTimeStr.length >= 13) {
    const currentHourPrefix = currentTimeStr.slice(0, 13);
    const matchedIdx = hourlyTimes.findIndex(t => t.startsWith(currentHourPrefix));
    if (matchedIdx !== -1) return matchedIdx;
  }

  const currentTs = Date.now();
  for (let i = 0; i < hourlyTimes.length; i++) {
    const t = new Date(hourlyTimes[i]).getTime();
    if (t >= currentTs - 30 * 60 * 1000) return i;
  }

  return 0;
}

// Render 24-hour forecast in 12-hour mode (e.g. 'Now', '1 PM', '2 PM')
function displayHourly(hourly) {
  hourlyContainer.innerHTML = '';
  if (!hourly || !hourly.time) return;

  const currentTimeStr = weatherData.current ? weatherData.current.time : null;
  const startIndex = getRealTimeHourIndex(hourly.time, currentTimeStr);

  for (let offset = 0; offset < 24; offset++) {
    const idx = startIndex + offset;
    if (idx >= hourly.time.length) break;

    const timeStr = hourly.time[idx];
    const timeLabel = (offset === 0) ? 'Now' : formatTime12(timeStr, false);
    const temp = formatTemp(hourly.temperature_2m[idx]);
    const cond = weatherMap[hourly.weather_code[idx]] || { icon: '☀️' };
    const pop = hourly.precipitation_probability ? hourly.precipitation_probability[idx] : 0;

    const item = document.createElement('div');
    item.className = 'hourly-item';
    item.innerHTML = `
      <span class="hourly-time">${timeLabel}</span>
      <span style="font-size: 1.8rem;">${cond.icon}</span>
      <span class="hourly-temp">${temp}°${currentUnit.toUpperCase()}</span>
      <span class="hourly-pop">💧 ${pop}%</span>
    `;
    hourlyContainer.appendChild(item);
  }
}

// Render 7-day daily forecast
function displayDaily(daily) {
  dailyContainer.innerHTML = '';
  if (!daily || !daily.time) return;

  const dailyTitleEl = document.querySelector('#daily-forecast h3');
  if (dailyTitleEl) {
    dailyTitleEl.textContent = `7-Day Forecast for ${currentCity}`;
  }

  for (let i = 0; i < 7; i++) {
    if (!daily.time[i]) break;

    const dateObj = new Date(daily.time[i] + 'T00:00:00');
    const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const minT = formatTemp(daily.temperature_2m_min[i]);
    const maxT = formatTemp(daily.temperature_2m_max[i]);
    const cond = weatherMap[daily.weather_code[i]] || { desc: 'Clear', icon: '☀️' };
    const precip = daily.precipitation_sum ? daily.precipitation_sum[i] : 0;

    const row = document.createElement('div');
    row.className = 'daily-item';
    row.innerHTML = `
      <span class="daily-day">${dayName}</span>
      <span class="daily-date">${dateStr}</span>
      <span style="font-size: 1.6rem;">${cond.icon}</span>
      <span class="daily-condition">${cond.desc} ${precip > 0 ? '• 💧' + precip + 'mm' : ''}</span>
      <span class="daily-temp-range">Low: ${minT}° / High: ${maxT}°</span>
    `;
    dailyContainer.appendChild(row);
  }
}

// ==========================================================================
// 6. Card Rain Particle Animation (#current-weather Canvas)
// ==========================================================================
let rainCtx = rainCanvas ? rainCanvas.getContext('2d') : null;
let rainAnimationId = null;
let cardRainActive = false;
let cardRainProfile = null;
let raindrops = [];
let splashes = [];
let canvasWidth = 600;
let canvasHeight = 400;

function resizeRainCanvas() {
  if (!rainCanvas || !currentWeatherCard) return;
  const dpr = window.devicePixelRatio || 1;
  canvasWidth = currentWeatherCard.offsetWidth || 600;
  canvasHeight = currentWeatherCard.offsetHeight || 400;
  rainCanvas.width = canvasWidth * dpr;
  rainCanvas.height = canvasHeight * dpr;
  if (rainCtx) rainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeRainCanvas);

function getRainTypeDetails(code, precip = 0) {
  const isThunder = thunderstormCodes.includes(code);
  const isRainCode = rainCodes.includes(code);
  const mapped = weatherMap[code];

  if ((mapped && mapped.isRain) || isRainCode || precip > 0.1) {
    let rainType = mapped?.rainType;
    if (!rainType) {
      if (precip >= 5.0) rainType = 'Heavy Torrential Rain';
      else if (precip >= 2.0) rainType = 'Moderate Rain';
      else if (precip >= 0.5) rainType = 'Slight Rain';
      else rainType = 'Light Drizzle';
    }
    return { isRaining: true, rainType, icon: mapped?.icon || '🌧️', isThunderstorm: isThunder, precip };
  }
  return null;
}

function updateCurrentWeatherRainType(currentCode, currentPrecip) {
  const rainInfo = getRainTypeDetails(currentCode, currentPrecip);
  if (rainInfo && rainInfo.isRaining) {
    startCardRain(rainInfo);
  } else {
    stopCardRain();
  }
}

function getCardRainProfile(rainInfo) {
  const text = (rainInfo.rainType || '').toLowerCase();
  const precip = rainInfo.precip || 0;

  if (text.includes('heavy') || precip >= 4.0) {
    return { dropCount: 75, minSpeed: 7, maxSpeed: 11, minLength: 12, maxLength: 20, minThickness: 1.0, maxThickness: 1.4, windX: 0.8, minAlpha: 0.35, maxAlpha: 0.65, color: 'rgba(180, 230, 255, ALPHA)', hasSplashes: true, splashChance: 0.35, splashCount: 2 };
  }
  if (text.includes('moderate') || text.includes('showers') || precip >= 1.5) {
    return { dropCount: 55, minSpeed: 6, maxSpeed: 9.5, minLength: 10, maxLength: 16, minThickness: 0.9, maxThickness: 1.3, windX: 0.6, minAlpha: 0.3, maxAlpha: 0.55, color: 'rgba(180, 225, 255, ALPHA)', hasSplashes: true, splashChance: 0.25, splashCount: 1 };
  }
  return { dropCount: 40, minSpeed: 5, maxSpeed: 8, minLength: 7, maxLength: 13, minThickness: 0.8, maxThickness: 1.1, windX: 0.4, minAlpha: 0.25, maxAlpha: 0.45, color: 'rgba(190, 230, 255, ALPHA)', hasSplashes: true, splashChance: 0.15, splashCount: 1 };
}

class Raindrop {
  constructor(profile) {
    this.reset(profile, true);
  }
  reset(profile, randomY = false) {
    this.x = Math.random() * (canvasWidth + 60) - 30;
    this.y = randomY ? Math.random() * canvasHeight : -Math.random() * 30 - 5;
    this.speed = profile.minSpeed + Math.random() * (profile.maxSpeed - profile.minSpeed);
    this.length = profile.minLength + Math.random() * (profile.maxLength - profile.minLength);
    this.thickness = profile.minThickness + Math.random() * (profile.maxThickness - profile.minThickness);
    this.windX = profile.windX + (Math.random() * 0.3 - 0.15);
    this.alpha = profile.minAlpha + Math.random() * (profile.maxAlpha - profile.minAlpha);
  }
  update(profile) {
    this.x += this.windX;
    this.y += this.speed;
    if (this.y >= canvasHeight - 4) {
      if (profile.hasSplashes && Math.random() < profile.splashChance) {
        for (let i = 0; i < (profile.splashCount || 1); i++) {
          splashes.push(new Splash(this.x, canvasHeight - 2, profile));
        }
      }
      this.reset(profile);
    }
    if (this.x < -40 || this.x > canvasWidth + 40) this.reset(profile);
  }
  draw(ctx, profile) {
    ctx.strokeStyle = profile.color.replace('ALPHA', this.alpha.toFixed(2));
    ctx.lineWidth = this.thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.windX * (this.length / this.speed), this.y + this.length);
    ctx.stroke();
  }
}

class Splash {
  constructor(x, y, profile) {
    this.x = x;
    this.y = y;
    const angle = Math.PI * (0.75 + Math.random() * 0.5);
    const speed = 1.0 + Math.random() * 2.0;
    this.vx = Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1);
    this.vy = -Math.sin(angle) * speed;
    this.radius = 0.8 + Math.random() * 1.0;
    this.alpha = 0.6;
    this.decay = 0.05 + Math.random() * 0.04;
    this.color = profile.color;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2;
    this.alpha -= this.decay;
  }
  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.fillStyle = this.color.replace('ALPHA', this.alpha.toFixed(2));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function startCardRain(rainInfo) {
  if (!rainCanvas) return;
  if (!rainCtx) rainCtx = rainCanvas.getContext('2d');
  if (!rainCtx) return;

  cardRainProfile = getCardRainProfile(rainInfo);
  cardRainActive = true;
  resizeRainCanvas();
  rainCanvas.classList.add('active');

  raindrops = Array.from({ length: cardRainProfile.dropCount }, () => new Raindrop(cardRainProfile));
  splashes = [];

  if (!rainAnimationId) animateCardRainLoop();
}

function animateCardRainLoop() {
  if (!cardRainActive && raindrops.length === 0 && splashes.length === 0) {
    if (rainCtx) rainCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    rainAnimationId = null;
    return;
  }

  if (rainCtx && cardRainProfile) {
    rainCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    raindrops.forEach(drop => {
      drop.update(cardRainProfile);
      drop.draw(rainCtx, cardRainProfile);
    });
    for (let i = splashes.length - 1; i >= 0; i--) {
      const sp = splashes[i];
      sp.update();
      sp.draw(rainCtx);
      if (sp.alpha <= 0) splashes.splice(i, 1);
    }
  }

  rainAnimationId = cardRainActive ? requestAnimationFrame(animateCardRainLoop) : null;
}

function stopCardRain() {
  cardRainActive = false;
  if (rainCanvas) rainCanvas.classList.remove('active');
  raindrops = [];
  splashes = [];
  if (rainCtx) rainCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (rainAnimationId) {
    cancelAnimationFrame(rainAnimationId);
    rainAnimationId = null;
  }
}

// ==========================================================================
// 7. Rain Alert & Notification Engine
// ==========================================================================

// Predict incoming rain in next 24 hours or detect ongoing rain
function checkRainForecast(hourly, current) {
  if (!hourly || !hourly.time) return null;

  const currentTimeStr = current ? current.time : null;
  const startIndex = getRealTimeHourIndex(hourly.time, currentTimeStr);
  const currentCode = current ? current.weather_code : null;
  const currentPrecip = current ? (current.precipitation || 0) : 0;

  const isCurrentThunderstorm = thunderstormCodes.includes(currentCode);
  const isCurrentlyRaining = rainCodes.includes(currentCode) || currentPrecip > 0.1;

  // 1. Rain happening right now
  if (isCurrentlyRaining) {
    const condDesc = weatherMap[currentCode]?.desc || 'Rain';
    return {
      status: 'current',
      isThunderstorm: isCurrentThunderstorm,
      isHeavy: heavyRainCodes.includes(currentCode) || currentPrecip > 2,
      badge: isCurrentThunderstorm ? '⚡ THUNDERSTORM ALERT' : '🌧️ CURRENT RAIN',
      title: isCurrentThunderstorm ? `Thunderstorm Underway in ${currentCity}` : `Rain Falling in ${currentCity}`,
      desc: `Currently experiencing ${condDesc.toLowerCase()}. Keep an umbrella handy and stay dry!`,
      time: 'Now',
      probability: 100,
      hoursAway: 0
    };
  }

  // 2. Scan upcoming 24 hours
  const scanLimit = Math.min(startIndex + 24, hourly.time.length);
  for (let i = startIndex; i < scanLimit; i++) {
    const pop = hourly.precipitation_probability ? (hourly.precipitation_probability[i] || 0) : 0;
    const code = hourly.weather_code[i];
    const precipAmount = hourly.precipitation ? (hourly.precipitation[i] || 0) : 0;
    const isRain = rainCodes.includes(code);
    const isThunder = thunderstormCodes.includes(code);

    if (pop >= 40 || isRain || precipAmount > 0.2) {
      const timeStr = formatTime12(hourly.time[i], true);
      const hoursAway = i - startIndex;
      const condDesc = weatherMap[code]?.desc || (pop >= 70 ? 'Rain' : 'Rain Showers');
      const isHeavy = heavyRainCodes.includes(code) || pop >= 75 || precipAmount > 2.5;

      const timingPhrase = (hoursAway === 0)
        ? 'within the next hour'
        : `in ~${hoursAway} hour${hoursAway > 1 ? 's' : ''} (around ${timeStr})`;

      return {
        status: 'upcoming',
        isThunderstorm: isThunder,
        isHeavy,
        badge: isThunder ? '⚡ THUNDERSTORM WARNING' : (isHeavy ? '🌧️ HEAVY RAIN ALERT' : '💧 RAIN ALERT'),
        title: isThunder ? `Thunderstorm Expected ${timingPhrase}` : `Rain Expected ${timingPhrase}`,
        desc: `${condDesc} is forecasted around ${timeStr} with a ${pop}% chance of precipitation. Plan ahead and don't forget your umbrella!`,
        time: timeStr,
        probability: pop,
        hoursAway
      };
    }
  }

  return null;
}

// Process alert results and update UI & push notifications
function processRainAlerts(hourly, current) {
  const alert = checkRainForecast(hourly, current);
  currentRainAlert = alert;
  renderCornerNotification(alert);

  if (alert && rainNotificationsEnabled) {
    sendRainBrowserNotification(alert);
  }
}

// Clear bell alert badge when user opens dropdown
function markCurrentAlertAsSeen() {
  if (currentRainAlert) {
    seenAlerts.add(`${currentCity}_${currentRainAlert.time}_${currentRainAlert.probability}`);
  }
  cornerBellBtn?.classList.remove('has-alert');
  cornerBellBadge?.classList.add('hidden');
}

// Render notification dropdown panel and bell badge
function renderCornerNotification(alert) {
  if (!cornerBellBtn || !cornerPanelBody) return;

  if (alert) {
    const alertKey = `${currentCity}_${alert.time}_${alert.probability}`;
    const isSeen = seenAlerts.has(alertKey);

    if (!isSeen) {
      cornerBellBtn.classList.add('has-alert');
      if (cornerBellBadge) {
        cornerBellBadge.classList.remove('hidden');
        cornerBellBadge.textContent = '!';
      }
    } else {
      markCurrentAlertAsSeen();
    }

    cornerPanelBody.innerHTML = `
      <div class="panel-rain-card ${alert.isThunderstorm ? 'thunderstorm' : ''}">
        <div class="panel-rain-top">
          <span class="panel-rain-badge">${alert.badge}</span>
          <span class="panel-rain-time">${alert.time === 'Now' ? 'Ongoing' : 'At ' + alert.time}</span>
        </div>
        <div class="panel-rain-title">
          <span>${alert.isThunderstorm ? '⚡' : '🌧️'}</span>
          <span>${alert.title}</span>
        </div>
        <p class="panel-rain-desc">${alert.desc}</p>
        <div class="panel-rain-advice">
          <span>☔</span>
          <span>Rain chance: ${alert.probability}% in ${currentCity}</span>
        </div>
      </div>
    `;
  } else {
    markCurrentAlertAsSeen();
    cornerPanelBody.innerHTML = `
      <div class="panel-clear-card">
        <div class="panel-clear-icon">☀️</div>
        <h5 class="panel-clear-title">No Rain Expected</h5>
        <p class="panel-clear-desc">Clear and dry weather forecasted for the next 24 hours in ${currentCity}.</p>
      </div>
    `;
  }
}

// Toggle native desktop push notifications
async function toggleRainNotifications() {
  if (!('Notification' in window)) {
    showToast('Not Supported', 'Your browser does not support desktop notifications.', '⚠️');
    return;
  }

  if (Notification.permission === 'granted') {
    rainNotificationsEnabled = !rainNotificationsEnabled;
    localStorage.setItem('skyPulse_rain_notifications', rainNotificationsEnabled.toString());
    updateNotificationButtonUI();

    if (rainNotificationsEnabled) {
      showToast('Rain Alerts ON', 'You will receive notifications when rain is approaching!', '🔔');
      if (currentRainAlert) sendRainBrowserNotification(currentRainAlert, true);
      else showToast('Forecast Clear', 'No rain currently detected in upcoming hours.', '☀️');
    } else {
      showToast('Rain Alerts OFF', 'Rain notifications are paused.', '🔕');
    }
    return;
  }

  if (Notification.permission === 'denied') {
    showToast('Permission Blocked', 'Notifications are blocked in your browser settings. Please enable them to get rain alerts.', '⚠️');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      rainNotificationsEnabled = true;
      localStorage.setItem('skyPulse_rain_notifications', 'true');
      updateNotificationButtonUI();
      showToast('Notifications Active', 'Rain alerts are enabled for your location & searches!', '🔔');
      if (currentRainAlert) sendRainBrowserNotification(currentRainAlert, true);
    } else {
      showToast('Permission Denied', 'Notifications permission was not granted.', '⚠️');
    }
  } catch (err) {
    console.error('Error requesting notification permission:', err);
  }
}

function updateNotificationButtonUI() {
  const isGranted = (typeof Notification !== 'undefined') && Notification.permission === 'granted';
  const isActive = rainNotificationsEnabled && isGranted;

  if (pushPermissionBtn) {
    pushPermissionBtn.classList.toggle('active', isActive);
    pushPermissionBtn.textContent = isActive ? 'Active (ON)' : 'Turn ON';
    pushPermissionBtn.title = isActive ? 'Push alerts are ON. Click to turn off.' : 'Click to turn ON push alerts.';
  }
}

// Dispatch browser push notification with 30-min cooldown per city
function sendRainBrowserNotification(alert, forceNotify = false) {
  if (!alert || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const cooldownKey = `rain_notified_${currentCity}_${alert.time}`;
  const lastNotified = localStorage.getItem(cooldownKey);
  const now = Date.now();

  if (!forceNotify && lastNotified && (now - parseInt(lastNotified, 10)) < 30 * 60 * 1000) return;

  localStorage.setItem(cooldownKey, now.toString());

  try {
    const notif = new Notification(`🌧️ Rain Alert: ${currentCity}`, {
      body: `${alert.title}\n${alert.desc}`,
      icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="60%" font-size="48" text-anchor="middle" dominant-baseline="middle">🌧️</text></svg>',
      tag: 'rain-alert-' + currentCity
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    playChimeSound();
  } catch (err) {
    console.warn('Native notification error:', err);
  }
}

// Web Audio API Chime Alert
function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

// In-app Toast message popup
function showToast(title, message, icon = 'ℹ️', duration = 4000) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-body">
      <h5 class="toast-title">${title}</h5>
      <p class="toast-msg">${message}</p>
    </div>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ==========================================================================
// 8. Theme Switcher & Live Clock
// ==========================================================================

function autoSetTimeTheme(isDayFromApi = null) {
  if (manualThemeOverride) return;

  let isDayTime = false;
  if (isDayFromApi !== null && isDayFromApi !== undefined) {
    isDayTime = (isDayFromApi === 1);
  } else {
    const currentHour = new Date().getHours();
    isDayTime = currentHour >= 6 && currentHour < 18;
  }

  applyTheme(isDayTime);
}

function applyTheme(isDay) {
  document.body.classList.toggle('theme-day', isDay);
  document.body.classList.toggle('theme-night', !isDay);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = isDay ? '☀️ Day' : '🌙 Night';
  }
}

function toggleManualTheme() {
  manualThemeOverride = true;
  const isCurrentlyDay = document.body.classList.contains('theme-day');
  applyTheme(!isCurrentlyDay);
}

function updateDateTime() {
  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true };
  dateTimeEl.textContent = now.toLocaleDateString('en-US', options);
}

// ==========================================================================
// 9. Utility Helpers (Formatting & Unit Conversions)
// ==========================================================================

function switchUnit(unit) {
  currentUnit = unit;
  displayWeather();
}

// Format ISO timestamp or Date object to 12-hour mode with AM/PM (e.g. '5:41 PM' or '5 PM')
function formatTime12(timeInput, includeMinutes = true) {
  if (!timeInput) return '--';
  let hours, minutes;

  if (typeof timeInput === 'string') {
    const str = timeInput.includes('T') ? timeInput.split('T')[1] : timeInput;
    const parts = str.split(':');
    if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10))) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    } else {
      const d = new Date(timeInput);
      hours = d.getHours();
      minutes = d.getMinutes();
    }
  } else if (timeInput instanceof Date) {
    hours = timeInput.getHours();
    minutes = timeInput.getMinutes();
  } else {
    const d = new Date(timeInput);
    hours = d.getHours();
    minutes = d.getMinutes();
  }

  if (isNaN(hours)) return '--';

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  if (includeMinutes) {
    const minuteStr = String(minutes || 0).padStart(2, '0');
    return `${hour12}:${minuteStr} ${ampm}`;
  }
  return `${hour12} ${ampm}`;
}

function formatTemp(tempC) {
  if (tempC === null || tempC === undefined) return '--';
  if (currentUnit === 'f') {
    return Math.round((tempC * 9/5) + 32);
  }
  return Math.round(tempC);
}

function getWindDirection(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
}
