import { dashboardData } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
  // Theme Switching
  const themeSelector = document.getElementById('theme-selector');
  themeSelector.addEventListener('change', (e) => {
    document.body.dataset.pal = e.target.value;
  });

  // Utility to set text content
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // Convert wind degrees to cardinal direction
  const getWindDirection = (deg) => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
  };

  // Set today's date in header
  const headerTime = document.getElementById('header-time');
  if (headerTime) {
    const today = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    headerTime.textContent = today.toLocaleDateString('it-IT', options) + " · " + today.getHours().toString().padStart(2, '0') + ":" + today.getMinutes().toString().padStart(2, '0');
  }

  // Populate static data (Sessions and Maps)
  const populateStaticData = () => {
    const mapsGrid = document.getElementById('maps-grid');
    if (mapsGrid) {
      mapsGrid.innerHTML = '';
      dashboardData.maps.forEach(map => {
        const item = document.createElement('div');
        item.className = 'map-item';
        
        const img = document.createElement('img');
        img.src = map.src;
        img.alt = map.label;
        img.loading = "lazy";
        
        const lbl = document.createElement('div');
        lbl.className = `k-label mt-2 ${map.highlight ? 'accent-color' : ''}`;
        lbl.textContent = map.label;
        
        item.appendChild(img);
        item.appendChild(lbl);
        mapsGrid.appendChild(item);
      });
    }

    const sessionsList = document.getElementById('sessions-list');
    if (sessionsList) {
      sessionsList.innerHTML = '';
      dashboardData.sessions.forEach(sess => {
        const row = document.createElement('div');
        row.className = 'session-row';
        row.innerHTML = `<span>${sess.date} · ${sess.spot}</span> <span>${sess.duration} · ${sess.waves} onde</span>`;
        sessionsList.appendChild(row);
      });
    }
    
    // Set static tide info
    setText('tide-info', dashboardData.mainSpot.tideInfo);
  };

  populateStaticData();

  // Load Real Data from Open-Meteo
  const loadRealData = async () => {
    try {
      setText('summary', "Recupero dati in corso...");
      setText('verdict', "...");

      const lat = 45.4475; // Punta Sabbioni
      const lon = 12.4253;

      // Fetch Marine Data (Wave)
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period&timezone=auto`;
      const marineRes = await fetch(marineUrl);
      const marineData = await marineRes.json();

      // Fetch Weather Data (Wind & Temp)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=auto&wind_speed_unit=kn`;
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();

      // Find current hour index
      const now = new Date();
      now.setMinutes(0, 0, 0); // round to nearest hour
      const currentIsoTime = now.toISOString().slice(0, 14) + "00"; // YYYY-MM-DDTHH:00
      
      let currentIndex = marineData.hourly.time.findIndex(t => t.startsWith(currentIsoTime.slice(0, 13)));
      if (currentIndex === -1) currentIndex = 0; // fallback

      // Extract current variables
      const cWaveHeight = marineData.hourly.wave_height[currentIndex] || 0;
      const cWavePeriod = marineData.hourly.wave_period[currentIndex] || 0;
      const cWaveDirDeg = marineData.hourly.wave_direction[currentIndex] || 0;
      const cWaveDirStr = getWindDirection(cWaveDirDeg);

      const cWindSpeed = weatherData.hourly.wind_speed_10m[currentIndex] || 0;
      const cWindDirDeg = weatherData.hourly.wind_direction_10m[currentIndex] || 0;
      const cWindDirStr = getWindDirection(cWindDirDeg);
      const cTemp = weatherData.hourly.temperature_2m[currentIndex] || 0;

      // Update DOM
      setText('wave-val', cWaveHeight.toFixed(1));
      setText('period-val', cWavePeriod.toFixed(1));
      setText('wave-dir', cWaveDirStr);
      setText('wave-deg', cWaveDirDeg + "°");
      
      setText('wind-speed', Math.round(cWindSpeed) + " kn");
      setText('wind-dir', cWindDirStr);
      
      setText('air-temp', Math.round(cTemp));
      // Water temp is not available in basic weather, we'll keep a simulated one
      setText('water-temp', Math.round(cTemp) + 2); 

      // Verdict logic (simplistic)
      let rating = 4;
      if (cWaveHeight > 0.5) rating += 2;
      if (cWavePeriod > 6) rating += 2;
      // Offshore logic (NE to NW for Punta Sabbioni is roughly offshore/cross-off)
      if (cWindDirDeg > 270 || cWindDirDeg < 90) rating += 2;
      
      rating = Math.min(10, rating);
      const verdict = rating >= 7 ? "SÌ" : (rating >= 5 ? "FORSE" : "NO");
      
      setText('verdict', verdict);
      setText('rating-val', rating);
      setText('summary', `Dati LIVE: Onda a ${cWaveHeight.toFixed(1)}m, periodo ${cWavePeriod.toFixed(1)}s. Vento a ${Math.round(cWindSpeed)}kn.`);
      
      const ratingBar = document.getElementById('rating-bar');
      if (ratingBar) {
        ratingBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
          const block = document.createElement('div');
          block.className = `block ${i >= rating ? 'empty' : ''}`;
          ratingBar.appendChild(block);
        }
      }

      // Rotate Arrows
      const waveArrow = document.getElementById('wave-arrow');
      if (waveArrow) {
        waveArrow.style.transform = `rotate(${cWaveDirDeg}deg)`;
      }
      const windArrow = document.getElementById('wind-arrow');
      if (windArrow) {
        windArrow.style.transform = `rotate(${cWindDirDeg}deg)`;
      }

      // Populate Compare Table (simulating other spots based on main spot)
      const spotTable = document.getElementById('spot-table');
      if (spotTable) {
        spotTable.innerHTML = '';
        const spots = [
          { name: "Punta Sabbioni", wave: cWaveHeight, wind: cWindSpeed, crowd: 4, rating: rating, isBest: true },
          { name: "Camping Mediterraneo", wave: cWaveHeight * 0.8, wind: cWindSpeed * 1.1, crowd: 0, rating: Math.max(0, rating - 2), isBest: false },
          { name: "Pizzeria Soleado", wave: cWaveHeight * 0.7, wind: cWindSpeed * 1.2, crowd: 2, rating: Math.max(0, rating - 3), isBest: false }
        ];

        spots.forEach(spot => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="${spot.isBest ? 'font-weight: 800' : ''}">${spot.name}</td>
            <td>${spot.wave.toFixed(1)} m</td>
            <td>${cWavePeriod.toFixed(1)} s</td>
            <td>${cWindDirStr} ${Math.round(spot.wind)} kn</td>
            <td>${spot.crowd}</td>
            <td><span class="tag ${spot.rating >= 6 ? 'tag-accent' : 'tag-neutral'}">${spot.rating}</span></td>
          `;
          spotTable.appendChild(tr);
        });
      }

      // Calculate 7-day forecast chart (find max wave height per day)
      const forecastBars = document.getElementById('forecast-bars');
      if (forecastBars && marineData.hourly.time.length > 0) {
        forecastBars.innerHTML = '';
        const daysMap = new Map();
        
        marineData.hourly.time.forEach((t, i) => {
          const date = new Date(t);
          const dayStr = date.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();
          const waveH = marineData.hourly.wave_height[i] || 0;
          
          if (!daysMap.has(dayStr)) {
            daysMap.set(dayStr, { height: waveH, index: i });
          } else {
            if (waveH > daysMap.get(dayStr).height) {
              daysMap.set(dayStr, { height: waveH, index: i });
            }
          }
        });

        // Get first 7 days
        const daysArray = Array.from(daysMap.entries()).slice(0, 7);
        let maxGlobal = 0;
        let bestDay = "";
        
        daysArray.forEach(([day, data]) => {
          if (data.height > maxGlobal) {
            maxGlobal = data.height;
            bestDay = day;
          }
        });

        daysArray.forEach(([day, data]) => {
          const col = document.createElement('div');
          col.className = 'bar-col';
          
          // scale relative to 2 meters max
          const heightPercent = Math.min((data.height / 2.0) * 100, 100);
          const type = data.height === maxGlobal ? 'best' : (data.height > 0.5 ? 'neutral' : 'low');
          
          const fill = document.createElement('div');
          fill.className = `bar-fill ${type}`;
          fill.style.height = `${Math.max(10, heightPercent)}%`;
          
          const label = document.createElement('div');
          label.className = `bar-label ${type}`;
          label.textContent = `${day.substring(0, 3)} ${data.height.toFixed(1)}`;
          
          col.appendChild(fill);
          col.appendChild(label);
          forecastBars.appendChild(col);
        });

        setText('best-forecast', `PICCO: ${bestDay} (${maxGlobal.toFixed(1)}m)`);
      }

    } catch (e) {
      console.error("API Fetch Error:", e);
      setText('summary', "Errore nel recupero dati dalle API online. Mostro i dati offline.");
      // Fallback to static mockup
      setText('verdict', dashboardData.mainSpot.verdict);
    }
  };

  loadRealData();
});
