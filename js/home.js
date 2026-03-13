let memoriesUnsubscribe = null;
let commentsUnsubscribe = null;
let activeMemoryId = null;
let virtualScrollState = {
    visibleItems: [],
    startIndex: 0,
    endIndex: 0,
    itemHeight: 280,
    visibleHeight: 0,
    scrollTop: 0,
    totalHeight: 0
};

function initHome() {
    const menuBtn = document.getElementById('menu-btn');
    const messagesBtn = document.getElementById('messages-btn');
    const fab = document.getElementById('fab-new-memory');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalClose = document.getElementById('modal-close');
    const mediaViewerClose = document.getElementById('media-viewer-close');

    if (!menuBtn) return;

    document.getElementById('user-greeting').textContent = AppState.currentUser?.name?.split(' ')[0] || 'User';

    if (AppState.partner) {
        document.getElementById('partner-row').classList.remove('hidden');
        document.getElementById('partner-name').textContent = AppState.partner.name?.split(' ')[0];
    }

    // Initialize push notifications
    if (AppState.currentUser && window.notificationManager) {
        window.notificationManager.initialize(AppState.currentUser.id).catch(console.error);
    }

    menuBtn.addEventListener('click', () => navigateTo('settings'));
    messagesBtn.addEventListener('click', () => navigateTo('chat'));
    fab.addEventListener('click', () => {
        // Check quantity limit for free users
        if (!AppState.isPremium && AppState.memories.length >= 3) {
            alert('You have reached the free limit of 3 memories. Please upgrade to Premium to add more!');
            navigateTo('paywall.html');
            return;
        }
        navigateTo('new-memory');
    });

    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (mediaViewerClose) mediaViewerClose.addEventListener('click', closeMediaViewer);

    const saveMediaBtn = document.getElementById('modal-save-media');
    if (saveMediaBtn) {
        saveMediaBtn.addEventListener('click', handleSaveMedia);
    }

    const commentInput = document.getElementById('comment-input');
    const commentSendBtn = document.getElementById('comment-send-btn');
    if (commentInput && commentSendBtn) {
        commentInput.addEventListener('input', () => {
            commentSendBtn.disabled = !commentInput.value.trim();
        });
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !commentSendBtn.disabled) {
                handleSendComment();
            }
        });
        commentSendBtn.addEventListener('click', handleSendComment);
    }

    loadMemories();
}

async function loadMemories() {
    if (!AppState.currentUser) return;

    const pId = AppState.partner?.id || AppState.currentUser.partnerId;
    const cacheKey = `memories_${AppState.currentUser.id}_${pId || 'single'}`;

    // Try to get from cache first
    const cachedMemories = window.CacheManager?.dataCache?.get(cacheKey);
    if (cachedMemories) {
        AppState.memories = cachedMemories;
        renderMemories();
    }

    if (memoriesUnsubscribe) {
        memoriesUnsubscribe();
    }

    memoriesUnsubscribe = subscribeMemories(
        AppState.currentUser.id,
        pId || undefined,
        (memories) => {
            AppState.memories = memories;
            // Cache the memories
            window.CacheManager?.dataCache?.set(cacheKey, memories);
            renderMemories();
        }
    );
}

function renderMemories() {
    const container = document.getElementById('memories-list');
    const emptyState = document.getElementById('empty-state');

    if (!container) return;

    if (AppState.memories.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    
    // Initialize virtual scrolling (will handle small vs large lists)
    initVirtualScroll(container);
    
    // Update scroll state
    if (AppState.memories.length > 10) {
        updateVirtualScroll();
    }
}

function initVirtualScroll(container) {
    // Calculate available height more accurately
    const headerHeight = document.querySelector('.home-header')?.offsetHeight || 200;
    const fabHeight = 80; // Approximate FAB height + spacing
    const availableHeight = window.innerHeight - headerHeight - fabHeight - 40; // Extra padding
    
    virtualScrollState.visibleHeight = Math.max(availableHeight, 400);
    virtualScrollState.totalHeight = AppState.memories.length * virtualScrollState.itemHeight;
    
    // Reset container styles first
    container.style.height = '';
    container.style.overflowY = '';
    container.style.position = '';
    
    // Only apply virtual scrolling if there are many memories
    if (AppState.memories.length > 10) {
        container.style.height = `${virtualScrollState.visibleHeight}px`;
        container.style.overflowY = 'auto';
        container.style.position = 'relative';
        
        // Create spacer div for total height
        if (!container.querySelector('.virtual-spacer')) {
            const spacer = document.createElement('div');
            spacer.className = 'virtual-spacer';
            spacer.style.height = `${virtualScrollState.totalHeight}px`;
            spacer.style.position = 'absolute';
            spacer.style.top = '0';
            spacer.style.left = '0';
            spacer.style.right = '0';
            spacer.style.pointerEvents = 'none';
            container.appendChild(spacer);
        } else {
            container.querySelector('.virtual-spacer').style.height = `${virtualScrollState.totalHeight}px`;
        }
        
        // Add scroll listener
        container.removeEventListener('scroll', handleVirtualScroll);
        container.addEventListener('scroll', handleVirtualScroll, { passive: true });
    } else {
        // For small lists, use normal scrolling
        const spacer = container.querySelector('.virtual-spacer');
        if (spacer) spacer.remove();
        container.removeEventListener('scroll', handleVirtualScroll);
        renderNormalMemories();
    }
}

function handleVirtualScroll(e) {
    const container = e.target;
    virtualScrollState.scrollTop = container.scrollTop;
    updateVirtualScroll();
}

function updateVirtualScroll() {
    const { scrollTop, visibleHeight, itemHeight } = virtualScrollState;
    const totalItems = AppState.memories.length;
    
    // Calculate visible range
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
        startIndex + Math.ceil(visibleHeight / itemHeight) + 2, // Buffer for smooth scrolling
        totalItems - 1
    );
    
    // Only update if range changed
    if (startIndex === virtualScrollState.startIndex && endIndex === virtualScrollState.endIndex) {
        return;
    }
    
    virtualScrollState.startIndex = startIndex;
    virtualScrollState.endIndex = endIndex;
    
    // Render visible items
    renderVisibleItems();
}

function renderNormalMemories() {
    const container = document.getElementById('memories-list');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    container.querySelectorAll('.virtual-item').forEach(item => item.remove());
    
    // Render all memories normally
    container.innerHTML = AppState.memories.map(memory => renderMemoryCard(memory)).join('');
    
    // Setup event listeners
    container.querySelectorAll('.card').forEach(card => {
        const memoryId = card.dataset.id;
        const memory = AppState.memories.find(m => m.id === memoryId);
        if (memory) {
            card.addEventListener('click', () => openMemoryModal(memory));
        }
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const memoryId = btn.dataset.id;
            if (confirm('Delete this memory?')) {
                await deleteMemory(memoryId, AppState.currentUser.id);
            }
        });
    });
    
    // Setup lazy loading
    setupLazyLoading();
}

function renderVisibleItems() {
    const container = document.getElementById('memories-list');
    const { startIndex, endIndex, itemHeight } = virtualScrollState;
    
    // Remove existing items
    container.querySelectorAll('.virtual-item').forEach(item => item.remove());
    
    // Render visible items
    for (let i = startIndex; i <= endIndex; i++) {
        const memory = AppState.memories[i];
        if (!memory) continue;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'virtual-item';
        itemDiv.style.position = 'absolute';
        itemDiv.style.top = `${i * itemHeight}px`;
        itemDiv.style.left = '0';
        itemDiv.style.right = '0';
        itemDiv.style.height = `${itemHeight}px`;
        itemDiv.innerHTML = renderMemoryCard(memory);
        
        // Add event listeners
        const card = itemDiv.querySelector('.card');
        if (card) {
            card.addEventListener('click', () => openMemoryModal(memory));
        }
        
        const deleteBtn = itemDiv.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this memory?')) {
                    await deleteMemory(memory.id, AppState.currentUser.id);
                }
            });
        }
        
        container.appendChild(itemDiv);
    }
    
    // Setup lazy loading for visible images
    setupLazyLoading();
}

function renderMemoryCard(memory) {
    const isMe = memory.userId === AppState.currentUser?.id;
    const hasMedia = memory.uri && (memory.type === 'photo' || memory.type === 'video');

    const typeIcons = {
        photo: '📸',
        video: '🎬',
        audio: '🎙️',
        song: '🎵',
        letter: '💌',
    };

    const date = new Date(memory.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });

    if (hasMedia) {
        return `
            <div class="card-wrapper">
                <div class="card" data-id="${memory.id}">
                    <div class="card-image-container">
                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f2f2f7' width='400' height='300'/%3E%3Ctext fill='%238e8e93' font-family='system-ui' font-size='14' text-anchor='middle' x='200' y='150'%3ELoading...%3C/text%3E%3C/svg%3E" data-src="${memory.uri}" alt="${memory.title}" class="card-image lazy-image">
                        <div class="card-image-overlay"></div>
                        <div class="card-floating-badge">
                            <span class="card-floating-badge-text">${memory.type.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="card-text-overlay">
                            <button class="delete-btn delete-btn-overlay" data-id="${memory.id}">×</button>
                            <h3 class="card-title card-title-light">${escapeHtml(memory.title)}</h3>
                            <div class="card-footer">
                                <span class="author-badge ${isMe ? 'me' : 'partner'}">
                                    <span class="author-text">${isMe ? 'You' : AppState.partner?.name?.split(' ')[0]}</span>
                                </span>
                                <span class="card-date card-date-light">${date}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="card-wrapper">
            <div class="card" data-id="${memory.id}">
                <div class="card-content">
                    <div class="card-header">
                        <div class="type-icon-container">
                            <span class="type-icon-text">${typeIcons[memory.type] || '📝'}</span>
                        </div>
                        <button class="delete-btn" data-id="${memory.id}">×</button>
                    </div>
                    <h3 class="card-title">${escapeHtml(memory.title)}</h3>
                    ${memory.description ? `<p class="card-desc">${escapeHtml(memory.description)}</p>` : ''}
                    <div class="card-footer">
                        <span class="author-badge ${isMe ? 'me' : 'partner'}">
                            <span class="author-text">${isMe ? 'You' : AppState.partner?.name?.split(' ')[0]}</span>
                        </span>
                        <span class="card-date">${date}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function openMemoryModal(memory) {
    const modal = document.getElementById('memory-modal');
    const modalMedia = document.getElementById('modal-media');
    const modalTypeBadge = document.getElementById('modal-type-badge');
    const modalDate = document.getElementById('modal-date');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalAuthorAvatar = document.getElementById('modal-author-avatar');
    const modalAuthorName = document.getElementById('modal-author-name');
    const commentInput = document.getElementById('comment-input');
    const commentsList = document.getElementById('comments-list');
    const saveMediaBtn = document.getElementById('modal-save-media');

    if (!modal) return;

    activeMemoryId = memory.id;
    if (commentInput) commentInput.value = '';
    if (commentsList) commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Loading comments...</p>';

    // Subscribe to comments
    if (commentsUnsubscribe) commentsUnsubscribe();
    commentsUnsubscribe = subscribeComments(memory.id, (comments) => {
        renderComments(comments);
    });

    const isMe = memory.userId === AppState.currentUser?.id;
    const authorName = isMe ? 'You' : AppState.partner?.name;

    if (memory.uri && (memory.type === 'photo' || memory.type === 'video' || memory.type === 'audio' || memory.type === 'song')) {
        if (saveMediaBtn) {
            saveMediaBtn.style.display = 'block';
            saveMediaBtn.dataset.url = memory.uri;
            saveMediaBtn.dataset.type = memory.type;
            saveMediaBtn.dataset.title = memory.title;
        }

        if (memory.type === 'video') {
            modalMedia.innerHTML = `<video src="${memory.uri}" controls></video>`;
        } else if (memory.type === 'photo') {
            modalMedia.innerHTML = `<img src="${memory.uri}" alt="${memory.title}">`;
        } else {
            const typeIcons = {
                audio: '🎙️',
                song: '🎵',
            };
            modalMedia.innerHTML = `<span style="font-size: 64px;">${typeIcons[memory.type] || '📝'}</span><audio src="${memory.uri}" controls style="width: 100%; margin-top: 20px;"></audio>`;
        }
        modalMedia.style.cursor = memory.type === 'photo' ? 'pointer' : 'default';
        modalMedia.onclick = memory.type === 'photo' ? () => openMediaViewer(memory) : null;
    } else {
        if (saveMediaBtn) saveMediaBtn.style.display = 'none';
        
        const typeIcons = {
            photo: '📸',
            video: '🎬',
            audio: '🎙️',
            song: '🎵',
            letter: '💌',
        };
        modalMedia.innerHTML = `<span style="font-size: 64px;">${typeIcons[memory.type] || '📝'}</span>`;
        modalMedia.style.cursor = 'default';
        modalMedia.onclick = null;
    }

    modalTypeBadge.textContent = memory.type.toUpperCase();
    modalDate.textContent = new Date(memory.createdAt).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    modalTitle.textContent = memory.title;
    modalDesc.textContent = memory.description || '';
    modalDesc.style.display = memory.description ? 'block' : 'none';
    modalAuthorAvatar.textContent = authorName?.[0] || '?';
    modalAuthorName.textContent = authorName;

    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('memory-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    if (commentsUnsubscribe) {
        commentsUnsubscribe();
        commentsUnsubscribe = null;
    }
    activeMemoryId = null;
}

async function handleSaveMedia(e) {
    const btn = e.target;
    const url = btn.dataset.url;
    const type = btn.dataset.type;
    const title = btn.dataset.title || 'InSync_Media';

    if (!url) return;

    const originalText = btn.textContent;
    btn.textContent = 'Downloading...';
    btn.disabled = true;

    try {
        await downloadFile(url, `${title}_${Date.now()}`);
    } catch (err) {
        console.error('Download failed:', err);
        alert('Failed to download media. Please try again.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function downloadFile(url, filename) {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    
    // Detect extension from content type
    let ext = 'bin';
    if (blob.type.includes('image/jpeg')) ext = 'jpg';
    else if (blob.type.includes('image/png')) ext = 'png';
    else if (blob.type.includes('video/mp4')) ext = 'mp4';
    else if (blob.type.includes('audio/mpeg')) ext = 'mp3';
    else if (blob.type.includes('audio/wav')) ext = 'wav';
    else if (blob.type.includes('audio/')) ext = 'm4a';
    
    link.download = `${filename}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
}

function renderComments(comments) {
    const container = document.getElementById('comments-list');
    if (!container) return;

    if (comments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No comments yet. Be the first!</p>';
        return;
    }

    container.innerHTML = comments.map(comment => {
        const isMe = comment.userId === AppState.currentUser?.id;
        const authorName = isMe ? (AppState.currentUser?.name || 'You') : (AppState.partner?.name || 'Partner');
        const initial = authorName[0] || '?';

        return `
            <div class="comment-item">
                <div class="comment-avatar">${initial}</div>
                <div class="comment-content">
                    <span class="comment-author">${authorName}</span>
                    <p class="comment-text">${escapeHtml(comment.text)}</p>
                </div>
            </div>
        `;
    }).join('');

    container.scrollTop = container.scrollHeight;
}

async function handleSendComment() {
    const input = document.getElementById('comment-input');
    const btn = document.getElementById('comment-send-btn');
    const text = input.value.trim();

    if (!text || !activeMemoryId || !AppState.currentUser) return;

    input.value = '';
    btn.disabled = true;

    try {
        await addComment(activeMemoryId, AppState.currentUser.id, text);
    } catch (e) {
        console.error('Failed to add comment', e);
        alert('Failed to send comment');
        btn.disabled = false;
        input.value = text;
    }
}


function openMediaViewer(memory) {
    const viewer = document.getElementById('media-viewer');
    const viewerContent = document.getElementById('media-viewer-content');
    const viewerType = document.getElementById('viewer-type');
    const viewerTitle = document.getElementById('viewer-title');
    const viewerDesc = document.getElementById('viewer-desc');
    const viewerMeta = document.getElementById('viewer-meta');

    if (!viewer) return;

    const isMe = memory.userId === AppState.currentUser?.id;
    const authorName = isMe ? 'You' : AppState.partner?.name;

    if (memory.type === 'video') {
        viewerContent.innerHTML = `<video src="${memory.uri}" controls></video>`;
    } else {
        viewerContent.innerHTML = `<img src="${memory.uri}" alt="${memory.title}">`;
    }

    viewerType.textContent = memory.type.toUpperCase();
    viewerTitle.textContent = memory.title;
    viewerDesc.textContent = memory.description || '';
    viewerDesc.style.display = memory.description ? 'block' : 'none';
    viewerMeta.textContent = `${new Date(memory.createdAt).toLocaleDateString()} · ${authorName}`;

    viewer.classList.remove('hidden');
    closeModal();
}

function closeMediaViewer() {
    const viewer = document.getElementById('media-viewer');
    if (viewer) {
        viewer.classList.add('hidden');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Lazy loading implementation
function setupLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                
                if (src) {
                    img.style.opacity = '0';
                    img.style.transition = 'opacity 0.3s ease';
                    
                    // Try to get from image cache first
                    if (window.CacheManager?.imageCache) {
                        try {
                            const cachedUrl = await window.CacheManager.imageCache.get(src);
                            img.src = cachedUrl;
                        } catch (error) {
                            console.error('Image cache failed:', error);
                            img.src = src;
                        }
                    } else {
                        img.src = src;
                    }
                    
                    img.onload = () => {
                        img.style.opacity = '1';
                    };
                    img.onerror = () => {
                        img.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 300\'%3E%3Crect fill=\'%23f2f2f7\' width=\'400\' height=\'300\'/%3E%3Ctext fill=\'%23ff3b30\' font-family=\'system-ui\' font-size=\'14\' text-anchor=\'middle\' x=\'200\' y=\'150\'%3EFailed to load%3C/text%3E%3C/svg%3E';
                    };
                    
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.1
    });

    document.querySelectorAll('.lazy-image').forEach(img => {
        imageObserver.observe(img);
    });
}

if (window.AppStateReady) {
    initHome();
} else {
    document.addEventListener('appReady', initHome);
}
