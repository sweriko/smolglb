class SmolTextures {
    constructor() {
        this.apiKey = localStorage.getItem('tinypng-api-key') || '';
        this.workerUrl = 'http://127.0.0.1:8787'; // Local development worker URL
        this.processingQueue = new Map();
        this.aspectRatioLocked = true;
        this.currentAspectRatio = null;
        this.resizePercentage = 100; // Default to 100% (no resize)
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadApiKey();
        // Initialize with 100% preset selected by default (no resize)
        this.setResizePreset(100);
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const apiKeyInput = document.getElementById('apiKey');
        const saveApiKeyBtn = document.getElementById('saveApiKey');

        // API Key management
        apiKeyInput.addEventListener('input', (e) => {
            this.apiKey = e.target.value;
            this.toggleCustomPlaceholder();
        });

        // Handle custom placeholder visibility
        apiKeyInput.addEventListener('focus', () => {
            this.toggleCustomPlaceholder();
        });

        apiKeyInput.addEventListener('blur', () => {
            this.toggleCustomPlaceholder();
        });

        saveApiKeyBtn.addEventListener('click', () => {
            this.saveApiKey();
        });

        // Resizer controls
        const resize50Btn = document.getElementById('resize50');
        const resize75Btn = document.getElementById('resize75');
        const resize100Btn = document.getElementById('resize100');
        const customWidthInput = document.getElementById('customWidth');
        const customHeightInput = document.getElementById('customHeight');
        const aspectRatioLockBtn = document.getElementById('aspectRatioLock');

        resize50Btn.addEventListener('click', () => {
            this.setResizePreset(50);
        });

        resize75Btn.addEventListener('click', () => {
            this.setResizePreset(75);
        });

        resize100Btn.addEventListener('click', () => {
            this.setResizePreset(100);
        });

        customWidthInput.addEventListener('input', (e) => {
            this.handleCustomDimensionChange('width', e.target.value);
        });

        customHeightInput.addEventListener('input', (e) => {
            this.handleCustomDimensionChange('height', e.target.value);
        });

        aspectRatioLockBtn.addEventListener('click', () => {
            this.toggleAspectRatioLock();
        });

        // File input
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drop zone events
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        dropZone.addEventListener('dragleave', () => {
            // No styling changes needed for local drop zone events
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            // Remove green outline
            dropZone.classList.remove('border-green-500', 'shadow-[8px_8px_0px_rgba(34,197,94,0.3)]');
            this.handleFiles(e.dataTransfer.files);
        });

        // Global drag-drop functionality
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            // Add green outline to drop zone when dragging files anywhere on page
            const dropZone = document.getElementById('dropZone');
            dropZone.classList.add('border-green-500', 'shadow-[8px_8px_0px_rgba(34,197,94,0.3)]');
        });

        document.addEventListener('dragleave', (e) => {
            // Only remove outline if leaving the entire window
            if (e.clientX === 0 && e.clientY === 0) {
                const dropZone = document.getElementById('dropZone');
                dropZone.classList.remove('border-green-500', 'shadow-[8px_8px_0px_rgba(34,197,94,0.3)]');
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            // Remove green outline
            const dropZone = document.getElementById('dropZone');
            dropZone.classList.remove('border-green-500', 'shadow-[8px_8px_0px_rgba(34,197,94,0.3)]');
            
            // Only handle files if not dropped on the drop zone
            if (!e.target.closest('#dropZone')) {
                this.handleFiles(e.dataTransfer.files);
            }
        });
    }

    setResizePreset(percentage) {
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');
        const resize50Btn = document.getElementById('resize50');
        const resize75Btn = document.getElementById('resize75');
        const resize100Btn = document.getElementById('resize100');
        
        // Clear custom inputs to indicate preset is active
        customWidth.value = '';
        customHeight.value = '';
        
        if (percentage === 100) {
            customWidth.placeholder = 'No resize';
            customHeight.placeholder = 'No resize';
        } else {
            customWidth.placeholder = `${percentage}%`;
            customHeight.placeholder = `${percentage}%`;
        }
        
        // Update button states to show which preset is selected
        // Reset percentage buttons
        resize50Btn.classList.add('bg-[#FFF5B4]');
        resize50Btn.classList.remove('bg-[#FFEB3B]');
        resize75Btn.classList.add('bg-[#FFF5B4]');
        resize75Btn.classList.remove('bg-[#FFEB3B]');
        
        // Reset cross button to default red state
        resize100Btn.classList.add('bg-[#E17055]', 'text-white');
        resize100Btn.classList.remove('bg-[#d63031]', 'bg-[#FFEB3B]', 'text-black');
        
        if (percentage === 50) {
            resize50Btn.classList.add('bg-[#FFEB3B]');
            resize50Btn.classList.remove('bg-[#FFF5B4]');
        } else if (percentage === 75) {
            resize75Btn.classList.add('bg-[#FFEB3B]');
            resize75Btn.classList.remove('bg-[#FFF5B4]');
        } else if (percentage === 100) {
            // Keep the red cross styling for 100% (no resize)
            resize100Btn.classList.add('bg-[#E17055]', 'text-white');
            resize100Btn.classList.remove('bg-[#FFF5B4]', 'text-black');
        }
        
        this.resizePercentage = percentage;
    }

    handleCustomDimensionChange(dimension, value) {
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');
        
        // Clear preset selection when custom values are entered
        if (value) {
            const resize50Btn = document.getElementById('resize50');
            const resize75Btn = document.getElementById('resize75');
            const resize100Btn = document.getElementById('resize100');
            
            // Reset percentage buttons
            resize50Btn.classList.add('bg-[#FFF5B4]');
            resize50Btn.classList.remove('bg-[#FFEB3B]');
            resize75Btn.classList.add('bg-[#FFF5B4]');
            resize75Btn.classList.remove('bg-[#FFEB3B]');
            
            // Reset cross button to default red state
            resize100Btn.classList.add('bg-[#E17055]', 'text-white');
            resize100Btn.classList.remove('bg-[#d63031]', 'bg-[#FFEB3B]', 'text-black');
            
            customWidth.placeholder = 'Width';
            customHeight.placeholder = 'Height';
            this.resizePercentage = null;
        }
        
        // Handle aspect ratio lock
        if (this.aspectRatioLocked && this.currentAspectRatio && value) {
            const numValue = parseInt(value);
            if (!isNaN(numValue)) {
                if (dimension === 'width') {
                    const newHeight = Math.round(numValue / this.currentAspectRatio);
                    customHeight.value = newHeight;
                } else {
                    const newWidth = Math.round(numValue * this.currentAspectRatio);
                    customWidth.value = newWidth;
                }
            }
        }
    }

    toggleAspectRatioLock() {
        this.aspectRatioLocked = !this.aspectRatioLocked;
        const lockBtn = document.getElementById('aspectRatioLock');
        
        if (this.aspectRatioLocked) {
            lockBtn.classList.add('bg-[#6C5CE7]');
            lockBtn.classList.remove('bg-gray-400');
        } else {
            lockBtn.classList.add('bg-gray-400');
            lockBtn.classList.remove('bg-[#6C5CE7]');
        }
        
        this.showNotification(
            this.aspectRatioLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked',
            'info',
            2000
        );
    }

    loadApiKey() {
        const apiKeyInput = document.getElementById('apiKey');
        if (this.apiKey) {
            apiKeyInput.value = this.apiKey;
        }
        this.toggleCustomPlaceholder();
    }

    toggleCustomPlaceholder() {
        const apiKeyInput = document.getElementById('apiKey');
        const customPlaceholder = document.getElementById('customPlaceholder');
        
        if (apiKeyInput.value || apiKeyInput === document.activeElement) {
            customPlaceholder.style.display = 'none';
        } else {
            customPlaceholder.style.display = 'block';
        }
    }

    saveApiKey() {
        if (this.apiKey) {
            localStorage.setItem('tinypng-api-key', this.apiKey);
            this.showNotification('API key saved successfully!', 'success');
        } else {
            this.showNotification('Please enter an API key first', 'error');
        }
    }

    handleFiles(files) {
        if (!this.apiKey) {
            this.showNotification('Please enter your TinyPNG API key first', 'error');
            return;
        }

        const glbFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.glb'));
        
        if (glbFiles.length === 0) {
            this.showNotification('Please select GLB files only', 'error');
            return;
        }

        if (glbFiles.length > 10) {
            this.showNotification('Maximum 10 files allowed at once', 'error');
            return;
        }

        glbFiles.forEach(file => this.processGlbFile(file));
    }

    async processGlbFile(file) {
        const itemId = `glb-${Date.now()}-${Math.random()}`;
        this.processingQueue.set(itemId, { file, status: 'pending' });

        try {
            // Create queue item
            this.createQueueItem(file, itemId);
            
            // Update status to processing
            this.updateQueueItem(itemId, { 
                status: 'processing',
                progress: 0,
                message: 'Processing GLB file...'
            });

            // Prepare form data
            const formData = new FormData();
            formData.append('glbFile', file);
            formData.append('apiKey', this.apiKey);
            
            // Get texture optimization settings
            const targetFormat = document.getElementById('targetFormat').value;
            const customWidth = document.getElementById('customWidth').value;
            const customHeight = document.getElementById('customHeight').value;
            
            if (targetFormat !== 'compress') {
                formData.append('targetFormat', targetFormat);
            }
            
            if (customWidth && customHeight) {
                formData.append('customWidth', customWidth);
                formData.append('customHeight', customHeight);
                formData.append('aspectRatioLocked', this.aspectRatioLocked.toString());
            } else if (this.resizePercentage && this.resizePercentage !== 100) {
                formData.append('resizePercentage', this.resizePercentage.toString());
            }

            // Send request to worker
            const response = await fetch(this.workerUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.updateQueueItem(itemId, {
                    status: 'completed',
                    progress: 100,
                    processedData: result.data
                });
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (error) {
            console.error('Error processing GLB file:', error);
            this.updateQueueItemError(itemId, error.message);
        }
    }

    createQueueItem(file, itemId) {
        const container = document.getElementById('queueContainer');
        const originalSize = this.formatFileSize(file.size);
        
        const itemHtml = `
            <div id="${itemId}" class="border-2 border-black bg-gray-50 p-4 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="w-10 h-10 bg-[#6C5CE7] border-2 border-black rounded-md flex items-center justify-center flex-shrink-0">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-sm line-clamp-2">${file.name}</h3>
                            <div class="flex items-center gap-2 text-xs">
                                <span class="text-gray-500">${originalSize}</span>
                                <span class="savings-info"></span>
                            </div>
                        </div>
                    </div>
                    <div class="action-button-container flex-shrink-0">
                        <button class="action-btn px-3 py-2 border-2 border-black bg-[#FF8C42] text-white text-xs font-bold rounded transition-all duration-150 cursor-not-allowed flex items-center gap-1.5" disabled>
                            <div class="w-2.5 h-2.5 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                            <span>PROCESSING</span>
                        </button>
                    </div>
                </div>
                
                <div class="w-full bg-gray-200 border border-black rounded-full h-2 mb-3">
                    <div class="progress-bar bg-[#6C5CE7] h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
                
                <div class="download-buttons hidden gap-2 mt-3">
                    <!-- Download buttons will be added here when processing completes -->
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', itemHtml);
    }

    updateQueueItem(itemId, data) {
        const item = document.getElementById(itemId);
        if (!item) return;

        const actionBtn = item.querySelector('.action-btn');
        const progressBar = item.querySelector('.progress-bar');
        const savingsInfo = item.querySelector('.savings-info');

        if (data.status === 'processing') {
            progressBar.style.width = `${data.progress || 0}%`;
            // Keep the processing button as is
        } else if (data.status === 'completed') {
            progressBar.style.width = '100%';
            
            // Calculate and display savings
            if (data.processedData) {
                const originalSize = this.processingQueue.get(itemId).file.size;
                const newSize = data.processedData.processedSize;
                const savings = originalSize - newSize;
                const savingsPercent = Math.round((savings / originalSize) * 100);
                
                // Update savings info
                savingsInfo.innerHTML = `→ ${this.formatFileSize(newSize)} <span class="text-green-600 font-bold">${savingsPercent}% savings</span>`;
                
                // Transform action button to download button
                actionBtn.disabled = false;
                actionBtn.className = 'action-btn px-3 py-2 border-2 border-black bg-[#6C5CE7] hover:bg-[#5a4fcf] text-white text-xs font-bold rounded transition-all duration-150 cursor-pointer flex items-center gap-1.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
                actionBtn.innerHTML = `
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    <span>DOWNLOAD GLB</span>
                `;
                actionBtn.onclick = () => this.downloadGlb(data.processedData);
                
                // Add second download button for textures
                const downloadButtonsContainer = item.querySelector('.download-buttons');
                downloadButtonsContainer.classList.remove('hidden');
                downloadButtonsContainer.className = 'download-buttons flex gap-2 mt-3';
                downloadButtonsContainer.innerHTML = this.createTextureDownloadButtons(data.processedData);
            }
        }
    }

    updateQueueItemError(itemId, errorMessage) {
        const item = document.getElementById(itemId);
        if (!item) return;

        const actionBtn = item.querySelector('.action-btn');
        const progressBar = item.querySelector('.progress-bar');
        const savingsInfo = item.querySelector('.savings-info');

        // Transform action button to error state
        actionBtn.disabled = true;
        actionBtn.className = 'action-btn px-3 py-2 border-2 border-black bg-red-500 text-white text-xs font-bold rounded cursor-not-allowed flex items-center gap-1.5';
        actionBtn.innerHTML = `
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            <span>ERROR</span>
        `;
        
        progressBar.style.width = '0%';
        savingsInfo.innerHTML = `<span class="text-red-600 text-xs">${errorMessage}</span>`;
    }

    downloadGlb(glbData) {
        try {
            // Convert base64 to blob
            const binaryString = atob(glbData.processedGlbData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = glbData.filename || 'optimized_model.glb';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('GLB file downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error downloading GLB:', error);
            this.showNotification('Error downloading GLB file', 'error');
        }
    }

    downloadTextures(glbData) {
        // This function is now replaced by individual texture download buttons
        // See createTextureDownloadButtons() instead
    }

    createTextureDownloadButtons(glbData) {
        if (!glbData.optimizedTextures || glbData.optimizedTextures.length === 0) {
            return '';
        }

        const textureButtons = glbData.optimizedTextures.map((texture, index) => {
            const extension = texture.mimeType.split('/')[1] || 'jpg';
            const fileName = `${texture.name}.${extension}`;
            const savings = Math.round((1 - texture.optimizedSize / texture.originalSize) * 100);
            
            // Create data URL for preview
            const dataUrl = `data:${texture.mimeType};base64,${texture.data}`;
            
            return `
                <div class="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                    <div class="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg overflow-hidden flex-shrink-0">
                        <img src="${dataUrl}" alt="${texture.name}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-mono text-sm font-bold text-gray-800 truncate">${texture.name}</div>
                        <div class="text-xs text-gray-600">
                            ${this.formatFileSize(texture.originalSize)} → ${this.formatFileSize(texture.optimizedSize)}
                            <span class="text-green-600 font-bold ml-1">${savings}% smaller</span>
                        </div>
                    </div>
                    <button 
                        onclick="smolTextures.downloadSingleTexture('${texture.data}', '${fileName}', '${texture.mimeType}')"
                        class="px-4 py-2 bg-[#00B894] hover:bg-[#00a085] border-2 border-black text-white font-bold text-sm rounded-lg transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        DOWNLOAD
                    </button>
                </div>
            `;
        }).join('');

        return `
            <div class="mt-4 p-4 bg-white border-2 border-gray-200 rounded-lg">
                <div class="flex items-center gap-2 mb-3">
                    <svg class="w-5 h-5 text-[#6C5CE7]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                    </svg>
                    <span class="font-bold text-gray-800">OPTIMIZED TEXTURES</span>
                </div>
                <div class="space-y-3">
                    ${textureButtons}
                </div>
            </div>
        `;
    }

    downloadSingleTexture(base64Data, fileName, mimeType) {
        try {
            // Convert base64 to blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification(`Downloaded ${fileName}`, 'success', 2000);
        } catch (error) {
            console.error('Error downloading texture:', error);
            this.showNotification('Error downloading texture', 'error', 3000);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-3 border-2 border-black rounded-lg font-bold text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] ${
            type === 'success' ? 'bg-[#00B894] text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-white text-black'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, duration);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.smolTextures = new SmolTextures();
}); 