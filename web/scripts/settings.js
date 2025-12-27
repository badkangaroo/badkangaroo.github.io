"use strict";

// settings.js - Modernized with validation and settings-first flow
var settingsOpen = false;
var isInitialLoad = true;

// Check if required settings are complete
function areRequiredSettingsComplete() {
    const db = window.localStorage;
    if (!db) return false;
    
    const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
    const name = db.getItem("name") || db.getItem("operatorName");
    const gridsquare = db.getItem("gridsquare");
    
    return callsign && name && gridsquare && 
           callsign.trim().length > 0 && 
           name.trim().length > 0 && 
           gridsquare.trim().length >= 6;
}

// Validate gridsquare format (6 characters: AA00aa)
function validateGridsquare(gridsquare) {
    if (!gridsquare || gridsquare.length < 6) return false;
    const upper = gridsquare.toUpperCase();
    return /^[A-R]{2}[0-9]{2}[A-X]{2}$/.test(upper);
}

// Show settings on initial load if required fields are missing
window.addEventListener("DOMContentLoaded", (e) => {
    // Force uppercase for callsign
    const callsignInput = document.getElementById("callsign");
    if (callsignInput) {
        callsignInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }

    // Validate gridsquare input (6 characters)
    const gridsquareInput = document.getElementById("gridsquare");
    if (gridsquareInput) {
        gridsquareInput.addEventListener("input", (e) => {
            let value = e.target.value.toUpperCase().replace(/[^A-R0-9A-X]/g, '');
            if (value.length > 6) value = value.substring(0, 6);
            e.target.value = value;
            updateGridsquareValidation(e.target);
        });
        
        gridsquareInput.addEventListener("blur", (e) => {
            updateGridsquareValidation(e.target);
        });
    }

    // Load theme
    loadTheme();

    // Check if we need to show settings on initial load
    if (!areRequiredSettingsComplete()) {
        isInitialLoad = true;
        openSettings();
        showSettingsRequiredMessage();
    } else {
        isInitialLoad = false;
        // Hide settings initially if all required fields are set
        closeSettings();
    }
});

function showSettingsRequiredMessage() {
    const settings = document.getElementById("settings");
    if (!settings) return;
    
    // Create or update required message
    let message = document.getElementById("settings-required-message");
    if (!message) {
        message = document.createElement("div");
        message.id = "settings-required-message";
        message.className = "settings-required-message";
        message.innerHTML = `
            <div class="required-message-content">
                <h2>Welcome to Ribbit!</h2>
                <p>Please complete your profile to get started:</p>
                <ul>
                    <li>Enter your <strong>Operator Name</strong></li>
                    <li>Enter your <strong>Callsign</strong></li>
                    <li>Enter or enable GPS for your <strong>Grid Square</strong> (6 characters)</li>
                </ul>
            </div>
        `;
        const page = settings.querySelector(".page");
        if (page) {
            page.insertBefore(message, page.firstChild);
        }
    }
    message.style.display = "block";
}

function hideSettingsRequiredMessage() {
    const message = document.getElementById("settings-required-message");
    if (message) {
        message.style.display = "none";
    }
}

function updateGridsquareValidation(input) {
    const value = input.value.trim();
    if (value.length === 0) {
        input.classList.remove("valid", "invalid");
        return;
    }
    
    if (validateGridsquare(value)) {
        input.classList.remove("invalid");
        input.classList.add("valid");
    } else {
        input.classList.remove("valid");
        input.classList.add("invalid");
    }
}

function validateRequiredFields() {
    const operatorName = document.getElementById("operatorName");
    const callsign = document.getElementById("callsign");
    const gridsquare = document.getElementById("gridsquare");
    
    let isValid = true;
    const errors = [];
    
    if (!operatorName || !operatorName.value.trim()) {
        isValid = false;
        errors.push("Operator Name is required");
        if (operatorName) operatorName.classList.add("invalid");
    } else {
        if (operatorName) operatorName.classList.remove("invalid");
    }
    
    if (!callsign || !callsign.value.trim()) {
        isValid = false;
        errors.push("Callsign is required");
        if (callsign) callsign.classList.add("invalid");
    } else {
        if (callsign) callsign.classList.remove("invalid");
    }
    
    if (!gridsquare || !gridsquare.value.trim() || !validateGridsquare(gridsquare.value)) {
        isValid = false;
        errors.push("Valid Grid Square is required (6 characters: AA00aa)");
        if (gridsquare) gridsquare.classList.add("invalid");
    } else {
        if (gridsquare) gridsquare.classList.remove("invalid");
    }
    
    // Show validation errors
    showValidationErrors(errors);
    
    return isValid;
}

function showValidationErrors(errors) {
    let errorDiv = document.getElementById("settings-validation-errors");
    if (errors.length === 0) {
        if (errorDiv) errorDiv.remove();
        return;
    }
    
    if (!errorDiv) {
        errorDiv = document.createElement("div");
        errorDiv.id = "settings-validation-errors";
        errorDiv.className = "validation-errors";
        const settings = document.getElementById("settings");
        const page = settings.querySelector(".page");
        if (page) {
            page.insertBefore(errorDiv, page.firstChild.nextSibling);
        }
    }
    
    errorDiv.innerHTML = `
        <div class="error-content">
            <strong>Please fix the following errors:</strong>
            <ul>
                ${errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
        </div>
    `;
    errorDiv.style.display = "block";
}

const toggleSettings = () => {
    if (settingsOpen) {
        closeSettings();
    } else {
        openSettings();
    }
};

const openSettings = () => {
    document.dispatchEvent(new CustomEvent("openSettings"));
    const elements = document.getElementsByName("close");
    elements.forEach((e) => e.beginElement());
    
    // Load saved values
    loadSettingsValues();
    
    // Get number of messages in indexedDB
    if (window.indexedDB) {
        const dbRequest = indexedDB.open("ribbit", 1);
        dbRequest.onsuccess = (e) => {
            const db = e.target.result;
            // Check if the "messages" object store exists
            if (db.objectStoreNames.contains("messages")) {
                try {
                    const transaction = db.transaction("messages", "readonly");
                    const store = transaction.objectStore("messages");
                    const request = store.count();
                    request.onsuccess = (e) => {
                        const messagecount = document.getElementById("messagecount");
                        if (messagecount) {
                            messagecount.value = e.target.result;
                        }
                    };
                    request.onerror = (e) => {
                        console.error("Error counting messages:", e);
                        const messagecount = document.getElementById("messagecount");
                        if (messagecount) {
                            messagecount.value = "0";
                        }
                    };
                } catch (error) {
                    console.error("Error accessing messages object store:", error);
                    const messagecount = document.getElementById("messagecount");
                    if (messagecount) {
                        messagecount.value = "0";
                    }
                }
            } else {
                // Object store doesn't exist yet, set count to 0
                const messagecount = document.getElementById("messagecount");
                if (messagecount) {
                    messagecount.value = "0";
                }
            }
        };
        dbRequest.onerror = (e) => {
            console.error("Error opening IndexedDB:", e);
            const messagecount = document.getElementById("messagecount");
            if (messagecount) {
                messagecount.value = "0";
            }
        };
    } else {
        // IndexedDB not available
        const messagecount = document.getElementById("messagecount");
        if (messagecount) {
            messagecount.value = "0";
        }
    }
    
    settingsOpen = true;
    const settings = document.getElementById("settings");
    if (settings) {
        settings.style.top = "0svh";
        settings.style.display = "flex";
    }
};

const closeSettings = () => {
    // Only allow closing if required settings are complete or user explicitly cancels
    if (isInitialLoad && !areRequiredSettingsComplete()) {
        // Don't allow closing on initial load if settings incomplete
        return;
    }
    
    const elements = document.getElementsByName("open");
    elements.forEach((e) => e.beginElement());
    settingsOpen = false;
    const settings = document.getElementById("settings");
    if (settings) {
        settings.style.top = "-100svh";
    }
    hideSettingsRequiredMessage();
};

function loadSettingsValues() {
    const db = window.localStorage;
    if (!db) {
        console.error("Local Storage is not available.");
        return;
    }
    
    const operatorName = db.getItem("operatorName") || db.getItem("name") || "";
    const callsign = db.getItem("callsign") || "";
    const gridsquare = db.getItem("gridsquare") || "";
    const microphone = db.getItem("microphone") || "Default";
    const speaker = db.getItem("speaker") || "Default";
    const savemessages = db.getItem("saveMessages") === "true";
    const useOptimizedDigest = db.getItem("useOptimizedDigest") === "true";
    const theme = db.getItem("theme") || "ribbit-light";

    const operatorNameEl = document.getElementById("operatorName");
    const callsignEl = document.getElementById("callsign");
    const gridsquareEl = document.getElementById("gridsquare");
    const microphoneEl = document.getElementById("microphone");
    const speakerEl = document.getElementById("speaker");
    const savemessagesEl = document.getElementById("savemessages");
    const useOptimizedDigestEl = document.getElementById("useOptimizedDigest");
    const themeEl = document.getElementById("Theme");

    if (operatorNameEl) operatorNameEl.value = operatorName;
    if (callsignEl) callsignEl.value = callsign;
    if (gridsquareEl) {
        gridsquareEl.value = gridsquare;
        updateGridsquareValidation(gridsquareEl);
    }
    if (microphoneEl) microphoneEl.value = microphone;
    if (speakerEl) speakerEl.value = speaker;
    if (savemessagesEl) savemessagesEl.checked = savemessages;
    if (useOptimizedDigestEl) useOptimizedDigestEl.checked = useOptimizedDigest;
    if (themeEl) themeEl.value = theme;
}

function loadTheme() {
    const db = window.localStorage;
    if (!db) return;
    
    const theme = db.getItem("theme") || "ribbit-light";
    applyTheme(theme);
}

function applyTheme(themeName) {
    const html = document.documentElement;
    const themeMap = {
        "Ribbit": "ribbit-light",
        "Ribbit (Default)": "ribbit-light",
        "World Radio League": "world-radio-league",
        "Muted Light": "ribbit-light",
        "Muted Dark": "ribbit-dark"
    };
    
    const actualTheme = themeMap[themeName] || themeName || "ribbit-light";
    html.setAttribute("data-theme", actualTheme);
    html.classList.remove("ribbit-light", "ribbit-dark", "world-radio-league");
    html.classList.add(actualTheme);
}

document.addEventListener('saveSettings', (e) => {
    // Validate required fields before saving
    if (!validateRequiredFields()) {
        e.preventDefault();
        return;
    }
    
    const operatorName = document.getElementById("operatorName")?.value || "";
    const callsign = document.getElementById("callsign")?.value || "";
    const gridsquare = document.getElementById("gridsquare")?.value || "";
    const microphone = document.getElementById("microphone")?.value || "Default";
    const speaker = document.getElementById("speaker")?.value || "Default";
    const savemessages = document.getElementById("savemessages")?.checked || false;
    const useOptimizedDigest = document.getElementById("useOptimizedDigest")?.checked || false;
    const theme = document.getElementById("Theme")?.value || "Ribbit";
    
    console.log("Saving settings:", {
        operatorName,
        callsign,
        gridsquare,
        savemessages,
        microphone,
        speaker,
        useOptimizedDigest,
        theme
    });
    
    const db = window.localStorage;
    if (!db) {
        console.error("Local Storage is not available.");
        return;
    }
    
    // Save settings
    db.setItem("operatorName", operatorName);
    db.setItem("name", operatorName); // Also save as "name" for compatibility
    db.setItem("callsign", callsign.toUpperCase());
    db.setItem("gridsquare", gridsquare.toUpperCase());
    db.setItem("saveMessages", savemessages.toString());
    db.setItem("microphone", microphone);
    db.setItem("speaker", speaker);
    db.setItem("useOptimizedDigest", useOptimizedDigest.toString());
    db.setItem("theme", theme);
    
    // Apply theme
    applyTheme(theme);
    
    // Mark settings as complete
    db.setItem("settingsComplete", "true");
    
    // Hide validation errors
    showValidationErrors([]);
    hideSettingsRequiredMessage();
    
    // Close settings
    isInitialLoad = false;
    closeSettings();
    
    // Dispatch event that settings are ready
    document.dispatchEvent(new CustomEvent('settingsReady'));
});

document.addEventListener("openSettings", (e) => {
    openSettings();
});

document.addEventListener("closeSettings", (e) => {
    // Only close if not initial load or if settings are complete
    if (!isInitialLoad || areRequiredSettingsComplete()) {
        closeSettings();
    }
});

// Handle theme changes
document.addEventListener("DOMContentLoaded", () => {
    const themeSelect = document.getElementById("Theme");
    if (themeSelect) {
        themeSelect.addEventListener("change", (e) => {
            applyTheme(e.target.value);
        });
    }
});
