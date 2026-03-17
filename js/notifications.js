// Free Web Push Notifications - No FCM Required
// Uses browser's native push API with VAPID keys

class FreeNotificationManager {
    constructor() {
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        // Free VAPID keys - generate at: https://vapidkeys.com/
        this.vapidPublicKey = null;
    }

    async init() {
        if (!this.isSupported) {
            console.log('Push notifications not supported in this browser');
            return false;
        }
        await this.loadVapidKeys();
        return true;
    }

    async loadVapidKeys() {
        try {
            const { data, error } = await supabaseClient
                .from('app_settings')
                .select('value')
                .eq('key', 'vapid_public_key')
                .single();
            if (data?.value) {
                this.vapidPublicKey = data.value;
            }
        } catch (e) {
            console.log('Could not load VAPID keys:', e.message);
        }
    }

    async requestPermission() {
        if (!this.isSupported) return false;
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            this.showLocalNotification('In-Sync', 'Notifications enabled! 💕');
            return true;
        }
        return false;
    }

    async subscribeToPush() {
        if (!this.isSupported || !this.vapidPublicKey) {
            console.warn('Push notifications not available');
            return null;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey
                });
            }
            this.subscription = subscription;
            await this.saveSubscriptionToSupabase(subscription);
            return subscription;
        } catch (error) {
            console.error('Push subscription failed:', error);
            return null;
        }
    }

    async saveSubscriptionToSupabase(subscription) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;
            await supabaseClient
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    subscription: JSON.stringify(subscription),
                    created_at: new Date().toISOString()
                });
        } catch (e) {
            console.error('Failed to save subscription:', e);
        }
    }

    async unsubscribeFromPush() {
        if (!this.subscription) return true;
        try {
            await this.subscription.unsubscribe();
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                await supabaseClient.from('push_subscriptions').delete().eq('user_id', user.id);
            }
            this.subscription = null;
            return true;
        } catch (error) {
            console.error('Unsubscribe failed:', error);
            return false;
        }
    }

    showLocalNotification(title, body, icon = '/icon-500.png') {
        if (!this.isSupported || Notification.permission !== 'granted') return;
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: body,
                icon: icon,
                badge: '/icon-500.png',
                vibrate: [200, 100, 200]
            });
        });
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async initialize(userId) {
        if (!this.isSupported) {
            console.log('Push notifications not supported on this device');
            return false;
        }

        try {
            const hasPermission = await this.requestPermission();
            if (!hasPermission) {
                console.log('Push notification permission denied');
                return false;
            }

            const subscription = await this.subscribeToPush();
            if (subscription) {
                await this.saveSubscriptionToSupabase(subscription);
            }
            
            console.log('Notifications initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
            return false;
        }
    }
}

// Free in-app notifications using Supabase Realtime (no push needed)
class InAppNotificationManager {
    constructor() {
        this.channels = [];
    }

    async init(userId) {
        if (!userId) return;
        this.subscribeToNewMemories(userId);
        this.subscribeToNewMessages(userId);
    }

    subscribeToNewMemories(userId) {
        const channel = supabaseClient
            .channel('new-memories')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'memories',
                filter: `partner_id=eq.${userId}`
            }, (payload) => {
                this.showToast({
                    title: 'New Memory Shared! 💕',
                    body: 'Your partner shared a new memory',
                    type: 'memory'
                });
            })
            .subscribe();
        this.channels.push(channel);
    }

    subscribeToNewMessages(userId) {
        const channel = supabaseClient
            .channel('new-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `to_user_id=eq.${userId}`
            }, (payload) => {
                const text = payload.new.text;
                this.showToast({
                    title: 'New Message 💭',
                    body: text.length > 50 ? text.substring(0, 50) + '...' : text,
                    type: 'message'
                });
            })
            .subscribe();
        this.channels.push(channel);
    }

    showToast(notification) {
        // Don't show if user is on chat screen and it's a message
        const chatScreen = document.getElementById('chat-screen');
        if (notification.type === 'message' && chatScreen?.classList.contains('active')) {
            return;
        }

        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="flex:1">
                <div style="font-weight:700;font-size:15px;margin-bottom:4px">${notification.title}</div>
                <div style="font-size:14px;color:var(--text-secondary)">${notification.body}</div>
            </div>
            <button style="background:none;border:none;font-size:20px;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%">×</button>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 16px;
            background: var(--card-glass);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            z-index: 9999;
            max-width: 320px;
            min-width: 280px;
            animation: toastSlideIn 0.3s ease;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;
        `;

        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toast.remove();
        });

        toast.addEventListener('click', () => {
            if (notification.type === 'message') navigateTo('chat');
            else navigateTo('home');
            toast.remove();
        });

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
}

// Combined notification manager
const NotificationManager = {
    push: new FreeNotificationManager(),
    inApp: new InAppNotificationManager(),
    
    async init(userId) {
        await this.push.init();
        await this.inApp.init(userId);
        console.log('Notification systems ready');
    },
    
    async requestPermission() {
        return await this.push.requestPermission();
    },
    
    async subscribe() {
        return await this.push.subscribeToPush();
    },
    
    showLocal(title, body, icon) {
        this.push.showLocalNotification(title, body, icon);
    }
};

// Add CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Export
window.NotificationManager = NotificationManager;
