const showClearMessageConfirm = () => {
    const confirm = document.getElementById('clearMessagesConfirm');
    confirm.style.display = 'flex';
}
const hideClearMessageConfirm = () => {
    const confirm = document.getElementById('clearMessagesConfirm');
    confirm.style.display = 'none';
}
const confirmClearMessages = () => {
    const chat = document.getElementById('chat');
    chat.innerHTML = '';
    // clear messages from indexedDB
    const db = window.indexedDB;
    if (!db) {
        console.error('IndexedDB is not available.');
        return;
    }
    const request = db.open('ribbit', 1);
    request.onsuccess = e => {
        const db = e.target.result;
        const transaction = db.transaction('messages', 'readwrite');
        const store = transaction.objectStore('messages');
        const request = store.clear();
        request.onsuccess = e => {
            const messagecount = document.getElementById('messagecount');
            messagecount.value = '0';
            console.log('Messages cleared.');
            const event = new CustomEvent('receivemessage', {
                detail: {
                    save: false,
                    type: 'alert',
                    message: 'Messages cleared',
                    timestamp: new Date().toUTCString()
                }
            });
            document.dispatchEvent(event);
        };
    };
    hideClearMessageConfirm();
}