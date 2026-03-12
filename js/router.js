const AppState = {
    currentUser: null,
    partner: null,
    memories: [],
    messages: [],
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    activeTheme: localStorage.getItem('theme') || 'pink',
    isPremium: localStorage.getItem('isPremium') === 'true',
};

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
    }
}

function navigateTo(page, params = {}) {
    const targetPage = page.includes('.html') ? page : page + '.html';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const pageKey = page.replace('.html', '');
    const screenId = pageKey + (pageKey.endsWith('-screen') ? '' : '-screen');

    // If the screen exists in the DOM, just show it
    if (document.getElementById(screenId)) {
        showScreen(screenId);
        return;
    }
    
    if (currentPage === targetPage) {
        return;
    }
    
    window.location.href = targetPage;
}

function applyTheme() {
    const root = document.documentElement;
    if (AppState.isDarkMode) {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }

    const theme = THEMES[AppState.activeTheme] || THEMES['pink'];
    if (theme) {
        root.style.setProperty('--primary', theme.color);
        root.style.setProperty('--primary-light', theme.color + '15');
    }
}

function lockOrientation() {
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(err => {
            console.log('Orientation lock failed:', err.message);
        });
    }
}

async function initAppState() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    AppState.isDarkMode = localStorage.getItem('darkMode') === 'true';
    AppState.activeTheme = localStorage.getItem('theme') || 'pink';
    AppState.isPremium = localStorage.getItem('isPremium') === 'true';
    applyTheme();
    
    if (!session?.user) {
        if (currentPage !== 'index.html') {
            window.location.href = 'index.html';
        }
        return null;
    }
    
    try {
        const profile = await getUserProfile(session.user.id);
        if (!profile) {
            if (currentPage !== 'index.html') {
                window.location.href = 'index.html';
            }
            return null;
        }
        
        AppState.currentUser = profile;
        
        if (profile.partnerId) {
            const partner = await getUserProfile(profile.partnerId);
            AppState.partner = partner;
        }

        // Handle redirects based on state
        if (currentPage === 'index.html') {
            if (!profile.partnerId) {
                navigateTo('pairing.html');
            } else {
                navigateTo('home.html');
            }
        } else if (currentPage === 'pairing.html' && profile.partnerId) {
            navigateTo('home.html');
        } else if (currentPage !== 'pairing.html' && currentPage !== 'index.html' && !profile.partnerId) {
            navigateTo('pairing.html');
        }

        return profile;
    } catch (e) {
        console.error('Error initializing app state:', e);
        if (currentPage !== 'index.html') {
            window.location.href = 'index.html';
        }
        return null;
    }
}

// Automatically initialize on every page load
document.addEventListener('DOMContentLoaded', async () => {
    lockOrientation();
    await initAppState();
    
    // Listen for auth changes to handle logout/login in real-time
    onAuthChange(async (user) => {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (!user && currentPage !== 'index.html') {
            window.location.href = 'index.html';
        } else if (user && currentPage === 'index.html') {
            await initAppState(); // Refresh profile and redirect
        }
    });

    // Show the appropriate screen for the current HTML file
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const pageKey = currentPage.replace('.html', '');
    const screenMap = {
        'index': 'auth-screen',
        'pairing': 'pairing-screen',
        'home': 'home-screen',
        'new-memory': 'new-memory-screen',
        'chat': 'chat-screen',
        'settings': 'settings-screen',
        'paywall': 'paywall-screen',
    };
    
    const screenId = screenMap[pageKey];
    if (screenId) {
        showScreen(screenId);
    }

    // Dispatch event so other scripts know AppState is ready
    window.AppStateReady = true;
    document.dispatchEvent(new CustomEvent('appReady'));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('Service Worker registered');
      
      // Check for updates on every load
      reg.update();

      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available! Since sw.js calls skipWaiting(), 
            // the new worker will activate and trigger 'controllerchange'
            console.log('New version found, updating...');
          }
        };
      };
    }).catch(err => console.error('Service Worker registration failed', err));

    // Reload the page when the new service worker takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
