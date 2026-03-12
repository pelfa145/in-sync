function initSettings() {
    const settingsBack = document.getElementById('settings-back');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const themeBubbles = document.querySelectorAll('.theme-bubble');
    const settingsPairBtn = document.getElementById('settings-pair-btn');
    const settingsCodeInput = document.getElementById('settings-code-input');
    const signOutBtn = document.getElementById('sign-out-btn');
    const upgradeBtn = document.getElementById('settings-upgrade-btn');

    if (!settingsBack) return;

    document.getElementById('account-email').textContent = AppState.currentUser?.email || '';
    document.getElementById('settings-pair-code').textContent = AppState.currentUser?.pairCode || '------';

    // Subscription status
    const statusText = document.getElementById('premium-status-text');
    const freeInfo = document.getElementById('free-status-info');
    const premiumInfo = document.getElementById('premium-status-info');

    if (AppState.isPremium) {
        statusText.textContent = 'Premium Member';
        statusText.style.color = '#FFD700'; // Gold
        freeInfo.classList.add('hidden');
        premiumInfo.classList.remove('hidden');
    } else {
        statusText.textContent = 'Free Plan';
        freeInfo.classList.remove('hidden');
        premiumInfo.classList.add('hidden');
    }

    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => navigateTo('paywall'));
    }

    if (AppState.partner) {
        document.getElementById('partner-info-card').classList.remove('hidden');
        document.getElementById('partner-display-name').textContent = AppState.partner.name;
        document.getElementById('partner-display-email').textContent = AppState.partner.email;
    } else {
        document.getElementById('pair-device-card').classList.remove('hidden');
    }

    darkModeToggle.checked = AppState.isDarkMode;
    applyTheme();

    themeBubbles.forEach(bubble => {
        // Set active class on load
        if (bubble.dataset.theme === AppState.activeTheme) {
            themeBubbles.forEach(b => b.classList.remove('active'));
            bubble.classList.add('active');
        }

        bubble.addEventListener('click', () => {
            themeBubbles.forEach(b => b.classList.remove('active'));
            bubble.classList.add('active');
            
            AppState.activeTheme = bubble.dataset.theme;
            localStorage.setItem('theme', AppState.activeTheme);
            applyTheme();
            
            document.querySelectorAll('.theme-bubble').forEach(b => {
                b.innerHTML = b.classList.contains('active') ? '✓' : '\u00A0';
            });
        });
    });

    themeBubbles.forEach(b => {
        b.innerHTML = b.classList.contains('active') ? '✓' : '\u00A0';
    });

    darkModeToggle.addEventListener('change', () => {
        AppState.isDarkMode = darkModeToggle.checked;
        localStorage.setItem('darkMode', AppState.isDarkMode);
        applyTheme();
    });

    settingsBack.addEventListener('click', () => navigateTo('home'));

    if (settingsCodeInput) {
        settingsCodeInput.addEventListener('input', () => {
            settingsCodeInput.value = settingsCodeInput.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            settingsPairBtn.disabled = settingsCodeInput.value.trim().length !== 6;
        });
    }

    if (settingsPairBtn) {
        settingsPairBtn.addEventListener('click', handlePairFromSettings);
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
}

async function handlePairFromSettings() {
    const code = document.getElementById('settings-code-input').value.trim();
    const pairBtn = document.getElementById('settings-pair-btn');

    if (!code || !AppState.currentUser) return;

    pairBtn.disabled = true;

    try {
        const partner = await pairWithCode(AppState.currentUser.id, code);
        
        if (partner) {
            AppState.partner = partner;
            AppState.currentUser.partnerId = partner.id;
            
            document.getElementById('partner-info-card').classList.remove('hidden');
            document.getElementById('pair-device-card').classList.add('hidden');
            document.getElementById('partner-display-name').textContent = partner.name;
            document.getElementById('partner-display-email').textContent = partner.email;
            document.getElementById('settings-code-input').value = '';
            
            alert('Successfully paired with your partner!');
        } else {
            alert('Could not find that code. Please check and try again.');
        }
    } catch (e) {
        alert(e.message);
    } finally {
        pairBtn.disabled = false;
    }
}

async function handleSignOut() {
    if (!confirm('Are you sure you want to sign out?')) return;

    try {
        await signOut();
        AppState.currentUser = null;
        AppState.partner = null;
        AppState.memories = [];
        AppState.messages = [];
        navigateTo('index');
    } catch (e) {
        alert('Error signing out: ' + e.message);
    }
}

if (window.AppStateReady) {
    initSettings();
} else {
    document.addEventListener('appReady', initSettings);
}
