let messagesUnsubscribe = null;

function initChat() {
    const chatBack = document.getElementById('chat-back');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');

    if (!chatBack) return;

    chatBack.addEventListener('click', () => navigateTo('home'));

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

    // Set up MutationObserver for auto-scroll
    setupAutoScrollObserver();

    loadMessages();
}

let autoScrollObserver = null;

function setupAutoScrollObserver() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    // Clean up existing observer
    if (autoScrollObserver) {
        autoScrollObserver.disconnect();
    }

    // Create new observer to watch for child list changes
    autoScrollObserver = new MutationObserver((mutations) => {
        const wasAtBottom = isScrolledToBottom();
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any of the added nodes are message bubbles
                const hasNewMessages = Array.from(mutation.addedNodes).some(node => {
                    return node.nodeType === Node.ELEMENT_NODE && 
                           (node.classList?.contains('bubble-row') || 
                            node.querySelector?.('.bubble-row'));
                });

                if (hasNewMessages && (wasAtBottom || isOwnMessageAdded(mutation.addedNodes))) {
                    // Scroll after a short delay to ensure content is rendered
                    setTimeout(() => {
                        scrollToBottom();
                    }, 50);
                }
            }
        });
    });

    // Start observing the container
    autoScrollObserver.observe(container, {
        childList: true,
        subtree: true
    });
}

function isOwnMessageAdded(addedNodes) {
    return Array.from(addedNodes).some(node => {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('me')) {
            return true;
        }
        return node.querySelector?.('.me') !== null;
    });
}

// Ensure we scroll to bottom when screen becomes visible
document.addEventListener('screenShow', (e) => {
    if (e.detail.screenId === 'chat-screen') {
        // Delay scrolling to ensure content is rendered and container has proper height
        setTimeout(() => {
            scrollToBottom();
        }, 150);
        
        // Additional scroll after a longer delay to handle any late-rendering content
        setTimeout(() => {
            scrollToBottom();
        }, 300);
    } else if (autoScrollObserver) {
        // Clean up observer when leaving chat screen
        autoScrollObserver.disconnect();
        autoScrollObserver = null;
    }
});

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
            const wasAtBottom = isScrolledToBottom();
            AppState.messages = messages;
            renderMessages();
            
            // Only auto-scroll if user was already at bottom or if this is their own message
            const lastMessage = messages[messages.length - 1];
            const isOwnMessage = lastMessage?.fromUserId === AppState.currentUser.id;
            
            if (wasAtBottom || isOwnMessage) {
                scrollToBottom();
            }
        }
    );
    
    // Initial scroll after messages are loaded
    setTimeout(() => {
        scrollToBottom();
    }, 100);
}

// Helper function to check if user is at bottom of chat
function isScrolledToBottom() {
    const container = document.getElementById('chat-messages');
    if (!container) return true;
    
    const threshold = 100; // 100px threshold
    return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
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

    // Scroll after the DOM has been updated
    requestAnimationFrame(() => {
        scrollToBottom();
    });
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    // Force the container to have a height before scrolling
    if (container.scrollHeight === 0) {
        return; // Don't try to scroll if there's no content
    }

    const scroll = () => {
        container.scrollTop = container.scrollHeight;
    };

    // Immediate scroll
    scroll();
    
    // Use requestAnimationFrame for smooth scrolling after DOM updates
    requestAnimationFrame(() => {
        scroll();
    });
    
    // Additional scroll attempts with different timing
    setTimeout(scroll, 50);
    setTimeout(scroll, 100);
    setTimeout(scroll, 250);
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

if (window.AppStateReady) {
    initChat();
} else {
    document.addEventListener('appReady', initChat);
}
