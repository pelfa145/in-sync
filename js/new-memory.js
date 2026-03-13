let selectedType = 'photo';
let selectedFile = null;
let selectedThumbnail = null;
let cameraStream = null;
let currentFacingMode = 'user';

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
    const cameraFlipBtn = document.getElementById('camera-flip-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('home'));
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
        currentFacingMode = 'user'; // Reset to selfie when opening
        startCamera();
    });

    if (choiceClose) choiceClose.addEventListener('click', closeMediaChoices);
    if (choiceBackdrop) choiceBackdrop.addEventListener('click', closeMediaChoices);
    
    if (cameraCaptureBtn) cameraCaptureBtn.addEventListener('click', captureFromCamera);
    if (cameraBackBtn) cameraBackBtn.addEventListener('click', stopCamera);
    if (cameraFlipBtn) cameraFlipBtn.addEventListener('click', flipCamera);

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
                    navigateTo('paywall');
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
}

// Image compression utility
async function compressImage(file, maxWidth = 800, quality = 0.7) {
    if (!file || !file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Calculate new dimensions
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                (blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                },
                'image/jpeg',
                quality
            );
        };

        img.src = URL.createObjectURL(file);
    });
}

// Video compression utility
async function compressVideo(file, maxWidth = 1280, quality = 0.8) {
    if (!file || !file.type.startsWith('video/')) {
        return file;
    }

    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        video.onloadedmetadata = () => {
            // Calculate new dimensions
            let { videoWidth, videoHeight } = video;
            if (videoWidth > maxWidth) {
                videoHeight = (videoHeight * maxWidth) / videoWidth;
                videoWidth = maxWidth;
            }

            canvas.width = videoWidth;
            canvas.height = videoHeight;

            // Seek to middle frame for thumbnail
            video.currentTime = video.duration / 2;
        };

        video.onseeked = () => {
            // Draw frame
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            
            canvas.toBlob(
                (blob) => {
                    // Create compressed video file (using original video but smaller if possible)
                    if (file.size > 50 * 1024 * 1024) { // If larger than 50MB
                        // For large videos, we'll create a thumbnail and keep original
                        const thumbnailFile = new File([blob], `thumb_${file.name}`, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve({ compressedFile: file, thumbnail: thumbnailFile });
                    } else {
                        // For smaller videos, keep original but note it's optimized
                        resolve({ compressedFile: file, thumbnail: null });
                    }
                },
                'image/jpeg',
                0.7
            );
        };

        video.src = URL.createObjectURL(file);
    });
}

// Compression indicator functions
function showCompressionIndicator() {
    const mediaPicker = document.getElementById('media-picker');
    if (mediaPicker) {
        mediaPicker.style.opacity = '0.6';
        mediaPicker.style.pointerEvents = 'none';
        
        // Add loading text
        const existingIndicator = mediaPicker.querySelector('.compression-indicator');
        if (!existingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'compression-indicator';
            indicator.innerHTML = '🔄 Compressing...';
            indicator.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10;
            `;
            mediaPicker.appendChild(indicator);
        }
    }
}

function hideCompressionIndicator() {
    const mediaPicker = document.getElementById('media-picker');
    if (mediaPicker) {
        mediaPicker.style.opacity = '1';
        mediaPicker.style.pointerEvents = 'auto';
        
        const indicator = mediaPicker.querySelector('.compression-indicator');
        if (indicator) indicator.remove();
    }
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

async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show compression indicator
    showCompressionIndicator();

    try {
        // Compress image if it's a photo
        if (selectedType === 'photo' && file.type.startsWith('image/')) {
            selectedFile = await compressImage(file);
            console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
        }
        // Compress video if it's a video
        else if (selectedType === 'video' && file.type.startsWith('video/')) {
            const result = await compressVideo(file);
            selectedFile = result.compressedFile;
            selectedThumbnail = result.thumbnail;
            console.log(`Video processed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
        }
        // Handle audio files (no compression needed)
        else if (selectedType === 'audio' && file.type.startsWith('audio/')) {
            selectedFile = file;
            console.log(`Audio file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        }
        // Handle other files
        else {
            selectedFile = file;
            console.log(`File: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        }
    } catch (error) {
        console.error('File compression failed:', error);
        selectedFile = file; // Fallback to original file
    } finally {
        hideCompressionIndicator();
    }

    const mediaPicker = document.getElementById('media-picker');
    const mediaPreview = document.getElementById('media-preview');
    const mediaPreviewImg = document.getElementById('media-preview-img');
    const mediaAttached = document.getElementById('media-attached');
    const mediaPickerContent = mediaPicker?.querySelector('.media-picker-content');

    if (mediaPicker) mediaPicker.classList.add('has-media');
    if (mediaPickerContent) mediaPickerContent.classList.add('hidden');

    if (selectedType === 'photo') {
        if (mediaPreview && mediaPreviewImg) {
            mediaPreviewImg.src = URL.createObjectURL(selectedFile);
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
        let thumbnailUri = null;

        if (selectedFile && selectedType !== 'letter') {
            const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            
            // Upload main file
            uri = await uploadMemoryFile(AppState.currentUser.id, memoryId, selectedType, selectedFile);
            
            // Upload thumbnail if it exists (for videos)
            if (selectedThumbnail) {
                const thumbnailId = `thumb_${memoryId}`;
                thumbnailUri = await uploadMemoryFile(AppState.currentUser.id, thumbnailId, 'photo', selectedThumbnail);
            }
        }

        await createMemory({
            userId: AppState.currentUser.id,
            partnerId: AppState.partner?.id || AppState.currentUser.partnerId || null,
            type: selectedType,
            title,
            description: description || null,
            uri: uri || null,
            thumbnailUri: thumbnailUri || null,
        });

        navigateTo('home');
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
    
    // Stop any existing stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: { 
            facingMode: currentFacingMode === 'user' ? 'user' : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: false
    };
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = cameraStream;
        cameraScreen.style.display = 'flex';
    } catch (err) {
        console.error('Camera access error:', err);
        
        // If 'user' failed, try a generic request as fallback
        if (currentFacingMode === 'user') {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = cameraStream;
                cameraScreen.style.display = 'flex';
            } catch (fallbackErr) {
                alert('Could not access camera. Please check permissions.');
            }
        } else {
            alert('Could not access camera. Please check permissions.');
        }
    }
}

function flipCamera() {
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';
    startCamera(); // Restart with new mode
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
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
        try {
            // Compress the captured image
            const compressedFile = await compressImage(new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' }));
            selectedFile = compressedFile;
        } catch (error) {
            console.error('Camera image compression failed:', error);
            selectedFile = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        }
        
        const mediaPicker = document.getElementById('media-picker');
        const mediaPreview = document.getElementById('media-preview');
        const mediaPreviewImg = document.getElementById('media-preview-img');
        const mediaAttached = document.getElementById('media-attached');
        const mediaPickerContent = mediaPicker?.querySelector('.media-picker-content');

        if (mediaPicker) mediaPicker.classList.add('has-media');
        if (mediaPickerContent) mediaPickerContent.classList.add('hidden');

        if (selectedType === 'photo') {
            if (mediaPreview && mediaPreviewImg) {
                mediaPreviewImg.src = URL.createObjectURL(selectedFile);
                mediaPreview.classList.remove('hidden');
            }
        } else {
            if (mediaAttached) mediaAttached.classList.remove('hidden');
        }

        updateSaveButton();
        stopCamera();
    }, 'image/jpeg', 0.8);
}

// Image compression function
async function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                } else {
                    reject(new Error('Compression failed'));
                }
            }, 'image/jpeg', quality);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

if (window.AppStateReady) {
    initNewMemory();
} else {
    document.addEventListener('appReady', initNewMemory);
}
