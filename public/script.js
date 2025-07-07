class SmolTextures {
    constructor() {
        this.apiKey = localStorage.getItem('tinypng-api-key') || '';
        this.workerUrl = 'http://127.0.0.1:8787'; // Local development worker URL
        this.processingQueue = new Map();
        this.aspectRatioLocked = true;
        this.currentAspectRatio = null;
        this.resizePercentage = null; // No default resize
        this.textureOptimizationEnabled = true; // Enabled by default
        this.meshOptimizationEnabled = false;
        this.meshRatio = 0.75;
        this.meshErrorThreshold = 0.001;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadApiKey();
        // Initialize with no preset selected by default
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
        const resize25Btn = document.getElementById('resize25');
        const resize50Btn = document.getElementById('resize50');
        const customWidthInput = document.getElementById('customWidth');
        const customHeightInput = document.getElementById('customHeight');
        const aspectRatioLockBtn = document.getElementById('aspectRatioLock');

        resize25Btn.addEventListener('click', () => {
            this.setResizePreset(25);
        });

        resize50Btn.addEventListener('click', () => {
            this.setResizePreset(50);
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

        // Mesh optimization controls
        const enableMeshOptimization = document.getElementById('enableMeshOptimization');
        const meshOptimizationSettings = document.getElementById('meshOptimizationSettings');
        const meshRatioSlider = document.getElementById('meshRatio');
        const meshRatioValue = document.getElementById('meshRatioValue');
        const meshErrorThreshold = document.getElementById('meshErrorThreshold');

        enableMeshOptimization.addEventListener('change', (e) => {
            this.meshOptimizationEnabled = e.target.checked;
            if (this.meshOptimizationEnabled) {
                meshOptimizationSettings.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                meshOptimizationSettings.classList.add('opacity-50', 'pointer-events-none');
            }
        });

        meshRatioSlider.addEventListener('input', (e) => {
            this.meshRatio = parseFloat(e.target.value);
            meshRatioValue.textContent = Math.round(this.meshRatio * 100) + '%';
        });

        meshErrorThreshold.addEventListener('change', (e) => {
            this.meshErrorThreshold = parseFloat(e.target.value);
        });

        // Texture optimization controls
        const enableTextureOptimization = document.getElementById('enableTextureOptimization');
        const textureOptimizationSettings = document.getElementById('textureOptimizationSettings');

        enableTextureOptimization.addEventListener('change', (e) => {
            this.textureOptimizationEnabled = e.target.checked;
            if (this.textureOptimizationEnabled) {
                textureOptimizationSettings.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                textureOptimizationSettings.classList.add('opacity-50', 'pointer-events-none');
            }
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
        const resize25Btn = document.getElementById('resize25');
        const resize50Btn = document.getElementById('resize50');
        const aspectRatioLock = document.getElementById('aspectRatioLock');
        
        // Check if clicking the same preset to deactivate it
        if (this.resizePercentage === percentage) {
            // Deactivate - reset to no preset selected
            this.resizePercentage = null;
            
            // Reset both buttons to white
            resize25Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            resize50Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            
            // Reset inputs to disabled state
            customWidth.value = '';
            customHeight.value = '';
            customWidth.placeholder = 'Width';
            customHeight.placeholder = 'Height';
            customWidth.disabled = true;
            customHeight.disabled = true;
            aspectRatioLock.disabled = true;
            
            // Reset styles to disabled
            customWidth.className = 'w-20 px-2 py-1.5 border-2 border-gray-400 bg-gray-100 text-gray-500 font-mono text-sm cursor-not-allowed';
            customHeight.className = 'w-20 px-2 py-1.5 border-2 border-gray-400 bg-gray-100 text-gray-500 font-mono text-sm cursor-not-allowed';
            aspectRatioLock.className = 'w-7 h-7 border-2 border-gray-400 bg-gray-200 rounded-md flex items-center justify-center cursor-not-allowed';
            
            // Reset times symbol
            const timesSymbol = customWidth.parentNode.querySelector('span');
            if (timesSymbol) {
                timesSymbol.className = 'text-sm font-bold text-gray-400';
            }
            
            return;
        }
        
        // Clear custom inputs to indicate preset is active
        customWidth.value = '';
        customHeight.value = '';
        
        // Enable inputs
        customWidth.disabled = false;
        customHeight.disabled = false;
        aspectRatioLock.disabled = false;
        
        // Update button states
        if (percentage === 25) {
            resize25Btn.className = 'px-3 py-1.5 border-2 border-black bg-[#FFEB3B] hover:bg-[#FDD835] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            resize50Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            customWidth.placeholder = '25%';
            customHeight.placeholder = '25%';
        } else if (percentage === 50) {
            resize25Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            resize50Btn.className = 'px-3 py-1.5 border-2 border-black bg-[#FFEB3B] hover:bg-[#FDD835] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            customWidth.placeholder = '50%';
            customHeight.placeholder = '50%';
        }
        
        // Update input styles
        customWidth.className = 'w-20 px-2 py-1.5 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
        customHeight.className = 'w-20 px-2 py-1.5 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
        aspectRatioLock.className = 'w-7 h-7 border-2 border-black bg-[#6C5CE7] hover:bg-[#5a4fcf] rounded-md flex items-center justify-center transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
        
        // Update times symbol
        const timesSymbol = customWidth.parentNode.querySelector('span');
        if (timesSymbol) {
            timesSymbol.className = 'text-sm font-bold text-black';
        }
        
        this.resizePercentage = percentage;
    }

    handleCustomDimensionChange(dimension, value) {
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');
        
        // Clear preset selection when custom values are entered
        if (value) {
            const resize25Btn = document.getElementById('resize25');
            const resize50Btn = document.getElementById('resize50');
            
            // Reset percentage buttons to default white state
            resize25Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            resize50Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            
            customWidth.placeholder = 'Width';
            customHeight.placeholder = 'Height';
            this.resizePercentage = null;
            
            // Update times symbol to active state
            const timesSymbol = customWidth.parentNode.querySelector('span');
            if (timesSymbol) {
                timesSymbol.className = 'text-sm font-bold text-black';
            }
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
            // Closed lock icon
            lockBtn.innerHTML = `
                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M6 10v-4a6 6 0 1 1 12 0v4"/>
                    <rect x="2" y="10" width="20" height="10" rx="2" ry="2"/>
                </svg>
            `;
        } else {
            lockBtn.classList.add('bg-gray-400');
            lockBtn.classList.remove('bg-[#6C5CE7]');
            // Open lock icon
            lockBtn.innerHTML = `
                <svg class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M6 10v-4a6 6 0 1 1 12 0"/>
                    <rect x="2" y="10" width="20" height="10" rx="2" ry="2"/>
                </svg>
            `;
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
            
            // Add texture optimization enabled flag
            formData.append('textureOptimizationEnabled', this.textureOptimizationEnabled.toString());
            
            // Only send texture optimization settings if texture optimization is enabled
            if (this.textureOptimizationEnabled) {
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
                } else if (this.resizePercentage) {
                    formData.append('resizePercentage', this.resizePercentage.toString());
                }
            }

            // Note: Mesh optimization is now handled client-side

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
                // Check if mesh optimization is enabled
                if (this.meshOptimizationEnabled) {
                    this.updateQueueItem(itemId, {
                        status: 'processing',
                        progress: 80,
                        message: 'Applying mesh optimization...'
                    });
                    
                    // Apply mesh optimization client-side
                    const meshOptimizedData = await this.applyMeshOptimization(result.data);
                    
                    this.updateQueueItem(itemId, {
                        status: 'completed',
                        progress: 100,
                        processedData: meshOptimizedData
                    });
                } else {
                    this.updateQueueItem(itemId, {
                        status: 'completed',
                        progress: 100,
                        processedData: result.data
                    });
                }
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
                    <div class="action-button-container flex-shrink-0 flex gap-2">
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
                actionBtn.className = 'action-btn px-4 py-2.5 border-2 border-black bg-[#00B894] hover:bg-[#00a085] text-white text-sm font-bold rounded transition-all duration-150 cursor-pointer flex items-center gap-2 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
                actionBtn.innerHTML = `
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    <span>DOWNLOAD GLB</span>
                `;
                actionBtn.onclick = () => this.downloadGlb(data.processedData);
                
                // Add preview button
                const previewBtn = document.createElement('button');
                previewBtn.className = 'px-3 py-2 border-2 border-black bg-[#FFEB3B] hover:bg-[#FDD835] text-black text-xs font-bold rounded transition-all duration-150 cursor-pointer flex items-center gap-1.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
                previewBtn.innerHTML = `
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    <span>PREVIEW</span>
                `;
                previewBtn.onclick = () => this.openPreview(itemId, data.processedData);
                
                // Insert preview button after the download button
                const actionButtonContainer = item.querySelector('.action-button-container');
                actionButtonContainer.appendChild(previewBtn);
                
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
                <div class="flex items-center gap-2 p-2 bg-gray-50 border-2 border-gray-200 rounded-lg">
                    <div class="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg overflow-hidden flex-shrink-0">
                        <img src="${dataUrl}" alt="${texture.name}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-mono text-xs font-bold text-gray-800 truncate">${texture.name}</div>
                        <div class="text-xs text-gray-600">
                            ${this.formatFileSize(texture.originalSize)} → ${this.formatFileSize(texture.optimizedSize)}
                            <span class="text-green-600 font-bold ml-1">${savings}% smaller</span>
                        </div>
                    </div>
                    <button 
                        onclick="smolTextures.downloadSingleTexture('${texture.data}', '${fileName}', '${texture.mimeType}')"
                        class="p-2 bg-[#6C5CE7] hover:bg-[#5a4fcf] border-2 border-black text-white font-bold text-xs rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center"
                    >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        return `
            <div class="mt-3 p-3 bg-white border-2 border-gray-200 rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                    <svg class="w-4 h-4 text-[#6C5CE7]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                    </svg>
                    <span class="font-bold text-gray-800 text-sm">OPTIMIZED TEXTURES</span>
                </div>
                <div class="space-y-2">
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

    openPreview(itemId, processedData) {
        const originalFile = this.processingQueue.get(itemId).file;
        this.createPreviewModal(originalFile, processedData);
    }

    createPreviewModal(originalFile, processedData) {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.id = 'previewModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
        modal.innerHTML = `
            <div class="relative w-full h-full max-w-7xl max-h-[90vh] bg-white border-4 border-black rounded-lg overflow-hidden">
                <div class="flex items-center justify-between p-4 border-b-2 border-black bg-gray-50">
                    <h2 class="text-xl font-black text-black">MODEL COMPARISON</h2>
                    <div class="flex items-center gap-2">
                        <button id="toggleWireframe" class="px-3 py-2 border-2 border-black bg-[#6C5CE7] hover:bg-[#5a4fcf] text-white text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                            WIREFRAME
                        </button>
                        <button id="closePreview" class="p-2 border-2 border-black bg-red-500 hover:bg-red-600 text-white rounded hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="relative h-[calc(100%-80px)]">
                    <!-- File info labels -->
                    <div class="absolute top-4 left-4 z-40 flex flex-col gap-2">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded border-2 border-black font-bold text-sm">
                            ORIGINAL
                        </div>
                        <div class="bg-white border-2 border-black px-3 py-2 rounded font-mono text-xs">
                            ${this.formatFileSize(originalFile.size)}
                        </div>
                        <div id="originalStats" class="bg-white border-2 border-black px-3 py-2 rounded font-mono text-xs" style="display: none;">
                            ${processedData.originalVertexCount ? `${processedData.originalVertexCount.toLocaleString()} vertices<br/>${Math.round(processedData.originalTriangleCount).toLocaleString()} triangles` : 'No mesh data'}
                        </div>
                    </div>
                    <div class="absolute top-4 right-4 z-40 flex flex-col gap-2">
                        <div class="bg-green-500 text-white px-3 py-1 rounded border-2 border-black font-bold text-sm">
                            COMPRESSED
                        </div>
                        <div class="bg-white border-2 border-black px-3 py-2 rounded font-mono text-xs">
                            ${this.formatFileSize(processedData.processedSize)}
                        </div>
                        <div id="optimizedStats" class="bg-white border-2 border-black px-3 py-2 rounded font-mono text-xs" style="display: none;">
                            ${processedData.optimizedVertexCount ? `${processedData.optimizedVertexCount.toLocaleString()} vertices<br/>${Math.round(processedData.optimizedTriangleCount).toLocaleString()} triangles` : 'No mesh data'}
                        </div>
                    </div>
                    
                    <!-- Three.js container -->
                    <div id="threeContainer" class="relative w-full h-full">
                        <!-- Canvas containers for each scene -->
                        <div id="scene1Container" class="absolute inset-0 w-full h-full z-10"></div>
                        <div id="scene2Container" class="absolute inset-0 w-full h-full z-10"></div>
                        <!-- Interactive split line -->
                        <div id="splitLine" class="absolute top-0 w-4 h-full z-30 cursor-col-resize transition-all duration-75" style="left: 50%; transform: translateX(-50%);">
                            <!-- Visual line - extends to bottom of modal -->
                            <div class="absolute top-0 left-1/2 w-1 bg-white border-l-2 border-r-2 border-black transform -translate-x-1/2 pointer-events-none" style="height: calc(100% + 80px);"></div>
                            <!-- Draggable handle - Neo Brutalism Style -->
                            <div id="splitHandle" class="absolute top-1/2 left-1/2 w-10 h-10 bg-[#FFEB3B] border-4 border-black transform -translate-x-1/2 -translate-y-1/2 cursor-col-resize hover:bg-[#FDD835] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all duration-150 flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                <div class="w-1 h-5 bg-black mx-0.5"></div>
                                <div class="w-1 h-5 bg-black mx-0.5"></div>
                                <div class="w-1 h-5 bg-black mx-0.5"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Loading overlay -->
                    <div id="loadingOverlay" class="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-30">
                        <div class="text-center">
                            <div class="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="font-bold text-black">Loading models...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add close functionality
        document.getElementById('closePreview').onclick = () => {
            this.closePreview();
        };
        
        // Store wireframe state
        this.wireframeMode = false;
        
        // Add wireframe toggle functionality
        document.getElementById('toggleWireframe').onclick = () => {
            this.toggleWireframe();
        };
        
        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape' && document.getElementById('previewModal')) {
                this.closePreview();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Close when clicking outside the modal content
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closePreview();
            }
        };
        
        // Initialize Three.js scenes
        this.initThreeJsComparison(originalFile, processedData);
    }

    toggleWireframe() {
        this.wireframeMode = !this.wireframeMode;
        
        // Update button appearance
        const button = document.getElementById('toggleWireframe');
        if (this.wireframeMode) {
            button.textContent = 'SOLID';
            button.className = 'px-3 py-2 border-2 border-black bg-[#FFEB3B] hover:bg-[#FDD835] text-black text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
        } else {
            button.textContent = 'WIREFRAME';
            button.className = 'px-3 py-2 border-2 border-black bg-[#6C5CE7] hover:bg-[#5a4fcf] text-white text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
        }
        
        // Toggle visibility of mesh stats
        const originalStats = document.getElementById('originalStats');
        const optimizedStats = document.getElementById('optimizedStats');
        if (originalStats && optimizedStats) {
            if (this.wireframeMode) {
                originalStats.style.display = 'block';
                optimizedStats.style.display = 'block';
            } else {
                originalStats.style.display = 'none';
                optimizedStats.style.display = 'none';
            }
        }
        
        // Apply wireframe to both models
        this.setModelWireframe(this.originalModel, this.wireframeMode);
        this.setModelWireframe(this.compressedModel, this.wireframeMode);
    }
    
    setModelWireframe(model, wireframe) {
        if (!model) return;
        
        // Blender-like orange wireframe color
        const wireframeColor = new THREE.Color(0xff7700); // Orange color like Blender
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    // Handle multiple materials
                    child.material.forEach((mat) => {
                        this.setMaterialWireframe(mat, wireframe, wireframeColor);
                    });
                } else {
                    // Handle single material
                    this.setMaterialWireframe(child.material, wireframe, wireframeColor);
                }
            }
        });
    }

    setMaterialWireframe(material, wireframe, wireframeColor) {
        if (wireframe) {
            // Store original properties if not already stored
            if (!material.userData.originalWireframeProps) {
                material.userData.originalWireframeProps = {
                    wireframe: material.wireframe,
                    color: material.color.clone(),
                    emissive: material.emissive ? material.emissive.clone() : new THREE.Color(0x000000),
                    map: material.map,
                    normalMap: material.normalMap,
                    roughnessMap: material.roughnessMap,
                    metalnessMap: material.metalnessMap,
                    aoMap: material.aoMap,
                    emissiveMap: material.emissiveMap,
                    transparent: material.transparent,
                    opacity: material.opacity
                };
            }
            
            // Set wireframe mode with bright color and remove texture interference
            material.wireframe = true;
            material.color = new THREE.Color(0x000000); // Black base color
            material.emissive = wireframeColor; // Full emissive color - completely overrides lighting
            
            // Disable all texture maps that could interfere
            material.map = null;
            material.normalMap = null;
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.emissiveMap = null;
            
            // Ensure solid appearance
            material.transparent = false;
            material.opacity = 1.0;
            
            // Force material update
            material.needsUpdate = true;
        } else {
            // Restore original properties
            if (material.userData.originalWireframeProps) {
                const orig = material.userData.originalWireframeProps;
                
                material.wireframe = orig.wireframe;
                material.color = orig.color;
                material.emissive = orig.emissive;
                material.map = orig.map;
                material.normalMap = orig.normalMap;
                material.roughnessMap = orig.roughnessMap;
                material.metalnessMap = orig.metalnessMap;
                material.aoMap = orig.aoMap;
                material.emissiveMap = orig.emissiveMap;
                material.transparent = orig.transparent;
                material.opacity = orig.opacity;
                
                // Clean up
                delete material.userData.originalWireframeProps;
                
                // Force material update
                material.needsUpdate = true;
            }
        }
    }

    closePreview() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            // Clean up Three.js resources
            if (this.threeCleanup) {
                this.threeCleanup();
                this.threeCleanup = null;
            }
            // Reset model references
            this.originalModel = null;
            this.compressedModel = null;
            this.wireframeMode = false;
            modal.remove();
        }
    }

    async initThreeJsComparison(originalFile, processedData) {
        try {
            // Load Three.js and dependencies
            await this.loadThreeJS();
            
            const container = document.getElementById('threeContainer');
            const scene1Container = document.getElementById('scene1Container');
            const scene2Container = document.getElementById('scene2Container');
            const loadingOverlay = document.getElementById('loadingOverlay');
            
            // Create two separate renderers
            const renderer1 = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            const renderer2 = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            
            // Set up both renderers
            renderer1.setSize(container.clientWidth, container.clientHeight);
            renderer1.setClearColor(0xf0f0f0, 1);
            renderer1.shadowMap.enabled = true;
            renderer1.shadowMap.type = THREE.PCFSoftShadowMap;
            
            renderer2.setSize(container.clientWidth, container.clientHeight);
            renderer2.setClearColor(0xf0f0f0, 1);
            renderer2.shadowMap.enabled = true;
            renderer2.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Apply CSS clipping to show only left half of scene 1 and right half of scene 2
            const updateClipPath = (splitPercent) => {
                renderer1.domElement.style.clipPath = `inset(0 ${100 - splitPercent}% 0 0)`;
                renderer2.domElement.style.clipPath = `inset(0 0 0 ${splitPercent}%)`;
            };
            
            // Initial 50/50 split
            updateClipPath(50);
            
            // Set canvas pointer events to allow interaction
            renderer1.domElement.style.pointerEvents = 'auto';
            renderer2.domElement.style.pointerEvents = 'auto';
            
            scene1Container.appendChild(renderer1.domElement);
            scene2Container.appendChild(renderer2.domElement);
            
            // Create two identical scenes
            const scene1 = new THREE.Scene(); // Original
            const scene2 = new THREE.Scene(); // Compressed
            
            // Create synchronized cameras with better FOV
            const camera1 = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
            const camera2 = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
            
            // Add lights to both scenes
            this.addLights(scene1);
            this.addLights(scene2);
            
            // Load models
            const loader = new THREE.GLTFLoader();
            
            // Load original model
            const originalArrayBuffer = await originalFile.arrayBuffer();
            const originalBlob = new Blob([originalArrayBuffer]);
            const originalUrl = URL.createObjectURL(originalBlob);
            
            // Load compressed model
            const compressedBinary = atob(processedData.processedGlbData);
            const compressedBytes = new Uint8Array(compressedBinary.length);
            for (let i = 0; i < compressedBinary.length; i++) {
                compressedBytes[i] = compressedBinary.charCodeAt(i);
            }
            const compressedBlob = new Blob([compressedBytes]);
            const compressedUrl = URL.createObjectURL(compressedBlob);
            
            let originalModel, compressedModel;
            
            await Promise.all([
                new Promise((resolve, reject) => {
                    loader.load(originalUrl, (gltf) => {
                        originalModel = gltf.scene;
                        scene1.add(originalModel);
                        resolve();
                    }, undefined, reject);
                }),
                new Promise((resolve, reject) => {
                    loader.load(compressedUrl, (gltf) => {
                        compressedModel = gltf.scene;
                        scene2.add(compressedModel);
                        resolve();
                    }, undefined, reject);
                })
            ]);
            
            // Store model references for wireframe toggle
            this.originalModel = originalModel;
            this.compressedModel = compressedModel;
            
            // Center and scale models (closer positioning)
            this.centerAndScaleModel(originalModel, camera1, 2.5); // Closer zoom
            this.centerAndScaleModel(compressedModel, camera2, 2.5); // Closer zoom
            
            // Create orbit controls for both cameras (using only one set of controls)
            const controls = new THREE.OrbitControls(camera1, container);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.enableZoom = true;
            controls.enableRotate = true;
            controls.enablePan = true; // Allow vertical panning
            controls.panSpeed = 0.8;
            controls.rotateSpeed = 0.5;
            controls.zoomSpeed = 1.2;
            controls.minDistance = 1;
            controls.maxDistance = 20;
            
            // Add hover detection to disable orbit controls when over slider
            const splitLine = document.getElementById('splitLine');
            const splitHandle = document.getElementById('splitHandle');
            
            const disableControlsOnHover = () => {
                controls.enabled = false;
                console.log('Orbit controls disabled - hovering over slider');
            };
            
            const enableControlsOnLeave = () => {
                controls.enabled = true;
                console.log('Orbit controls enabled - left slider area');
            };
            
            // Add hover event listeners to slider elements
            splitLine.addEventListener('mouseenter', disableControlsOnHover);
            splitLine.addEventListener('mouseleave', enableControlsOnLeave);
            splitHandle.addEventListener('mouseenter', disableControlsOnHover);
            splitHandle.addEventListener('mouseleave', enableControlsOnLeave);
            
            // Sync camera2 with camera1
            const syncCameras = () => {
                camera2.position.copy(camera1.position);
                camera2.rotation.copy(camera1.rotation);
                camera2.updateProjectionMatrix();
            };
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            
            // Animation loop
            let animationId;
            const animate = () => {
                animationId = requestAnimationFrame(animate);
                
                controls.update();
                syncCameras();
                
                // Render both scenes
                renderer1.render(scene1, camera1);
                renderer2.render(scene2, camera2);
            };
            
            animate();
            
            // Store cleanup function
            const baseCleanup = () => {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
                
                // Ensure orbit controls are enabled before disposal
                controls.enabled = true;
                
                URL.revokeObjectURL(originalUrl);
                URL.revokeObjectURL(compressedUrl);
                controls.dispose();
                renderer1.dispose();
                renderer2.dispose();
                scene1.clear();
                scene2.clear();
                if (scene1Container.contains(renderer1.domElement)) {
                    scene1Container.removeChild(renderer1.domElement);
                }
                if (scene2Container.contains(renderer2.domElement)) {
                    scene2Container.removeChild(renderer2.domElement);
                }
                
                // Remove hover event listeners
                splitLine.removeEventListener('mouseenter', disableControlsOnHover);
                splitLine.removeEventListener('mouseleave', enableControlsOnLeave);
                splitHandle.removeEventListener('mouseenter', disableControlsOnHover);
                splitHandle.removeEventListener('mouseleave', enableControlsOnLeave);
            };
            
            this.threeCleanup = baseCleanup;
            
            // Set up interactive split line
            this.setupInteractiveSplitLine(container, updateClipPath, controls, baseCleanup);
            
            // Add reset to split view functionality (double-click on split line)
            document.getElementById('splitLine').ondblclick = () => {
                updateClipPath(50); // Reset to 50/50 split
                document.getElementById('splitLine').style.left = '50%';
            };
            
            // Handle window resize
            const handleResize = () => {
                const width = container.clientWidth;
                const height = container.clientHeight;
                
                camera1.aspect = width / height;
                camera1.updateProjectionMatrix();
                camera2.aspect = width / height;
                camera2.updateProjectionMatrix();
                
                renderer1.setSize(width, height);
                renderer2.setSize(width, height);
            };
            
            window.addEventListener('resize', handleResize);
            
        } catch (error) {
            console.error('Error initializing Three.js comparison:', error);
            this.showNotification('Error loading 3D preview', 'error');
            document.getElementById('loadingOverlay').innerHTML = `
                <div class="text-center">
                    <div class="w-8 h-8 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                    <p class="font-bold text-red-600">Error loading models</p>
                </div>
            `;
        }
    }

    async loadThreeJS() {
        if (window.THREE && window.THREE.GLTFLoader && window.THREE.OrbitControls) return;
        
        // Load Three.js
        if (!window.THREE) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Load GLTFLoader
        if (!window.THREE.GLTFLoader) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Load OrbitControls
        if (!window.THREE.OrbitControls) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }

    addLights(scene) {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Point light
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, 5, -5);
        scene.add(pointLight);
    }

    centerAndScaleModel(model, camera, distance = 5) {
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Center the model
        model.position.sub(center);
        
        // Scale to fit in view (larger scale for closer viewing)
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        model.scale.setScalar(scale);
        
        // Position camera closer to the model
        camera.position.set(distance, distance * 0.8, distance);
        camera.lookAt(0, 0, 0);
    }

    setupInteractiveSplitLine(container, updateClipPath, controls, baseCleanup) {
        const splitLine = document.getElementById('splitLine');
        const splitHandle = document.getElementById('splitHandle');
        
        let isDragging = false;
        let startX = 0;
        let startLeft = 50; // Start at 50%
        let animationFrameId = null;
        
        const handleMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            
            // Get current left position as percentage
            const containerRect = container.getBoundingClientRect();
            const currentLeft = parseFloat(splitLine.style.left) || 50;
            startLeft = currentLeft;
            
            // Disable CSS transitions during dragging for instant response
            splitLine.style.transition = 'none';
            
            // Prevent text selection and add visual feedback
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
            splitHandle.style.transform = 'translateX(-50%) translateY(-50%) scale(1.1)';
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const containerRect = container.getBoundingClientRect();
            const deltaX = e.clientX - startX;
            const deltaPercent = (deltaX / containerRect.width) * 100;
            
            // Calculate new position (clamp between 10% and 90%)
            let newLeft = startLeft + deltaPercent;
            newLeft = Math.max(10, Math.min(90, newLeft));
            
            // Update split line position IMMEDIATELY for instant visual feedback
            splitLine.style.left = `${newLeft}%`;
            
            // Throttle clip path updates for performance
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            animationFrameId = requestAnimationFrame(() => {
                updateClipPath(newLeft);
            });
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        const handleMouseUp = (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            
            // Cancel any pending animation frame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            // Re-enable CSS transitions
            splitLine.style.transition = '';
            
            // Restore normal state
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            splitHandle.style.transform = 'translateX(-50%) translateY(-50%) scale(1)';
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        // Mouse events
        splitLine.addEventListener('mousedown', handleMouseDown);
        splitHandle.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Touch events for mobile
        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            handleMouseDown({ 
                clientX: touch.clientX, 
                preventDefault: () => e.preventDefault(),
                stopPropagation: () => e.stopPropagation()
            });
        };
        
        const handleTouchMove = (e) => {
            const touch = e.touches[0];
            handleMouseMove({ 
                clientX: touch.clientX, 
                preventDefault: () => e.preventDefault(),
                stopPropagation: () => e.stopPropagation()
            });
        };
        
        const handleTouchEnd = (e) => {
            handleMouseUp({ 
                preventDefault: () => e.preventDefault(),
                stopPropagation: () => e.stopPropagation()
            });
        };
        
        splitLine.addEventListener('touchstart', handleTouchStart);
        splitHandle.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        
        // Store cleanup function for these event listeners
        this.threeCleanup = () => {
            // Cancel any pending animation frame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            // Restore CSS transitions and normal state
            splitLine.style.transition = '';
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Remove event listeners
            splitLine.removeEventListener('mousedown', handleMouseDown);
            splitHandle.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            splitLine.removeEventListener('touchstart', handleTouchStart);
            splitHandle.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            
            // Call base cleanup
            if (baseCleanup) {
                baseCleanup();
            }
        };
    }

    async applyMeshOptimization(glbData) {
        try {
            console.log('Starting client-side mesh optimization...');
            
            // Load required libraries
            await this.loadMeshOptimizer();
            
            // Import gltf-transform modules
            const { NodeIO } = await import('https://cdn.skypack.dev/@gltf-transform/core');
            const { simplify, weld } = await import('https://cdn.skypack.dev/@gltf-transform/functions');
            
            // Convert base64 to ArrayBuffer
            const binaryString = atob(glbData.processedGlbData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create IO for reading GLB
            const io = new NodeIO();
            
            // Read the GLB file
            const document = await io.readBinary(bytes);
            
            // Count original vertices and triangles
            const meshes = document.getRoot().listMeshes();
            let originalVertexCount = 0;
            let originalTriangleCount = 0;
            for (const mesh of meshes) {
                const primitives = mesh.listPrimitives();
                for (const primitive of primitives) {
                    const position = primitive.getAttribute('POSITION');
                    const indices = primitive.getIndices();
                    if (position) {
                        originalVertexCount += position.getCount();
                    }
                    if (indices) {
                        originalTriangleCount += indices.getCount() / 3;
                    } else if (position) {
                        // If no indices, assume triangles (position count / 3)
                        originalTriangleCount += position.getCount() / 3;
                    }
                }
            }
            
            console.log(`Original counts: ${originalVertexCount} vertices, ${originalTriangleCount} triangles`);
            
            // Apply mesh simplification
            await document.transform(
                weld({}),
                simplify({ 
                    simplifier: window.MeshoptSimplifier, 
                    ratio: this.meshRatio, 
                    error: this.meshErrorThreshold 
                })
            );
            
            // Count optimized vertices and triangles
            let optimizedVertexCount = 0;
            let optimizedTriangleCount = 0;
            for (const mesh of meshes) {
                const primitives = mesh.listPrimitives();
                for (const primitive of primitives) {
                    const position = primitive.getAttribute('POSITION');
                    const indices = primitive.getIndices();
                    if (position) {
                        optimizedVertexCount += position.getCount();
                    }
                    if (indices) {
                        optimizedTriangleCount += indices.getCount() / 3;
                    } else if (position) {
                        // If no indices, assume triangles (position count / 3)
                        optimizedTriangleCount += position.getCount() / 3;
                    }
                }
            }
            
            console.log(`Mesh optimization complete: ${originalVertexCount} -> ${optimizedVertexCount} vertices, ${originalTriangleCount} -> ${optimizedTriangleCount} triangles`);
            
            // Write the optimized GLB
            const optimizedGlbData = await io.writeBinary(document);
            
            // Convert back to base64
            const optimizedBase64 = this.arrayBufferToBase64(optimizedGlbData);
            
            // Return updated data with mesh optimization info
            return {
                ...glbData,
                processedGlbData: optimizedBase64,
                processedSize: optimizedGlbData.byteLength,
                meshOptimized: true,
                originalVertexCount,
                optimizedVertexCount,
                originalTriangleCount,
                optimizedTriangleCount,
                meshSimplificationRatio: optimizedVertexCount / originalVertexCount
            };
            
        } catch (error) {
            console.error('Client-side mesh optimization failed:', error);
            // Return original data if mesh optimization fails
            return glbData;
        }
    }

    async loadMeshOptimizer() {
        // Wait for scripts to load and check multiple possible locations
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            // Debug: Log what's available on window
            if (attempts === 0) {
                console.log('Available meshopt objects:', {
                    MeshoptSimplifier: typeof window.MeshoptSimplifier,
                    meshopt: typeof window.meshopt,
                    MeshoptDecoder: typeof window.MeshoptDecoder,
                    MeshoptEncoder: typeof window.MeshoptEncoder
                });
            }
            
            // Check various possible ways MeshoptSimplifier might be exposed
            if (typeof window.MeshoptSimplifier !== 'undefined') {
                console.log('Found MeshoptSimplifier on window.MeshoptSimplifier');
                break;
            }
            
            if (typeof window.meshopt !== 'undefined' && window.meshopt.MeshoptSimplifier) {
                window.MeshoptSimplifier = window.meshopt.MeshoptSimplifier;
                console.log('Found MeshoptSimplifier on window.meshopt.MeshoptSimplifier');
                break;
            }
            
            if (typeof MeshoptSimplifier !== 'undefined') {
                window.MeshoptSimplifier = MeshoptSimplifier;
                console.log('Found MeshoptSimplifier as global');
                break;
            }
            
            // Check if it's available as a module export
            if (typeof window.meshoptimizer !== 'undefined' && window.meshoptimizer.MeshoptSimplifier) {
                window.MeshoptSimplifier = window.meshoptimizer.MeshoptSimplifier;
                console.log('Found MeshoptSimplifier on window.meshoptimizer.MeshoptSimplifier');
                break;
            }
            
            // Wait and try again
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
        
        if (typeof window.MeshoptSimplifier === 'undefined') {
            throw new Error('MeshoptSimplifier not available after waiting. Check that meshopt_simplifier.min.js loaded correctly.');
        }
        
        // Initialize if needed - try multiple ways it might be structured
        try {
            if (window.MeshoptSimplifier.ready) {
                await window.MeshoptSimplifier.ready;
            } else if (typeof window.MeshoptSimplifier.ready === 'function') {
                await window.MeshoptSimplifier.ready();
            }
        } catch (error) {
            console.warn('MeshoptSimplifier.ready() failed, continuing anyway:', error);
        }
        
        console.log('MeshoptSimplifier loaded and ready');
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.smolTextures = new SmolTextures();
}); 