function initPairing() {
    const pairBtn = document.getElementById('pair-btn');
    const skipBtn = document.getElementById('skip-pair-btn');
    const codeInput = document.getElementById('partner-code-input');
    const myCodeDisplay = document.getElementById('my-pair-code');
    const pairingError = document.getElementById('pairing-error');

    if (!pairBtn) return;

    if (AppState.currentUser?.pairCode) {
        myCodeDisplay.textContent = AppState.currentUser.pairCode;
    }

    if (AppState.partner) {
        navigateTo('home.html');
        return;
    }

    pairBtn.addEventListener('click', handlePair);
    skipBtn.addEventListener('click', () => navigateTo('home.html'));

    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        pairingError.classList.add('hidden');
    });
}

async function handlePair() {
    const code = document.getElementById('partner-code-input').value.trim();
    const pairBtn = document.getElementById('pair-btn');
    const pairingError = document.getElementById('pairing-error');

    if (!code) {
        pairingError.textContent = 'Please enter a pairing code';
        pairingError.classList.remove('hidden');
        return;
    }

    if (!AppState.currentUser) {
        navigateTo('index.html');
        return;
    }

    pairBtn.disabled = true;
    pairingError.classList.add('hidden');

    try {
        const partner = await pairWithCode(AppState.currentUser.id, code);
        
        if (partner) {
            AppState.partner = partner;
            AppState.currentUser.partnerId = partner.id;
            navigateTo('home.html');
        } else {
            pairingError.textContent = 'Could not find that code. Please check and try again.';
            pairingError.classList.remove('hidden');
        }
    } catch (e) {
        pairingError.textContent = e.message;
        pairingError.classList.remove('hidden');
    } finally {
        pairBtn.disabled = false;
    }
}

if (window.AppStateReady) {
    initPairing();
} else {
    document.addEventListener('appReady', initPairing);
}
