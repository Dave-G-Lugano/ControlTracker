const companiesByTeam = {
    "Lugano": ["TPL", "ARL", "APL", "SNL", "AMSA", "FLP"],
    "Bellinzona": ["FART", "APB", "ABL", "BPB"]
};

let timerInterval = null;
let startTime = 0;
let elapsedTime = 0;
// Usiamo la stessa chiave della versione mobile per sincronia (se usati nello stesso browser)
let sessions = JSON.parse(localStorage.getItem('workSessions_v2')) || [];

const timerDisplay = document.getElementById('timer');
const mainBtn = document.getElementById('main-btn');
const btnIcon = mainBtn.querySelector('.btn-icon');
const btnText = mainBtn.querySelector('.btn-text');
const teamSelect = document.getElementById('team-select');
const companySelect = document.getElementById('company-select');
const statsContainer = document.getElementById('stats-container');
const historyList = document.getElementById('history-list');
const resetBtn = document.getElementById('reset-data');

// Inizializzazione
teamSelect.addEventListener('change', updateCompanies);
updateCompanies();
checkRunningSession(); // Controlla se c'era un controllo attivo
updateUI();

mainBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', clearData);

function checkRunningSession() {
    const active = JSON.parse(localStorage.getItem('activeSession'));
    if (active) {
        teamSelect.value = active.team;
        updateCompanies();
        companySelect.value = active.company;
        startTime = active.startTime;

        timerInterval = setInterval(updateTimerDisplay, 100);
        mainBtn.classList.remove('btn-start');
        mainBtn.classList.add('btn-stop');
        btnIcon.textContent = '■';
        btnText.textContent = 'FERMA CONTROLLO';
        teamSelect.disabled = true;
        companySelect.disabled = true;
    }
}

function updateCompanies() {
    const team = teamSelect.value;
    const list = companiesByTeam[team];
    if (!list) return;

    companySelect.innerHTML = '';
    list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        companySelect.appendChild(opt);
    });
}

function toggleTimer() {
    if (timerInterval) stopTimer();
    else startTimer();
}

function startTimer() {
    startTime = Date.now();
    // Salva lo stato immediatamente
    localStorage.setItem('activeSession', JSON.stringify({
        startTime: startTime,
        team: teamSelect.value,
        company: companySelect.value
    }));

    timerInterval = setInterval(updateTimerDisplay, 100);
    mainBtn.classList.remove('btn-start');
    mainBtn.classList.add('btn-stop');
    btnIcon.textContent = '■';
    btnText.textContent = 'FERMA CONTROLLO';
    teamSelect.disabled = true;
    companySelect.disabled = true;
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;

    const active = JSON.parse(localStorage.getItem('activeSession'));
    const finalTime = Date.now() - startTime;

    if (finalTime > 1000 && active) {
        saveSession(active.team, active.company, finalTime);
    }

    localStorage.removeItem('activeSession');
    elapsedTime = 0;
    updateTimerDisplay();
    mainBtn.classList.remove('btn-stop');
    mainBtn.classList.add('btn-start');
    btnIcon.textContent = '▶';
    btnText.textContent = 'INIZIA CONTROLLO';
    teamSelect.disabled = false;
    companySelect.disabled = false;
    updateUI();
}

function updateTimerDisplay() {
    if (timerInterval) elapsedTime = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function saveSession(team, company, duration) {
    const session = {
        id: Date.now(),
        team: team,
        company: company,
        duration: duration,
        date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    };
    sessions.unshift(session);
    if (sessions.length > 50) sessions.pop();
    localStorage.setItem('workSessions_v2', JSON.stringify(sessions));
}

function updateUI() {
    updateStats();
    updateHistory();
}

function updateStats() {
    const totals = {};
    sessions.forEach(s => {
        const key = `${s.team} - ${s.company}`;
        totals[key] = (totals[key] || 0) + s.duration;
    });

    statsContainer.innerHTML = '';
    const keys = Object.keys(totals);
    if (keys.length === 0) {
        statsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #000; font-size: 0.9rem; font-weight: 700;">Nessun dato ancora</p>';
        return;
    }

    keys.sort().forEach(key => {
        const hours = (totals[key] / (1000 * 60 * 60)).toFixed(2);
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `<div class="stat-name">${key}</div><div class="stat-value">${hours}h</div>`;
        statsContainer.appendChild(card);
    });
}

function updateHistory() {
    historyList.innerHTML = '';
    if (sessions.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #000; font-size: 0.9rem; font-weight: 700;">Nessuna sessione registrata</p>';
        return;
    }

    sessions.slice(0, 10).forEach((s, index) => {
        const totalMins = Math.floor(s.duration / (1000 * 60));
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="h-team">${s.team}</div>
                <div class="h-company">${s.company}</div>
                <div class="h-date">${s.date}</div>
            </div>
            <div class="history-actions">
                <span class="history-duration">${durationStr}</span>
                <button class="action-btn" onclick="editSession(${index})">✏️</button>
                <button class="action-btn delete-btn" onclick="deleteSession(${index})">🗑️</button>
            </div>`;
        historyList.appendChild(item);
    });
}

window.editSession = function (index) {
    const s = sessions[index];
    const oldMins = Math.floor(s.duration / (1000 * 60));
    const newMins = prompt(`Modifica minuti per ${s.company} (${s.date}):`, oldMins);
    if (newMins !== null && !isNaN(newMins)) {
        sessions[index].duration = parseInt(newMins) * 60 * 1000;
        localStorage.setItem('workSessions_v2', JSON.stringify(sessions));
        updateUI();
    }
};

window.deleteSession = function (index) {
    if (confirm('Vuoi eliminare questa sessione?')) {
        sessions.splice(index, 1);
        localStorage.setItem('workSessions_v2', JSON.stringify(sessions));
        updateUI();
    }
};

function clearData() {
    if (confirm('Sei sicuro di voler cancellare tutti i dati?')) {
        sessions = [];
        localStorage.removeItem('workSessions_v2');
        updateUI();
    }
}
