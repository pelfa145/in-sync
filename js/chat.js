let messagesUnsubscribe = null;

function initChat() {
    const chatBack = document.getElementById('chat-back');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');

    if (!chatBack) return;

    chatBack.addEventListener('click', () => navigateTo('home.html'));

    if (!AppState.partner && !AppState.currentUser?.partnerId) {
        document.getElementById('no-partner-chat').classList.remove('hidden');
        document.getElementById('chat-messages').classList.add('hidden');
        document.getElementById('chat-input-area').classList.add('hidden');
        return;
    }

    document.getElementById('no-partner-chat').classList.add('hidden');
    document.getElementById('chat-messages').classList.remove('hidden');
    document.getElementById('chat-input-area').classList.remove('hidden');

    if (sendBtn) {
        sendBtn.addEventListener('click', handleSend);
    }

    if (chatInput) {
        chatInput.addEventListener('input', () => {
            const hasText = chatInput.value.trim().length > 0;
            sendBtn.disabled = !hasText;
            
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    handleSend();
                }
            }
        });
    }

    loadMessages();
}

async function loadMessages() {
    if (!AppState.currentUser) return;

    const pId = AppState.partner?.id || AppState.currentUser.partnerId;
    if (!pId) return;

    if (messagesUnsubscribe) {
        messagesUnsubscribe();
    }

    messagesUnsubscribe = subscribeMessages(
        AppState.currentUser.id,
        pId,
        (messages) => {
            AppState.messages = messages;
            renderMessages();
            scrollToBottom();
        }
    );
}

function renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = AppState.messages.map(msg => {
        const isMe = msg.fromUserId === AppState.currentUser?.id;
        const time = new Date(msg.createdAt).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });

        return `
            <div class="bubble-row ${isMe ? 'me' : 'partner'}">
                <div class="bubble ${isMe ? 'me' : 'partner'}">
                    <p class="bubble-text">${escapeHtml(msg.text)}</p>
                    <span class="bubble-time">${time}</span>
                </div>
            </div>
        `;
    }).join('');
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

async function handleSend() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    if (!chatInput || !chatInput.value.trim()) return;
    if (!AppState.currentUser) return;

    const pId = AppState.partner?.id || AppState.currentUser.partnerId;
    if (!pId) return;

    const text = chatInput.value.trim();
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    try {
        await sendMessage({
            fromUserId: AppState.currentUser.id,
            toUserId: pId,
            text,
        });
    } catch (e) {
        console.error('Chat: send failed', e);
        alert('Failed to send message');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('appReady', initChat);
