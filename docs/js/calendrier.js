// Définition des URLs centralisées
const apiUrls = {
    getSaveState: (sortie) => `/getSaveState/sortie-${sortie}`,
    setSaveState: (sortie) => `/save/sortie-${sortie}`,
    sendCalendar: (sortie, tache) => `/sortie-${sortie}/tache-${tache}`
};

// --- Fonctions utilitaires pour l'interface utilisateur ---
function showFeedbackMessage(element, message, type = 'success') {
    element.textContent = message;
    element.className = `feedback-message ${type} visible`;
    setTimeout(() => {
        element.classList.remove('visible');
        element.textContent = "";
    }, 5000);
}

function showLoadingState(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = '<span class="spinner"></span> Chargement...';
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        button.innerHTML = button.id === 'send-calendar-btn' ? 'Envoyer le réglage' : 'Appliquer le changement';
    }
}

function updateTextContent(element, text) {
    element.textContent = text;
}

// Fonctions spécialisées pour les requêtes API
const api = {
    async getSaveState(sortie) {
        const url = apiUrls.getSaveState(sortie);
        return await fetchESP(url);
    },

    async setSaveState(sortie, choice) {
        const url = apiUrls.setSaveState(sortie);
        const data = { save: choice };
        return await fetchESP(url, data);
    },

    async sendCalendar(sortie, tache, calendarData) {
        const url = apiUrls.sendCalendar(sortie, tache);
        return await fetchESP(url, calendarData);
    }
};

// Éléments du DOM
const sortieEL = document.getElementById('sorties');
const tacheEL = document.getElementById('taches');
const onTimeEl = document.getElementById('onTime');
const offTimeEl = document.getElementById('offTime');
const saveButton = document.getElementById('btn-save');
const saveChoiceLabel = document.getElementById('choice_state');
const selectedOutputSpan = document.getElementById('selected-output');
const calendarFormEl = document.getElementById('sortie-form');
const saveFormEl = document.getElementById('save-form');
const calendarMessageEl = document.getElementById('calendar-message');
const saveMessageEl = document.getElementById('save-message');
const sendCalendarBtn = document.getElementById('send-calendar-btn');
const sendSaveBtn = document.getElementById('send-save-btn');


document.addEventListener('DOMContentLoaded', () => {
    // 🔄 Initialisation au chargement
    const selectedSortie = sortieEL.value;
    updateTextContent(selectedOutputSpan, sortieEL.options[sortieEL.selectedIndex].text);
    updateSaveStateUI(selectedSortie);
    
    // 🧭 Écoute de changement de sortie
    sortieEL.addEventListener('change', (e) => {
        const sortieChoice = e.target.value;
        updateTextContent(selectedOutputSpan, sortieEL.options[sortieEL.selectedIndex].text);
        updateSaveStateUI(sortieChoice);
    });

    // 📅 Soumission du formulaire de tâche
    calendarFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoadingState(sendCalendarBtn, true);
        
        const sortie = sortieEL.value;
        const tache = tacheEL.value;
        const onTime = onTimeEl.value;
        const offTime = offTimeEl.value;
        const data = timeDataset(onTime, offTime);
        
        const response = await api.sendCalendar(sortie, tache, data);
        showLoadingState(sendCalendarBtn, false);
        
        if (response && response.success) {
            showFeedbackMessage(calendarMessageEl, "Réglage de la tâche envoyé avec succès !", "success");
            calendarFormEl.reset();
        } else {
            showFeedbackMessage(calendarMessageEl, "Échec de l'envoi du réglage de la tâche.", "error");
        }
    });

    // 💾 Soumission du formulaire de sauvegarde
    saveFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoadingState(sendSaveBtn, true);
        
        const sortie = sortieEL.value;
        const saveChoice = saveButton.checked;
        const response = await api.setSaveState(sortie, saveChoice);
        showLoadingState(sendSaveBtn, false);
        
        if (response && response.success) {
            showFeedbackMessage(saveMessageEl, "État de sauvegarde mis à jour avec succès !", "success");
            updateTextContent(saveChoiceLabel, response.data.save ? "Désactiver" : "Activer");
        } else {
            showFeedbackMessage(saveMessageEl, "Échec de la mise à jour de l'état de sauvegarde.", "error");
        }
    });
});

// Fonctions pour gérer la mise à jour de l'interface utilisateur
async function updateSaveStateUI(sortie) {
    const response = await api.getSaveState(sortie);
    
    if (response && response.data && typeof response.data.save === "boolean") {
        saveButton.checked = response.data.save;
        updateTextContent(saveChoiceLabel, response.data.save ? "Désactiver" : "Activer");
    } else {
        saveButton.checked = false;
        updateTextContent(saveChoiceLabel, "---");
        console.error(`Impossible de récupérer l'état de sauvegarde pour la sortie ${sortie}`);
    }
}

function parseInputTime(time) {
    const [h, m] = time.split(':').map(n => parseInt(n, 10));
    return { heure: h, minute: m, seconde: 0 };
}

function timeDataset(on_time, off_time) {
    return {
        allumage: parseInputTime(on_time),
        extinction: parseInputTime(off_time)
    };
}

async function fetchESP(url, data = null) {
    const options = data
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          }
        : { method: "GET" };

    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        // Ajout d'une propriété `success` pour simplifier la vérification
        return { ...json, success: true };
    } catch (err) {
        console.error("Erreur ESP :", err);
        return { success: false, error: err.message };
    }
}