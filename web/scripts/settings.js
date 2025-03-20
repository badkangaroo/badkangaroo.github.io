var settingsOpen = false;

const toggleSettings = () => {
    if (settingsOpen) {
        closeSettings();
    } else {
        openSettings();
    }
}

const openSettings = () => {
    document.dispatchEvent(new CustomEvent('openSettings'));
    const elements = document.getElementsByName('close');
    elements.forEach(e => e.beginElement());
    // get number of messages in indexedDB
    const db = indexedDB.open('ribbit', 1);
    if (!db) { return; }
    db.onsuccess = e => {
        const transaction = e.target.result.transaction('messages', 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.count();
        request.onsuccess = e => {
            const messagecount = document.getElementById('messagecount');
            messagecount.value = e.target.result;
        }
    }
    settingsOpen = true;
}

const closeSettings = () => {
    document.dispatchEvent(new CustomEvent('closeSettings'));
    const elements = document.getElementsByName('open');
    elements.forEach(e => e.beginElement());
    settingsOpen = false;
}

const saveSettings = () => {
    const name = document.getElementById('name').value;
    const callsign = document.getElementById('callsign').value;
    const phone = document.getElementById('phone').value;
    const gps = {
        'longitude': document.getElementById('longitude').value,
        'latitude': document.getElementById('latitude').value
    };
    const gridsquare = document.getElementById('gridsquare').value;
    const microphone = document.getElementById('microphone').value;
    const speaker = document.getElementById('speaker').value;
    const savemessages = document.getElementById('savemessages').checked;
    console.log(name, callsign, phone, gps, gridsquare, savemessages, microphone, speaker);
    const db = window.localStorage;
    if (!db) {
        console.error('Local Storage is not available.');
        return;
    }
    db.setItem('name', name);
    db.setItem('callsign', callsign);
    db.setItem('gps', JSON.stringify(gps));
    db.setItem('gridsquare', gridsquare);
    db.setItem('phone', phone);
    db.setItem('saveMessages', savemessages);
    db.setItem('microphone', microphone);
    db.setItem('speaker', speaker);
    closeSettings();
}
document.addEventListener('openSettings', e => {
    const settings = document.getElementById('settings');
    settings.style.top = '0svh';
    // check local storage for values
    const db = window.localStorage;
    if (!db) {
        console.error('Local Storage is not available.');
        return;
    }
    const name = db.getItem('name');
    const callsign = db.getItem('callsign');
    const phone = db.getItem('phone');
    const gridsquare = db.getItem('gridsquare');
    const microphone = db.getItem('microphone');
    const speaker = db.getItem('speaker');
    const gps = db.getItem('gps');
    const { latitude, longitude } = JSON.parse(gps ? gps : '{}');

    document.getElementById('name').value = name ? name : '';
    document.getElementById('callsign').value = callsign ? callsign : '';
    document.getElementById('longitude').value = longitude ? longitude : '';
    document.getElementById('latitude').value = latitude ? latitude : '';
    document.getElementById('gridsquare').value = gridsquare ? gridsquare : '';
    document.getElementById('phone').value = phone ? phone : '';
    document.getElementById('microphone').value = microphone ? microphone : '';
    document.getElementById('speaker').value = speaker ? speaker : '';
});
document.addEventListener('closeSettings', e => {
    const settings = document.getElementById('settings');
    settings.style.top = '-100svh';
});