// Push notification management (Simplified - No FCM required)
class NotificationManager {
    constructor() {
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    }

    async requestPermission() {
        if (!this.isSupported) {
            console.warn('Push notifications not supported');
            return false;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    async subscribeToPush() {
        if (!this.isSupported) {
            console.warn('Push notifications not supported');
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Check if we already have a subscription
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                this.subscription = existingSubscription;
                return existingSubscription;
            }

            // Skip VAPID subscription for now - will work with local notifications
            console.log('Push notifications available but VAPID not configured');
            return null;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return null;
        }
    }

    async unsubscribeFromPush() {
        if (!this.subscription) return true;

        try {
            await this.subscription.unsubscribe();
            this.subscription = null;
            return true;
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            return false;
        }
    }

    // Save subscription to server (when VAPID is configured later)
    async saveSubscriptionToServer(subscription, userId) {
        try {
            // This would typically be an API call to your backend
            // For now, we'll store it in localStorage as an example
            const subscriptions = JSON.parse(localStorage.getItem('pushSubscriptions') || '{}');
            subscriptions[userId] = subscription;
            localStorage.setItem('pushSubscriptions', JSON.stringify(subscriptions));
            
            console.log('Push subscription saved for user:', userId);
            return true;
        } catch (error) {
            console.error('Failed to save subscription to server:', error);
            return false;
        }
    }

    // Initialize notifications for a user
    async initialize(userId) {
        if (!this.isSupported) {
            console.log('Push notifications not supported on this device');
            return false;
        }

        try {
            // Request permission first
            const hasPermission = await this.requestPermission();
            if (!hasPermission) {
                console.log('Push notification permission denied');
                return false;
            }

            // Try to subscribe (will work when VAPID is configured)
            const subscription = await this.subscribeToPush();
            if (subscription) {
                await this.saveSubscriptionToServer(subscription, userId);
            }
            
            console.log('Notifications initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
            return false;
        }
    }

    // Show a local notification (works without any setup)
    showLocalNotification(title, options = {}) {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return;
        }

        if (Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/icon-500.png',
                badge: '/icon-500.png',
                ...options
            });
        } else if (Notification.permission !== 'denied') {
            // Request permission and show notification
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, {
                        icon: '/icon-500.png',
                        badge: '/icon-500.png',
                        ...options
                    });
                }
            });
        }
    }

    // Schedule a notification (for reminders, etc.)
    scheduleNotification(title, options = {}, delayMs = 0) {
        setTimeout(() => {
            this.showLocalNotification(title, options);
        }, delayMs);
    }
}

// Global notification manager instance
const notificationManager = new NotificationManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = notificationManager;
} else {
    window.notificationManager = notificationManager;
}
