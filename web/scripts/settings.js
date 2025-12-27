"use strict";

// settings.js
var settingsOpen = false;
window.addEventListener("DOMContentLoaded", (e) => {
    // force uppercase
    document.getElementById("callsign").addEventListener("input", (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
});

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
    // get number of messages in indexedDB
    const db = indexedDB.open("ribbit", 1);
    if (!db) {
        return;
    }
    db.onsuccess = (e) => {
        const transaction = e.target.result.transaction("messages", "readonly");
        const store = transaction.objectStore("messages");
        const request = store.count();
        request.onsuccess = (e) => {
            const messagecount = document.getElementById("messagecount");
            messagecount.value = e.target.result;
        };
    };
    settingsOpen = true;
};

const closeSettings = () => {
    const elements = document.getElementsByName("open");
    elements.forEach((e) => e.beginElement());
    settingsOpen = false;
    const settings = document.getElementById("settings");
    settings.style.top = "-100svh";
};

document.addEventListener('saveSettings', (e) => {
    const operatorName = document.getElementById("operatorName").value;
    const callsign = document.getElementById("callsign").value;
    const gridsquare = document.getElementById("gridsquare").value;
    const microphone = document.getElementById("microphone").value;
    const speaker = document.getElementById("speaker").value;
    const savemessages = document.getElementById("savemessages").checked;
    const useOptimizedDigest = document.getElementById("useOptimizedDigest").checked;
    console.log(
        operatorName,
        callsign,
        gridsquare,
        savemessages,
        microphone,
        speaker,
        useOptimizedDigest
    );
    const db = window.localStorage;
    if (!db) {
        console.error("Local Storage is not available.");
        return;
    }
    db.setItem("operatorName", operatorName);
    db.setItem("callsign", callsign);
    db.setItem("gridsquare", gridsquare);
    db.setItem("saveMessages", savemessages);
    db.setItem("microphone", microphone);
    db.setItem("speaker", speaker);
    db.setItem("useOptimizedDigest", useOptimizedDigest);
    closeSettings();
});

document.addEventListener("openSettings", (e) => {
    const settings = document.getElementById("settings");
    settings.style.top = "0svh";
    // check local storage for values
    const db = window.localStorage;
    if (!db) {
        console.error("Local Storage is not available.");
        return;
    }
    const name = db.getItem("name");
    const callsign = db.getItem("callsign");
    const gridsquare = db.getItem("gridsquare");
    const microphone = db.getItem("microphone");
    const speaker = db.getItem("speaker");
    const useOptimizedDigest = db.getItem("useOptimizedDigest");

    document.getElementById("operatorName").value = operatorName ? operatorName : "";
    document.getElementById("callsign").value = callsign ? callsign : "";
    document.getElementById("gridsquare").value = gridsquare ? gridsquare : "";
    document.getElementById("microphone").value = microphone ? microphone : "";
    document.getElementById("speaker").value = speaker ? speaker : "";
    document.getElementById("useOptimizedDigest").checked = useOptimizedDigest === "true";
});
document.addEventListener("closeSettings", (e) => {
    closeSettings();
});
