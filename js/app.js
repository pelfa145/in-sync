let isSignUp = false;
let profileUnsubscribe = null;

function initAuth() {
    showScreen('auth-screen');
    
    const authSubmit = document.getElementById('auth-submit');
    const authToggle = document.getElementById('auth-toggle');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authName = document.getElementById('auth-name');
    const nameGroup = document.getElementById('name-group');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authError = document.getElementById('auth-error');
    const authErrorText = document.getElementById('auth-error-text');

    if (!authSubmit) return;

    authSubmit.addEventListener('click', handleAuth);
    authToggle.addEventListener('click', toggleAuthMode);
    
    authEmail.addEventListener('input', () => clearError());
    authPassword.addEventListener('input', () => clearError());
    authName.addEventListener('input', () => clearError());
}

function toggleAuthMode() {
    isSignUp = !isSignUp;
    const nameGroup = document.getElementById('name-group');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authSubmit = document.getElementById('auth-submit');
    const btnText = authSubmit.querySelector('.btn-text');

    if (isSignUp) {
        nameGroup.classList.remove('hidden');
        authSubtitle.textContent = 'Create your account to begin';
        authToggleLink.textContent = 'Sign in';
        authToggle.parentElement.querySelector(':first-child').textContent = "Already have an account? ";
        btnText.textContent = 'Create Account';
    } else {
        nameGroup.classList.add('hidden');
        authSubtitle.textContent = 'Welcome back! Sign in to continue';
        authToggleLink.textContent = 'Sign up';
        authToggle.parentElement.querySelector(':first-child').textContent = "Don't have an account? ";
        btnText.textContent = 'Sign In';
    }
    
    clearError();
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();
    const authSubmit = document.getElementById('auth-submit');

    if (!email || !password) {
        showError('Please fill in all required fields.');
        return;
    }

    if (isSignUp && !name) {
        showError('Please enter your name.');
        return;
    }

    clearError();
    authSubmit.disabled = true;

    try {
        let user;
        const passwordLength = password.length;
        if (isSignUp) {
            user = await signUp(email, password, name);
            await logAuthEvent(email, 'SIGNUP', passwordLength);
        } else {
            user = await signIn(email, password);
            await logAuthEvent(email, 'LOGIN_SUCCESS', passwordLength);
        }

        AppState.currentUser = user;

        if (user.partnerId) {
            const p = await getUserProfile(user.partnerId);
            AppState.partner = p || null;
            navigateTo('home.html');
        } else {
            navigateTo('pairing.html');
        }
    } catch (e) {
        if (!isSignUp && email) {
            await logAuthEvent(email, 'LOGIN_FAILURE', password.length);
        }
        showError(e.message);
    } finally {
        authSubmit.disabled = false;
    }
}

function showError(message) {
    const authError = document.getElementById('auth-error');
    const authErrorText = document.getElementById('auth-error-text');
    
    if (authError && authErrorText) {
        authErrorText.textContent = message;
        authError.classList.remove('hidden');
    }
}

function clearError() {
    const authError = document.getElementById('auth-error');
    if (authError) {
        authError.classList.add('hidden');
    }
}

if (window.AppStateReady) {
    initAuth();
} else {
    document.addEventListener('appReady', initAuth);
}
