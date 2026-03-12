let selectedType = 'photo';
let selectedFile = null;
let cameraStream = null;

function initNewMemory() {
    const backBtn = document.getElementById('new-memory-back');
    const typeChips = document.querySelectorAll('.type-chip');
    const mediaPicker = document.getElementById('media-picker');
    const fileInput = document.getElementById('file-input');
    const titleInput = document.getElementById('memory-title');
    const titleCount = document.getElementById('title-count');
    const saveBtn = document.getElementById('save-memory-btn');
    const mediaSection = document.getElementById('media-section');

    // Camera and Choice elements
    const choiceCamera = document.getElementById('choice-camera');
    const choiceGallery = document.getElementById('choice-gallery');
    const choiceClose = document.getElementById('choice-close');
    const choiceBackdrop = document.getElementById('choice-backdrop');
    const cameraCaptureBtn = document.getElementById('camera-capture-btn');
    const cameraBackBtn = document.getElementById('camera-back-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('home.html'));
    }

    if (mediaPicker) {
        mediaPicker.addEventListener('click', openMediaChoices);
    }

    if (choiceGallery) choiceGallery.addEventListener('click', () => {
        closeMediaChoices();
        fileInput.click();
    });

    if (choiceCamera) choiceCamera.addEventListener('click', () => {
        closeMediaChoices();
        startCamera();
    });

    if (choiceClose) choiceClose.addEventListener('click', closeMediaChoices);
    if (choiceBackdrop) choiceBackdrop.addEventListener('click', closeMediaChoices);
    
    if (cameraCaptureBtn) cameraCaptureBtn.addEventListener('click', captureFromCamera);
    if (cameraBackBtn) cameraBackBtn.addEventListener('click', stopCamera);

    if (!typeChips.length) return;


    typeChips.forEach(chip => {
        const type = chip.dataset.type;
        const isLocked = !AppState.isPremium && (type === 'video' || type === 'song');
        
        if (isLocked) {
            chip.classList.add('locked');
            chip.innerHTML += '<span class="lock-icon">🔒</span>';
        }

        chip.addEventListener('click', () => {
            if (isLocked) {
                if (confirm('Videos and Songs are Premium features. Upgrade now?')) {
                    navigateTo('paywall.html');
                }
                return;
            }

            typeChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedType = chip.dataset.type;
            selectedFile = null;
            
            updateMediaSection();
            updateSaveButton();
        });
    });

    if (mediaPicker) {
        mediaPicker.addEventListener('click', () => {
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (titleInput) {
        titleInput.addEventListener('input', () => {
            titleCount.textContent = titleInput.value.length;
            updateSaveButton();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
    }

    updateMediaSection();
}

function updateMediaSection() {
    const mediaSection = document.getElementById('media-section');
    const mediaPicker = document.getElementById('media-picker');
    const mediaTypeIcon = document.getElementById('media-type-icon');
    const mediaPickerText = document.getElementById('media-picker-text');

    if (!mediaSection) return;

    if (selectedType === 'letter') {
        mediaSection.classList.add('hidden');
        return;
    }

    mediaSection.classList.remove('hidden');

    const typeConfig = {
        photo: { icon: '📷', text: 'Take or choose photo', accept: 'image/*' },
        video: { icon: '🎬', text: 'Select a video', accept: 'video/*' },
        audio: { icon: '🎙️', text: 'Record or pick audio', accept: 'audio/*' },
        song: { icon: '🎵', text: 'Select a song', accept: 'audio/*' },
    };

    const config = typeConfig[selectedType];
    if (config && mediaTypeIcon) mediaTypeIcon.textContent = config.icon;
    if (config && mediaPickerText) mediaPickerText.textContent = config.text;

    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.accept = config?.accept || 'image/*,video/*,audio/*';
    }

    resetMediaPicker();
}

function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    selectedFile = file;

    const mediaPicker = document.getElementById('media-picker');
    const mediaPreview = document.getElementById('media-preview');
    const mediaPreviewImg = document.getElementById('media-preview-img');
    const mediaAttached = document.getElementById('media-attached');
    const mediaPickerContent = mediaPicker?.querySelector('.media-picker-content');

    if (mediaPicker) mediaPicker.classList.add('has-media');
    if (mediaPickerContent) mediaPickerContent.classList.add('hidden');

    if (selectedType === 'photo') {
        if (mediaPreview && mediaPreviewImg) {
            mediaPreviewImg.src = URL.createObjectURL(file);
            mediaPreview.classList.remove('hidden');
        }
        if (mediaAttached) mediaAttached.classList.add('hidden');
    } else {
        if (mediaPreview) mediaPreview.classList.add('hidden');
        if (mediaAttached) mediaAttached.classList.remove('hidden');
    }

    updateSaveButton();
}

function resetMediaPicker() {
    const mediaPicker = document.getElementById('media-picker');
    const mediaPreview = document.getElementById('media-preview');
    const mediaAttached = document.getElementById('media-attached');
    const mediaPickerContent = mediaPicker?.querySelector('.media-picker-content');
    const fileInput = document.getElementById('file-input');

    if (mediaPicker) mediaPicker.classList.remove('has-media');
    if (mediaPreview) mediaPreview.classList.add('hidden');
    if (mediaAttached) mediaAttached.classList.add('hidden');
    if (mediaPickerContent) mediaPickerContent.classList.remove('hidden');
    if (fileInput) fileInput.value = '';
}

function updateSaveButton() {
    const titleInput = document.getElementById('memory-title');
    const saveBtn = document.getElementById('save-memory-btn');

    if (!titleInput || !saveBtn) return;

    const hasTitle = titleInput.value.trim().length > 0;
    const needsFile = selectedType !== 'letter';
    const hasFile = selectedFile !== null || needsFile === false;

    saveBtn.disabled = !hasTitle || (needsFile && !hasFile);
}

async function handleSave() {
    const title = document.getElementById('memory-title').value.trim();
    const description = document.getElementById('memory-description').value.trim();
    const saveBtn = document.getElementById('save-memory-btn');

    if (!title) {
        alert('Please enter a title for your memory.');
        return;
    }

    saveBtn.disabled = true;

    try {
        let uri = null;

        if (selectedFile && selectedType !== 'letter') {
            const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            uri = await uploadMemoryFile(AppState.currentUser.id, memoryId, selectedType, selectedFile);
        }

        await createMemory({
            userId: AppState.currentUser.id,
            partnerId: AppState.partner?.id || AppState.currentUser.partnerId || null,
            type: selectedType,
            title,
            description: description || null,
            uri: uri || null,
        });

        navigateTo('home.html');
    } catch (e) {
        alert('Error saving memory: ' + e.message);
    } finally {
        saveBtn.disabled = false;
    }
}

function openMediaChoices() {
    if (selectedType === 'photo' || selectedType === 'video') {
        document.getElementById('media-choice-modal').classList.remove('hidden');
    } else {
        document.getElementById('file-input').click();
    }
}

function closeMediaChoices() {
    document.getElementById('media-choice-modal').classList.add('hidden');
}

async function startCamera() {
    const cameraScreen = document.getElementById('camera-screen');
    const video = document.getElementById('camera-video');
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' }, 
            audio: false 
        });
        video.srcObject = cameraStream;
        cameraScreen.style.display = 'flex';
    } catch (err) {
        console.error('Camera access denied:', err);
        alert('Could not access camera. Please check permissions.');
    }
}

function stopCamera() {
    const cameraScreen = document.getElementById('camera-screen');
    const video = document.getElementById('camera-video');
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    video.srcObject = null;
    cameraScreen.style.display = 'none';
}

function captureFromCamera() {
    const video = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Use existing handleFileSelect logic style
        selectedFile = file;
        const mediaPicker = document.getElementById('media-picker');
        const mediaPreview = document.getElementById('media-preview');
        const mediaPreviewImg = document.getElementById('media-preview-img');
        const mediaAttached = document.getElementById('media-attached');
        const mediaPickerContent = mediaPicker?.querySelector('.media-picker-content');

        if (mediaPicker) mediaPicker.classList.add('has-media');
        if (mediaPickerContent) mediaPickerContent.classList.add('hidden');

        if (selectedType === 'photo') {
            if (mediaPreview && mediaPreviewImg) {
                mediaPreviewImg.src = URL.createObjectURL(file);
                mediaPreview.classList.remove('hidden');
            }
        } else {
            if (mediaAttached) mediaAttached.classList.remove('hidden');
        }

        updateSaveButton();
        stopCamera();
    }, 'image/jpeg', 0.8);
}

if (window.AppStateReady) {
    initNewMemory();
} else {
    document.addEventListener('appReady', initNewMemory);
}
