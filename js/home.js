let memoriesUnsubscribe = null;

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

    menuBtn.addEventListener('click', () => navigateTo('settings.html'));
    messagesBtn.addEventListener('click', () => navigateTo('chat.html'));
    fab.addEventListener('click', () => navigateTo('new-memory.html'));

    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (mediaViewerClose) mediaViewerClose.addEventListener('click', closeMediaViewer);

    loadMemories();
}

async function loadMemories() {
    if (!AppState.currentUser) return;

    const pId = AppState.partner?.id || AppState.currentUser.partnerId;

    if (memoriesUnsubscribe) {
        memoriesUnsubscribe();
    }

    memoriesUnsubscribe = subscribeMemories(
        AppState.currentUser.id,
        pId || undefined,
        (memories) => {
            AppState.memories = memories;
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
    container.innerHTML = AppState.memories.map(memory => renderMemoryCard(memory)).join('');

    container.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            const memoryId = card.dataset.id;
            const memory = AppState.memories.find(m => m.id === memoryId);
            if (memory) {
                openMemoryModal(memory);
            }
        });
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
                        <img src="${memory.uri}" alt="${memory.title}" class="card-image">
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

    if (!modal) return;

    const isMe = memory.userId === AppState.currentUser?.id;
    const authorName = isMe ? 'You' : AppState.partner?.name;

    if (memory.uri && (memory.type === 'photo' || memory.type === 'video')) {
        if (memory.type === 'video') {
            modalMedia.innerHTML = `<video src="${memory.uri}" controls></video>`;
        } else {
            modalMedia.innerHTML = `<img src="${memory.uri}" alt="${memory.title}">`;
        }
        modalMedia.style.cursor = 'pointer';
        modalMedia.onclick = () => openMediaViewer(memory);
    } else {
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

document.addEventListener('appReady', initHome);
