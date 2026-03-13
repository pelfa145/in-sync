// Dynamic module loader for better performance
class ModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
    }

    async loadModule(moduleName, modulePath) {
        if (this.loadedModules.has(moduleName)) {
            return;
        }

        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        const loadPromise = this.loadScript(modulePath);
        this.loadingPromises.set(moduleName, loadPromise);

        try {
            await loadPromise;
            this.loadedModules.add(moduleName);
        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
            this.loadingPromises.delete(moduleName);
            throw error;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// Lazy load non-critical modules
const moduleLoader = new ModuleLoader();

// Load modules based on user interaction
function loadHomeModule() {
    return moduleLoader.loadModule('home', 'js/home.js');
}

function loadChatModule() {
    return moduleLoader.loadModule('chat', 'js/chat.js');
}

function loadSettingsModule() {
    return moduleLoader.loadModule('settings', 'js/settings.js');
}

function loadRelationshipModule() {
    return moduleLoader.loadModule('relationship', 'js/relationship.js');
}

// Preload critical modules
function preloadCriticalModules() {
    // Only preload essential modules
    const criticalModules = [
        { name: 'home', path: 'js/home.js' }
    ];

    criticalModules.forEach(module => {
        moduleLoader.loadModule(module.name, module.path);
    });
}

// Export for use in other files
window.ModuleLoader = ModuleLoader;
window.moduleLoader = moduleLoader;
window.loadHomeModule = loadHomeModule;
window.loadChatModule = loadChatModule;
window.loadSettingsModule = loadSettingsModule;
window.loadRelationshipModule = loadRelationshipModule;
window.preloadCriticalModules = preloadCriticalModules;
