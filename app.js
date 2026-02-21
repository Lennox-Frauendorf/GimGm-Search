// ====== STORAGE MANAGEMENT ======
class StorageManager {
    constructor() {
        this.usersKey = 'gimgm_users';
        this.currentUserKey = 'gimgm_current_user';
        this.historyKey = 'gimgm_history_';
    }

    // Benutzer speichern/abrufen
    saveUser(user) {
        const users = this.getUsers();
        const existingIndex = users.findIndex(u => u.email === user.email);
        if (existingIndex >= 0) {
            users[existingIndex] = user;
        } else {
            users.push(user);
        }
        localStorage.setItem(this.usersKey, JSON.stringify(users));
    }

    getUsers() {
        return JSON.parse(localStorage.getItem(this.usersKey)) || [];
    }

    getUserByEmail(email) {
        return this.getUsers().find(u => u.email === email);
    }

    // Aktueller Benutzer
    setCurrentUser(user) {
        localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem(this.currentUserKey));
    }

    clearCurrentUser() {
        localStorage.removeItem(this.currentUserKey);
    }

    // Suchverlauf
    addToHistory(term) {
        const user = this.getCurrentUser();
        if (!user) return;

        const historyKey = this.historyKey + user.email;
        const history = JSON.parse(localStorage.getItem(historyKey)) || [];
        
        // Duplikate entfernen
        const filtered = history.filter(h => h.term !== term);
        
        // Neuer Eintrag am Anfang
        filtered.unshift({
            term: term,
            timestamp: new Date().toISOString()
        });

        // Max 50 Einträge
        if (filtered.length > 50) {
            filtered.pop();
        }

        localStorage.setItem(historyKey, JSON.stringify(filtered));
    }

    getHistory() {
        const user = this.getCurrentUser();
        if (!user) return [];
        
        const historyKey = this.historyKey + user.email;
        return JSON.parse(localStorage.getItem(historyKey)) || [];
    }

    deleteHistoryItem(term) {
        const user = this.getCurrentUser();
        if (!user) return;

        const historyKey = this.historyKey + user.email;
        const history = JSON.parse(localStorage.getItem(historyKey)) || [];
        const filtered = history.filter(h => h.term !== term);
        localStorage.setItem(historyKey, JSON.stringify(filtered));
    }

    clearHistory() {
        const user = this.getCurrentUser();
        if (!user) return;

        const historyKey = this.historyKey + user.email;
        localStorage.removeItem(historyKey);
    }
}

const storage = new StorageManager();

// ====== TOAST NOTIFICATIONS ======
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

// ====== AUTHENTICATION FUNCTIONS ======
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');
}

function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Validierung
    if (password !== passwordConfirm) {
        showToast('Passwörter stimmen nicht überein!', 'error');
        return false;
    }

    if (password.length < 6) {
        showToast('Passwort muss mindestens 6 Zeichen lang sein!', 'error');
        return false;
    }

    // Überprüfe ob E-Mail bereits existiert
    if (storage.getUserByEmail(email)) {
        showToast('E-Mail existiert bereits!', 'error');
        return false;
    }

    // Neuer Benutzer
    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: btoa(password), // Einfache Verschlüsselung (nur für Demo!)
        avatar: 'assets/default-avatar.svg',
        registeredAt: new Date().toISOString(),
        searchCount: 0
    };

    storage.saveUser(newUser);
    showToast(`Willkommen ${name}! Konto erstellt.`, 'success');

    // Formular zurücksetzen
    document.getElementById('registerForm').querySelector('form').reset();
    
    // Zur Login-Form wechseln
    setTimeout(() => {
        toggleForms();
    }, 500);

    return false;
}

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const user = storage.getUserByEmail(email);

    // Validierung
    if (!user) {
        showToast('Benutzer nicht gefunden!', 'error');
        return false;
    }

    // Passwort überprüfen
    if (btoa(password) !== user.password) {
        showToast('Passwort ist falsch!', 'error');
        return false;
    }

    // Login erfolgreich
    storage.setCurrentUser(user);
    showToast(`Willkommen zurück, ${user.name}!`, 'success');

    setTimeout(() => {
        showDashboard();
    }, 500);

    return false;
}

function useDemoAccount() {
    const demoUser = {
        id: 999,
        name: 'Demo Nutzer',
        email: 'demo@gimgm.com',
        password: btoa('demo123'),
        avatar: 'assets/default-avatar.png',
        registeredAt: new Date().toISOString(),
        searchCount: 42
    };

    // Demo-Benutzer speichern
    const existingUser = storage.getUserByEmail(demoUser.email);
    if (!existingUser) {
        storage.saveUser(demoUser);
    }

    storage.setCurrentUser(demoUser);
    showToast('Demo-Account geladen!', 'success');

    setTimeout(() => {
        showDashboard();
    }, 500);
}

function logout() {
    if (confirm('Möchtest du dich wirklich abmelden?')) {
        storage.clearCurrentUser();
        showToast('Abgemeldet!', 'info');

        setTimeout(() => {
            location.reload();
        }, 500);
    }
}

// ====== DASHBOARD FUNCTIONS ======
function showDashboard() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
    updateProfile();
    updateHistoryList();
    updateStats();
}

function updateProfile() {
    const user = storage.getCurrentUser();
    if (!user) return;

    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileAvatar').src = user.avatar;
    document.getElementById('headerAvatar').src = user.avatar;

    const registeredDate = new Date(user.registeredAt).toLocaleDateString('de-DE');
    document.getElementById('profileDate').textContent = registeredDate;
}

function updateStats() {
    const user = storage.getCurrentUser();
    if (!user) return;

    const history = storage.getHistory();
    document.getElementById('statSearches').textContent = history.length;

    // Suchen von heute
    const today = new Date().toDateString();
    const todaySearches = history.filter(h => {
        return new Date(h.timestamp).toDateString() === today;
    }).length;

    document.getElementById('statToday').textContent = todaySearches;
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Dateivalidierung
    if (!file.type.startsWith('image/')) {
        showToast('Nur Bilder sind erlaubt!', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
        showToast('Datei ist zu groß (max. 5MB)!', 'error');
        return;
    }

    // Bild laden
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        // Aktuellen Benutzer updaten
        const user = storage.getCurrentUser();
        user.avatar = imageData;
        storage.setCurrentUser(user);
        storage.saveUser(user);

        // UI aktualisieren
        document.getElementById('profileAvatar').src = imageData;
        document.getElementById('headerAvatar').src = imageData;

        showToast('Profilbild aktualisiert!', 'success');
    };

    reader.readAsDataURL(file);
}

// ====== HISTORY FUNCTIONS ======
function updateHistoryList() {
    const historyList = document.getElementById('historyList');
    const history = storage.getHistory();

    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <i class="fas fa-search"></i>
                <p>Noch keine Suchen</p>
            </div>
        `;
        document.getElementById('clearHistoryBtn').style.display = 'none';
        return;
    }

    historyList.innerHTML = history.map(item => {
        const date = new Date(item.timestamp);
        const timeString = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="history-item" onclick="searchWithTerm('${item.term}')">
                <i class="fas fa-search"></i>
                <span class="history-text">${escapeHtml(item.term)}</span>
                <span class="history-time">${timeString}</span>
                <button class="history-delete" onclick="deleteHistory('${item.term}'); event.stopPropagation();">
                    Löschen
                </button>
            </div>
        `;
    }).join('');

    document.getElementById('clearHistoryBtn').style.display = 'block';
}

function deleteHistory(term) {
    storage.deleteHistoryItem(term);
    updateHistoryList();
    updateStats();
    showToast('Suchverlauf gelöscht!', 'success');
}

function clearAllHistory() {
    if (confirm('Möchtest du deinen gesamten Suchverlauf wirklich löschen?')) {
        storage.clearHistory();
        updateHistoryList();
        updateStats();
        closeAllPanels();
        showToast('Gesamter Suchverlauf gelöscht!', 'success');
    }
}

// ====== SEARCH FUNCTIONS ======
function performSearch() {
    const searchInput = document.getElementById('mainSearch');
    const query = searchInput.value.trim();

    if (!query) {
        showToast('Bitte gib einen Suchbegriff ein!', 'error');
        return;
    }

    searchWithTerm(query);
}

function performQuickSearch() {
    const searchInput = document.getElementById('headerSearch');
    const query = searchInput.value.trim();

    if (!query) {
        showToast('Bitte gib einen Suchbegriff ein!', 'error');
        return;
    }

    document.getElementById('mainSearch').value = query;
    searchWithTerm(query);
}

function searchWithTerm(term) {
    // Zum Suchbereich scrollen
    const searchSection = document.getElementById('searchSection');
    searchSection.scrollIntoView({ behavior: 'smooth' });

    // Zum Suchverlauf hinzufügen
    storage.addToHistory(term);
    updateHistoryList();
    updateStats();

    // Suchergebnisse anzeigen
    document.getElementById('mainSearch').value = term;
    document.getElementById('searchQuery').textContent = term;

    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '<div class="loading">Suche läuft...</div>';

    // Mock Search Results
    setTimeout(() => {
        const results = generateMockResults(term);
        
        resultsList.innerHTML = results.map((result, index) => `
            <div class="result-item" style="animation-delay: ${index * 0.1}s;">
                <div class="result-title">${escapeHtml(result.title)}</div>
                <div class="result-url">${escapeHtml(result.url)}</div>
                <div class="result-description">${escapeHtml(result.description)}</div>
            </div>
        `).join('');

        document.getElementById('searchSection').querySelector('.search-suggestions').classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');

        showToast(`${results.length} Ergebnisse gefunden!`, 'success');
    }, 800);
}

function generateMockResults(term) {
    const mockResults = {
        'html': [
            { title: 'HTML Tutorial für Anfänger', url: 'www.html-tutorial.de', description: 'Lerne HTML von Grund auf. Von Anfänger bis Fortgeschrittene.' },
            { title: 'HTML5 - Moderne Webentwicklung', url: 'www.html5-guide.com', description: 'Kompletter Guide zu HTML5 Elementen und Strukturen.' },
            { title: 'HTML Tags Referenz', url: 'www.w3schools.com/html', description: 'Vollständige Referenz aller HTML Tags und Attribute.' }
        ],
        'javascript': [
            { title: 'JavaScript Anfängerleitfaden', url: 'www.js-lernen.de', description: 'Der beste Ort zum Lernen von JavaScript.' },
            { title: 'Modern JavaScript für Profis', url: 'www.javascript-pro.com', description: 'Fortgeschrittene JavaScript Konzepte erklärt.' },
            { title: 'JavaScript DOM Manipulation', url: 'www.dom-tutorial.de', description: 'Lerne wie du das DOM mit JavaScript manipulierst.' }
        ],
        'css': [
            { title: 'CSS Styling Anleitung', url: 'www.css-guide.de', description: 'Moderne CSS Techniken und Best Practices.' },
            { title: 'Flexbox und Grid Tutorial', url: 'www.layout-design.com', description: 'Meistere Flexbox und CSS Grid für responsive Designs.' },
            { title: 'CSS Animationen', url: 'www.css-animations.de', description: 'Erstelle beeindruckende Animationen mit CSS.' }
        ]
    };

    // Standard Ergebnisse
    const results = [
        { 
            title: `"${term}" - Offizielle Dokumentation`, 
            url: `www.${term.toLowerCase().replace(/\s/g, '-')}.org`, 
            description: `Die offizielle Dokumentation für ${term}. Alles was du wissen musst.` 
        },
        { 
            title: `${term} - Schritt für Schritt Tutorial`, 
            url: `www.tutorial-${term.toLowerCase().replace(/\s/g, '-')}.de`, 
            description: `Lerne ${term} mit unserem umfassenden Tutorial. Von Anfänger bis Profi.` 
        },
        { 
            title: `Alles über ${term}`, 
            url: `www.wissen-${term.toLowerCase().replace(/\s/g, '-')}.com`, 
            description: `Entdecke die besten Ressourcen für ${term}. Sicherlich findest du hier die Antwort.` 
        },
        { 
            title: `${term} - Häufig gestellte Fragen`, 
            url: `www.${term.toLowerCase().replace(/\s/g, '-')}-faq.de`, 
            description: `Die wichtigsten Fragen zu ${term} beantwortet.` 
        },
        { 
            title: `${term} Forum - Diskussionen & Hilfe`, 
            url: `forum.${term.toLowerCase().replace(/\s/g, '-')}.de`, 
            description: `Tritt unserer Community bei und teile deine Erfahrungen mit ${term}.` 
        }
    ];

    return results;
}

function backToSearch() {
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('searchSection').querySelector('.search-suggestions').classList.remove('hidden');
    document.getElementById('mainSearch').value = '';
    document.getElementById('mainSearch').focus();
}

// ====== PANEL TOGGLE FUNCTIONS ======
function toggleHistory() {
    closeAllPanels();
    document.getElementById('historyPanel').classList.toggle('active');
}

function toggleProfile() {
    closeAllPanels();
    document.getElementById('profilePanel').classList.toggle('active');
}

function toggleSettings() {
    // Kann später implementiert werden
    showToast('Einstellungen werden bald hinzugefügt!', 'info');
}

function closeAllPanels() {
    document.getElementById('historyPanel').classList.remove('active');
    document.getElementById('profilePanel').classList.remove('active');
}

// Close panels wenn außerhalb geklickt
document.addEventListener('click', function(event) {
    const historyPanel = document.getElementById('historyPanel');
    const profilePanel = document.getElementById('profilePanel');
    const historyBtn = document.querySelector('[onclick="toggleHistory()"]');
    const profileBtn = document.querySelector('[onclick="toggleProfile()"]');

    if (historyPanel && profilePanel) {
        const isClickOnHistory = event.target.closest('[onclick="toggleHistory()"]') || 
                                event.target.closest('#historyPanel');
        const isClickOnProfile = event.target.closest('[onclick="toggleProfile()"]') || 
                                event.target.closest('#profilePanel');

        if (!isClickOnHistory && historyPanel.classList.contains('active')) {
            historyPanel.classList.remove('active');
        }

        if (!isClickOnProfile && profilePanel.classList.contains('active')) {
            profilePanel.classList.remove('active');
        }
    }
});

// ====== UTILITY FUNCTIONS ======
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ====== KEYBOARD SHORTCUTS ======
document.addEventListener('keydown', function(event) {
    // Strg+Enter zum Suchen
    if (event.ctrlKey && event.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.id === 'mainSearch') {
            performSearch();
        } else if (activeElement.id === 'headerSearch') {
            performQuickSearch();
        }
    }

    // Esc zum Schließen von Panels
    if (event.key === 'Escape') {
        closeAllPanels();
    }
});

// ====== INITIALISIERUNG ======
document.addEventListener('DOMContentLoaded', function() {
    // Überprüfe ob Benutzer bereits eingeloggt ist
    const currentUser = storage.getCurrentUser();
    if (currentUser) {
        showDashboard();
    }

    // Enter zum Suchen
    document.getElementById('mainSearch')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    document.getElementById('headerSearch')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performQuickSearch();
        }
    });

    // Auto focus auf Login Email
    const loginForm = document.getElementById('loginForm');
    if (loginForm && loginForm.classList.contains('active')) {
        document.getElementById('loginEmail')?.focus();
    }
});

// ====== DEMO DATEN INITIALISIEREN ======
document.addEventListener('DOMContentLoaded', function() {
    // Schaue ob es Demo-Benutzer bereits gibt
    const demoUser = storage.getUserByEmail('demo@gimgm.com');
    if (!demoUser) {
        const demoData = {
            id: 999,
            name: 'Demo Nutzer',
            email: 'demo@gimgm.com',
            password: btoa('demo123'),
            avatar: 'assets/default-avatar.svg',
            registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            searchCount: 42
        };
        storage.saveUser(demoData);

        // Demo-Suchverlauf
        const demoHistory = [
            { term: 'Web Development', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
            { term: 'JavaScript Tutorial', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
            { term: 'CSS Grid Layout', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
            { term: 'HTML5 Basics', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() }
        ];
        localStorage.setItem('gimgm_history_demo@gimgm.com', JSON.stringify(demoHistory));
    }
});
