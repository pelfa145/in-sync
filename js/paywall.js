function initPaywall() {
    const upgradeBtn = document.getElementById('upgrade-btn');
    const closeBtn = document.getElementById('paywall-close');
    const gcashModal = document.getElementById('gcash-modal');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
    const gcashNumber = document.getElementById('gcash-number');

    if (!upgradeBtn) return;

    upgradeBtn.addEventListener('click', () => {
        gcashModal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        navigateTo('settings');
    });

    cancelPaymentBtn.addEventListener('click', () => {
        gcashModal.classList.add('hidden');
    });

    confirmPaymentBtn.addEventListener('click', async () => {
        const number = gcashNumber.value.trim();
        if (number.length < 11) {
            alert('Please enter a valid GCash number.');
            return;
        }

        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.textContent = 'Processing...';

        // Mock payment processing delay
        setTimeout(async () => {
            try {
                // In a real app, this would verify with a server/API
                localStorage.setItem('isPremium', 'true');
                AppState.isPremium = true;
                
                alert('Success! Your account has been upgraded to Premium.');
                navigateTo('settings');
            } catch (e) {
                alert('Payment failed. Please try again.');
                confirmPaymentBtn.disabled = false;
                confirmPaymentBtn.textContent = 'Pay ₱40.00';
            }
        }, 2000);
    });
}

document.addEventListener('appReady', initPaywall);
