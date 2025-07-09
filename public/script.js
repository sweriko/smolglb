class SmolTextures {
    constructor() {
        this.apiKey = localStorage.getItem('tinypng-api-key') || '';
        this.workerUrl = window.location.origin; // Use current domain
        this.processingQueue = new Map();
        this.aspectRatioLocked = true;
        this.currentAspectRatio = null;
        this.resizeResolution = null; // No default resize
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

        // Privacy modal controls
        const privacyButton = document.getElementById('privacyButton');
        const privacyModal = document.getElementById('privacyModal');
        const closePrivacyModal = document.getElementById('closePrivacyModal');

        privacyButton.addEventListener('click', () => {
            privacyModal.classList.remove('hidden');
        });

        closePrivacyModal.addEventListener('click', () => {
            privacyModal.classList.add('hidden');
        });

        // Close modal when clicking backdrop
        privacyModal.addEventListener('click', (e) => {
            if (e.target === privacyModal) {
                privacyModal.classList.add('hidden');
            }
        });

        // Contact modal controls
        const contactButton = document.getElementById('contactButton');
        const contactModal = document.getElementById('contactModal');
        const closeContactModal = document.getElementById('closeContactModal');

        contactButton.addEventListener('click', () => {
            contactModal.classList.remove('hidden');
        });

        closeContactModal.addEventListener('click', () => {
            contactModal.classList.add('hidden');
        });

        // Close modal when clicking backdrop
        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal) {
                contactModal.classList.add('hidden');
            }
        });

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!privacyModal.classList.contains('hidden')) {
                    privacyModal.classList.add('hidden');
                }
                if (!contactModal.classList.contains('hidden')) {
                    contactModal.classList.add('hidden');
                }
            }
        });

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

        // Expandable API key fallback banner
        const noApiKeyBanner = document.getElementById('noApiKeyBanner');
        const expandedExplanation = document.getElementById('expandedExplanation');
        const expandArrow = document.getElementById('expandArrow');
        
        noApiKeyBanner.addEventListener('click', () => {
            const isExpanded = !expandedExplanation.classList.contains('hidden');
            
            if (isExpanded) {
                // Collapse
                expandedExplanation.classList.add('hidden');
                expandArrow.classList.remove('rotate-180');
            } else {
                // Expand
                expandedExplanation.classList.remove('hidden');
                expandArrow.classList.add('rotate-180');
            }
        });

        // Resizer controls
        const resize512Btn = document.getElementById('resize512');
        const resize1024Btn = document.getElementById('resize1024');
        const customWidthInput = document.getElementById('customWidth');
        const customHeightInput = document.getElementById('customHeight');
        const aspectRatioLockBtn = document.getElementById('aspectRatioLock');

        resize512Btn.addEventListener('click', () => {
            this.setResizePreset(512);
        });

        resize1024Btn.addEventListener('click', () => {
            this.setResizePreset(1024);
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

    setResizePreset(resolution) {
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');
        const resize512Btn = document.getElementById('resize512');
        const resize1024Btn = document.getElementById('resize1024');
        
        // Check if clicking the same preset to deactivate it
        if (this.resizeResolution === resolution) {
            // Deactivate - reset to no preset selected
            this.resizeResolution = null;
            
            // Reset both buttons to white
            resize512Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            resize1024Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            
            // Clear inputs
            customWidth.value = '';
            customHeight.value = '';
            
            return;
        }
        
        // Set both inputs to the resolution value (square preset)
        customWidth.value = resolution;
        customHeight.value = resolution;
        
        // Update button states
        if (resolution === 512) {
            resize512Btn.className = 'px-3 py-1.5 border-2 border-black bg-[#FFEB3B] hover:bg-[#FDD835] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            resize1024Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
        } else if (resolution === 1024) {
            resize512Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            resize1024Btn.className = 'px-3 py-1.5 border-2 border-black bg-[#FFEB3B] hover:bg-[#FDD835] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
        }
        
        this.resizeResolution = resolution;
    }

    handleCustomDimensionChange(dimension, value) {
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');
        
        // Clear preset selection when custom values are entered
        if (value) {
            const resize512Btn = document.getElementById('resize512');
            const resize1024Btn = document.getElementById('resize1024');
            
            // Reset resolution buttons to default white state
            resize512Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            resize1024Btn.className = 'px-3 py-1.5 border-2 border-black bg-white hover:bg-[#FFEB3B] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black text-sm transition-all duration-150';
            
            this.resizeResolution = null;
        }
        
        // Handle aspect ratio lock (square mode)
        if (this.aspectRatioLocked && value) {
            const numValue = parseInt(value);
            if (!isNaN(numValue)) {
                // Set both fields to the same value (square mode)
                if (dimension === 'width') {
                    customHeight.value = numValue;
                } else {
                    customWidth.value = numValue;
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
        const glbFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.glb'));
        
        if (glbFiles.length === 0) {
            this.showNotification('Please select GLB files only', 'error');
            return;
        }

        if (glbFiles.length > 10) {
            this.showNotification('Maximum 10 files allowed at once', 'error');
            return;
        }

        // Show notification about compression method
        if (!this.apiKey) {
            this.showNotification('Using client-side compression (no API key provided)', 'info');
        } else {
            this.showNotification('Using TinyPNG API compression', 'info');
        }

        glbFiles.forEach(file => this.processGlbFile(file));
    }

    async processGlbFile(file) {
        const itemId = `glb-${Date.now()}-${Math.random()}`;
        this.processingQueue.set(itemId, { file, status: 'pending' });

        try {
            // Create queue item
            this.createQueueItem(file, itemId);
            
            // Generate thumbnail immediately (non-blocking)
            this.generateThumbnail(file, itemId);
            
            // Update status to processing
            this.updateQueueItem(itemId, { 
                status: 'processing',
                progress: 0,
                message: 'Processing GLB file...'
            });

            let processedData;

            if (!this.apiKey) {
                // Use client-side compression when no API key is provided
                processedData = await this.processGlbClientSide(file, itemId);
            } else {
                // Use TinyPNG API via worker when API key is provided
                processedData = await this.processGlbWithWorker(file, itemId);
            }

            // Check if mesh optimization is enabled
            if (this.meshOptimizationEnabled) {
                this.updateQueueItem(itemId, {
                    status: 'processing',
                    progress: 80,
                    message: 'Applying mesh optimization...'
                });
                
                // Apply mesh optimization client-side
                const meshOptimizedData = await this.applyMeshOptimization(processedData);
                
                this.updateQueueItem(itemId, {
                    status: 'completed',
                    progress: 100,
                    processedData: meshOptimizedData
                });
            } else {
                this.updateQueueItem(itemId, {
                    status: 'completed',
                    progress: 100,
                    processedData: processedData
                });
            }

        } catch (error) {
            console.error('Error processing GLB file:', error);
            this.updateQueueItemError(itemId, error.message);
        }
    }

    async processGlbWithWorker(file, itemId) {
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
            return result.data;
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    }

    async processGlbClientSide(file, itemId) {
        try {
            this.updateQueueItem(itemId, {
                status: 'processing',
                progress: 20,
                message: 'Loading GLB file...'
            });

            // Convert file to ArrayBuffer
            const glbBuffer = await file.arrayBuffer();
            const glbData = new Uint8Array(glbBuffer);

            // Import gltf-transform modules
            const { NodeIO } = await import('https://cdn.skypack.dev/@gltf-transform/core');
            
            this.updateQueueItem(itemId, {
                status: 'processing',
                progress: 40,
                message: 'Processing textures...'
            });

            // Create IO for reading GLB
            const io = new NodeIO();
            
            // Read the GLB file
            const gltfDocument = await io.readBinary(glbData);

            let processedData;
            let texturesOptimized = 0;
            let originalTextureSize = 0;
            let optimizedTextureSize = 0;
            const optimizedTextures = [];

            if (this.textureOptimizationEnabled) {
                // Get texture optimization settings
                const targetFormat = document.getElementById('targetFormat').value;
                const customWidth = document.getElementById('customWidth').value;
                const customHeight = document.getElementById('customHeight').value;

                // Get all textures from the document
                const textures = gltfDocument.getRoot().listTextures();
                
                if (textures.length > 0) {
                    this.updateQueueItem(itemId, {
                        status: 'processing',
                        progress: 50,
                        message: `Compressing ${textures.length} textures...`
                    });

                    // Process each texture manually using Canvas API
                    for (let i = 0; i < textures.length; i++) {
                        const texture = textures[i];
                        const originalImageData = texture.getImage();
                        
                        if (!originalImageData) {
                            continue;
                        }

                        originalTextureSize += originalImageData.byteLength;
                        
                        try {
                            // Create canvas element for processing
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Convert image data to blob then to Image element
                            const blob = new Blob([originalImageData], { type: texture.getMimeType() || 'image/png' });
                            const imgUrl = URL.createObjectURL(blob);
                            
                            await new Promise((resolve, reject) => {
                                const img = new Image();
                                img.onload = () => {
                                    try {
                                        // Calculate dimensions based on settings
                                        let targetWidth = img.width;
                                        let targetHeight = img.height;
                                        
                                        if (customWidth && customHeight) {
                                            targetWidth = parseInt(customWidth);
                                            targetHeight = parseInt(customHeight);
                                        } else if (this.resizeResolution) {
                                            // For resolution presets, use the resolution as the maximum dimension
                                            // while maintaining aspect ratio
                                            const aspectRatio = img.width / img.height;
                                            if (img.width > img.height) {
                                                targetWidth = this.resizeResolution;
                                                targetHeight = Math.round(this.resizeResolution / aspectRatio);
                                            } else {
                                                targetHeight = this.resizeResolution;
                                                targetWidth = Math.round(this.resizeResolution * aspectRatio);
                                            }
                                        }
                                        
                                        // Set canvas dimensions
                                        canvas.width = targetWidth;
                                        canvas.height = targetHeight;
                                        
                                        // Draw and compress image
                                        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                                        
                                        // Determine best compression format and settings
                                        const originalFormat = texture.getMimeType() || 'image/png';
                                        let outputFormat = targetFormat !== 'compress' ? targetFormat : 'image/jpeg'; // Default to JPEG for better compression
                                        
                                        // If original is PNG and user wants to compress, force JPEG conversion
                                        if (targetFormat === 'compress' && originalFormat === 'image/png') {
                                            outputFormat = 'image/jpeg';
                                        }
                                        
                                        // Use high quality compression (95%)
                                        let quality = 0.95;
                                        
                                        // Apply small format-specific adjustments
                                        if (outputFormat === 'image/jpeg') {
                                            // JPEG typically needs slightly lower quality for good compression
                                            quality = 0.9;
                                        } else if (outputFormat === 'image/webp') {
                                            // WebP handles quality well, use as-is
                                            quality = 0.95;
                                        }
                                        
                                        console.log(`Using high quality compression: ${Math.round(quality * 100)}%`);
                                        
                                        console.log(`Compressing texture ${i}: ${img.width}x${img.height} -> ${targetWidth}x${targetHeight}, ${originalFormat} -> ${outputFormat}, quality: ${quality}`);
                                        
                                        const tryCompress = (format, qual) => {
                                            return new Promise((resolveCompress, rejectCompress) => {
                                                canvas.toBlob((compressedBlob) => {
                                                    if (compressedBlob) {
                                                        console.log(`Texture ${i} blob size: ${originalImageData.byteLength} -> ${compressedBlob.size} bytes`);
                                                        
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => {
                                                            const compressedArrayBuffer = e.target.result;
                                                            const compressedData = new Uint8Array(compressedArrayBuffer);
                                                            
                                                            const compressionRatio = (originalImageData.byteLength - compressedData.byteLength) / originalImageData.byteLength;
                                                            
                                                            // If compression is not significant (less than 5%), try JPEG as fallback
                                                            if (compressionRatio < 0.05 && format !== 'image/jpeg') {
                                                                console.log(`Poor compression (${(compressionRatio * 100).toFixed(1)}%), trying JPEG fallback`);
                                                                resolveCompress({ retry: true });
                                                                return;
                                                            }
                                                            
                                                            // Store compressed texture for individual download
                                                            // Convert Uint8Array to base64 safely (avoiding stack overflow)
                                                            let base64Data = '';
                                                            const chunkSize = 0x8000; // 32KB chunks
                                                            for (let j = 0; j < compressedData.length; j += chunkSize) {
                                                                const chunk = compressedData.subarray(j, j + chunkSize);
                                                                base64Data += String.fromCharCode.apply(null, chunk);
                                                            }
                                                            base64Data = btoa(base64Data);
                                                            
                                                            optimizedTextures.push({
                                                                name: texture.getName() || `texture_${i}`,
                                                                data: base64Data,
                                                                mimeType: format,
                                                                originalSize: originalImageData.byteLength,
                                                                optimizedSize: compressedData.byteLength
                                                            });
                                                            
                                                            // Update texture with compressed data
                                                            texture.setImage(compressedData);
                                                            texture.setMimeType(format);
                                                            
                                                            optimizedTextureSize += compressedData.byteLength;
                                                            texturesOptimized++;
                                                            
                                                            const compression = (compressionRatio * 100).toFixed(1);
                                                            console.log(`Texture ${i} final: ${originalImageData.byteLength} -> ${compressedData.byteLength} bytes (${compression}% reduction)`);
                                                            
                                                            resolveCompress({ success: true });
                                                        };
                                                        reader.readAsArrayBuffer(compressedBlob);
                                                    } else {
                                                        rejectCompress(new Error('Failed to create compressed blob'));
                                                    }
                                                }, format, qual);
                                            });
                                        };
                                        
                                        // Try compression with selected format
                                        tryCompress(outputFormat, quality)
                                            .then((result) => {
                                                if (result.retry) {
                                                    console.log(`Retrying with JPEG compression at quality 0.85`);
                                                    return tryCompress('image/jpeg', 0.85);
                                                }
                                                return result;
                                            })
                                            .then(() => {
                                                URL.revokeObjectURL(imgUrl);
                                                resolve();
                                            })
                                            .catch((error) => {
                                                URL.revokeObjectURL(imgUrl);
                                                reject(error);
                                            });
                                        
                                    } catch (error) {
                                        reject(error);
                                    }
                                };
                                img.onerror = reject;
                                img.src = imgUrl;
                            });
                            
                        } catch (error) {
                            console.warn(`Failed to process texture ${i}:`, error);
                            // Continue with other textures
                        }
                    }
                    
                    console.log(`Client-side compression: ${texturesOptimized}/${textures.length} textures processed`);
                    console.log(`Total texture size: ${originalTextureSize} -> ${optimizedTextureSize} bytes`);
                }
            }

            this.updateQueueItem(itemId, {
                status: 'processing',
                progress: 70,
                message: 'Finalizing...'
            });

            // Write the optimized GLB
            const optimizedGlbData = await io.writeBinary(gltfDocument);

            // Convert to base64 for consistency with worker response
            const base64Data = this.arrayBufferToBase64(optimizedGlbData);

            // Generate filename
            const originalName = file.name;
            const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
            const processedFilename = `${nameWithoutExt}_optimized.glb`;

            // Create response data structure similar to worker
            processedData = {
                processedGlbData: base64Data,
                processedSize: optimizedGlbData.byteLength,
                filename: processedFilename,
                texturesOptimized: texturesOptimized,
                originalTextureSize: originalTextureSize,
                optimizedTextureSize: optimizedTextureSize,
                optimizedTextures: optimizedTextures,
                clientSideCompression: true // Flag to indicate this was done client-side
            };

            return processedData;

        } catch (error) {
            console.error('Client-side processing error:', error);
            throw error;
        }
    }

    createQueueItem(file, itemId) {
        const container = document.getElementById('queueContainer');
        const originalSize = this.formatFileSize(file.size);
        
        const itemHtml = `
            <div id="${itemId}" class="border-2 border-black bg-gray-50 p-4 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div id="icon-${itemId}" class="w-10 h-10 bg-[#6C5CE7] border-2 border-black rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
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
        
        container.insertAdjacentHTML('afterbegin', itemHtml);
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

        // Add client-side compression indicator
        const compressionBadge = glbData.clientSideCompression ? 
            '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 font-medium">Client-side</span>' : 
            '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 font-medium">TinyPNG</span>';

        return `
            <div class="mt-3 p-3 bg-white border-2 border-gray-200 rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                    <svg class="w-4 h-4 text-[#6C5CE7]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                    </svg>
                    <span class="font-bold text-gray-800 text-sm">OPTIMIZED TEXTURES</span>
                    ${compressionBadge}
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                        <button id="isolatedWireframe" class="px-3 py-2 border-2 border-black bg-[#FF6B35] hover:bg-[#e55a2b] text-white text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]" style="display: none;">
                            ISOLATED
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
                    <div class="absolute top-4 left-4 z-40 flex flex-col gap-3">
                        <div class="bg-blue-500 text-white px-6 py-3 rounded-lg border-4 border-black font-black text-xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            ORIGINAL
                        </div>
                        <div class="bg-white border-4 border-black px-6 py-4 rounded-lg font-bold text-lg text-red-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            ${this.formatFileSize(originalFile.size)}
                        </div>
                        <div id="originalStats" class="bg-white border-4 border-black px-4 py-3 rounded-lg font-mono text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)]" style="display: none;">
                            ${processedData.originalVertexCount ? `${processedData.originalVertexCount.toLocaleString()} vertices<br/>${Math.round(processedData.originalTriangleCount).toLocaleString()} triangles` : 'No mesh data'}
                        </div>
                    </div>
                    <div class="absolute top-4 right-4 z-40 flex flex-col gap-3">
                        <div class="bg-green-500 text-white px-6 py-3 rounded-lg border-4 border-black font-black text-xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            COMPRESSED
                        </div>
                        <div class="bg-white border-4 border-black px-6 py-4 rounded-lg font-bold text-lg text-green-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            ${this.formatFileSize(processedData.processedSize)}
                        </div>
                        <div id="optimizedStats" class="bg-white border-4 border-black px-4 py-3 rounded-lg font-mono text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)]" style="display: none;">
                            ${processedData.optimizedVertexCount ? `${processedData.optimizedVertexCount.toLocaleString()} vertices<br/>${Math.round(processedData.optimizedTriangleCount).toLocaleString()} triangles` : 'No mesh data'}
                        </div>
                    </div>
                    
                    <!-- Three.js container -->
                    <div id="threeContainer" class="relative w-full h-full">
                        <!-- Canvas containers for each scene -->
                        <div id="scene1Container" class="absolute inset-0 w-full h-full z-10"></div>
                        <div id="scene2Container" class="absolute inset-0 w-full h-full z-10"></div>
                        <!-- Interactive split line -->
                        <div id="splitLine" class="absolute top-0 w-4 h-full z-30 transition-all duration-75" style="left: 50%; transform: translateX(-50%);">
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
        
        // Store wireframe state: 0 = solid, 1 = wireframe overlay, 2 = wireframe isolated
        this.wireframeMode = 0;
        
        // Add wireframe toggle functionality
        document.getElementById('toggleWireframe').onclick = () => {
            this.toggleWireframe();
        };
        
        // Add isolated wireframe functionality
        document.getElementById('isolatedWireframe').onclick = () => {
            this.toggleIsolatedWireframe();
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
        if (this.wireframeMode === 0) {
            // Switch from SOLID to WIREFRAME OVERLAY
            this.wireframeMode = 1;
        } else {
            // Switch to SOLID (from either overlay or isolated)
            this.wireframeMode = 0;
        }
        this.updateWireframeButtons();
        this.applyWireframeMode();
    }
    
    toggleIsolatedWireframe() {
        if (this.wireframeMode === 2) {
            // Already in isolated mode, go back to wireframe overlay
            this.wireframeMode = 1;
        } else {
            // Switch to isolated wireframe mode
            this.wireframeMode = 2;
        }
        this.updateWireframeButtons();
        this.applyWireframeMode();
    }
    
    updateWireframeButtons() {
        const wireframeBtn = document.getElementById('toggleWireframe');
        const isolatedBtn = document.getElementById('isolatedWireframe');
        
        if (this.wireframeMode === 0) {
            // SOLID mode
            wireframeBtn.textContent = 'WIREFRAME';
            wireframeBtn.className = 'px-3 py-2 border-2 border-black bg-[#6C5CE7] hover:bg-[#5a4fcf] text-white text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
            isolatedBtn.style.display = 'none';
        } else if (this.wireframeMode === 1) {
            // WIREFRAME OVERLAY mode
            wireframeBtn.textContent = 'SOLID';
            wireframeBtn.className = 'px-3 py-2 border-2 border-black bg-[#FFEB3B] hover:bg-[#FDD835] text-black text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
            isolatedBtn.style.display = 'inline-block';
            isolatedBtn.className = 'px-3 py-2 border-2 border-black bg-[#FF6B35] hover:bg-[#e55a2b] text-white text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
        } else if (this.wireframeMode === 2) {
            // WIREFRAME ISOLATED mode
            wireframeBtn.textContent = 'SOLID';
            wireframeBtn.className = 'px-3 py-2 border-2 border-black bg-[#FFEB3B] hover:bg-[#FDD835] text-black text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
            isolatedBtn.style.display = 'inline-block';
            isolatedBtn.className = 'px-3 py-2 border-2 border-black bg-[#2D3748] hover:bg-[#1a202c] text-white text-sm font-bold rounded transition-all duration-150 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]';
        }
        
        // Toggle visibility of mesh stats
        const originalStats = document.getElementById('originalStats');
        const optimizedStats = document.getElementById('optimizedStats');
        if (originalStats && optimizedStats) {
            if (this.wireframeMode > 0) {
                originalStats.style.display = 'block';
                optimizedStats.style.display = 'block';
            } else {
                originalStats.style.display = 'none';
                optimizedStats.style.display = 'none';
            }
        }
    }
    
    applyWireframeMode() {
        // Apply wireframe mode to both models
        this.setModelWireframe(this.originalModel, this.wireframeMode);
        this.setModelWireframe(this.compressedModel, this.wireframeMode);
    }
    
    setModelWireframe(model, wireframeMode) {
        if (!model) return;
        
        // Clean up any existing wireframe overlays first
        this.removeWireframeOverlays(model);
        
        if (wireframeMode === 0) {
            // SOLID mode - restore original materials
            this.restoreOriginalMaterials(model);
        } else if (wireframeMode === 1) {
            // WIREFRAME OVERLAY mode - keep textured mesh + add wireframe on top
            this.restoreOriginalMaterials(model);
            this.createWireframeOverlay(model);
        } else if (wireframeMode === 2) {
            // WIREFRAME ISOLATED mode - replace materials with wireframe only
            this.applyIsolatedWireframe(model);
        }
    }
    
    removeWireframeOverlays(model) {
        // Remove any existing wireframe overlay meshes
        const toRemove = [];
        model.traverse((child) => {
            if (child.userData.isWireframeOverlay) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(child => {
            if (child.parent) {
                child.parent.remove(child);
            }
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
    
    restoreOriginalMaterials(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => {
                        this.restoreOriginalMaterial(mat);
                    });
                } else {
                    this.restoreOriginalMaterial(child.material);
                }
            }
        });
    }
    
    createWireframeOverlay(model) {
        const wireframeColor = new THREE.Color(0xff7700);
        
        model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                let wireframeGeometry;
                
                // For skinned meshes, compute the final vertex positions in local space
                if (child.isSkinnedMesh) {
                    // Create a temporary geometry with computed skinned positions
                    const tempGeometry = child.geometry.clone();
                    
                    // Ensure matrices are up to date
                    child.updateMatrixWorld(true);
                    
                    // Get the position attribute
                    const position = tempGeometry.attributes.position;
                    const skinIndex = tempGeometry.attributes.skinIndex;
                    const skinWeight = tempGeometry.attributes.skinWeight;
                    
                    if (position && skinIndex && skinWeight && child.skeleton) {
                        const vertex = new THREE.Vector3();
                        const skinVertex = new THREE.Vector3();
                        const skinIndices = new THREE.Vector4();
                        const skinWeights = new THREE.Vector4();
                        const bindMatrix = new THREE.Matrix4();
                        const boneMatrix = new THREE.Matrix4();
                        
                        // Get inverse of the mesh's world matrix to convert back to local space
                        const meshInverseMatrix = child.matrixWorld.clone().invert();
                        
                        // Create array for transformed positions
                        const transformedPositions = new Float32Array(position.count * 3);
                        
                        for (let i = 0; i < position.count; i++) {
                            vertex.fromBufferAttribute(position, i);
                            skinIndices.fromBufferAttribute(skinIndex, i);
                            skinWeights.fromBufferAttribute(skinWeight, i);
                            
                            skinVertex.set(0, 0, 0);
                            
                            // Apply bone influences
                            for (let j = 0; j < 4; j++) {
                                const weight = skinWeights.getComponent(j);
                                if (weight > 0) {
                                    const boneIndex = Math.floor(skinIndices.getComponent(j));
                                    if (boneIndex >= 0 && boneIndex < child.skeleton.bones.length) {
                                        bindMatrix.copy(child.skeleton.boneInverses[boneIndex]);
                                        boneMatrix.multiplyMatrices(child.skeleton.bones[boneIndex].matrixWorld, bindMatrix);
                                        
                                        const tempVertex = vertex.clone();
                                        tempVertex.applyMatrix4(boneMatrix);
                                        skinVertex.addScaledVector(tempVertex, weight);
                                    }
                                }
                            }
                            
                            // Transform back to local space
                            skinVertex.applyMatrix4(meshInverseMatrix);
                            
                            transformedPositions[i * 3] = skinVertex.x;
                            transformedPositions[i * 3 + 1] = skinVertex.y;
                            transformedPositions[i * 3 + 2] = skinVertex.z;
                        }
                        
                        // Update geometry with transformed positions
                        tempGeometry.setAttribute('position', new THREE.BufferAttribute(transformedPositions, 3));
                        tempGeometry.computeBoundingSphere();
                    }
                    
                    wireframeGeometry = new THREE.WireframeGeometry(tempGeometry);
                } else {
                    // For regular meshes, use original geometry
                    wireframeGeometry = new THREE.WireframeGeometry(child.geometry);
                }
                
                // Create wireframe material - bright and emissive to show on top
                const wireframeMaterial = new THREE.LineBasicMaterial({
                    color: wireframeColor,
                    transparent: false,
                    depthTest: true,
                    depthWrite: false // Don't write to depth buffer so it renders on top
                });
                
                // Create wireframe mesh
                const wireframeMesh = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                wireframeMesh.userData.isWireframeOverlay = true;
                
                // Position wireframe slightly in front to avoid z-fighting
                wireframeMesh.position.set(0, 0, 0.001);
                
                // Add as child to inherit transforms for both skinned and regular meshes
                child.add(wireframeMesh);
            }
        });
    }
    
    applyIsolatedWireframe(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => {
                        this.setMaterialIsolatedWireframe(mat);
                    });
                } else {
                    this.setMaterialIsolatedWireframe(child.material);
                }
            }
        });
    }

    restoreOriginalMaterial(material) {
        // Restore original properties if they were stored
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
            
            // Clean up stored properties
            delete material.userData.originalWireframeProps;
            
            // Force material update
            material.needsUpdate = true;
        }
    }
    
    setMaterialIsolatedWireframe(material) {
        const wireframeColor = new THREE.Color(0xff7700); // Orange wireframe color
        
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
        
        // Set isolated wireframe mode - pure wireframe only
        material.wireframe = true;
        material.color = new THREE.Color(0x000000); // Black base
        material.emissive = wireframeColor; // Bright orange wireframe
        material.map = null;
        material.normalMap = null;
        material.roughnessMap = null;
        material.metalnessMap = null;
        material.aoMap = null;
        material.emissiveMap = null;
        material.transparent = false;
        material.opacity = 1.0;
        
        // Force material update
        material.needsUpdate = true;
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
            this.wireframeMode = 0;
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
            
            // Wait for the modal to be fully rendered with proper dimensions
            await new Promise(resolve => {
                const checkDimensions = () => {
                    if (container.clientWidth > 0 && container.clientHeight > 0) {
                        resolve();
                    } else {
                        setTimeout(checkDimensions, 10);
                    }
                };
                checkDimensions();
            });
            
            // Create two separate renderers
            const renderer1 = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            const renderer2 = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            
            // Set up both renderers with proper dimensions
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            renderer1.setSize(width, height);
            renderer1.setClearColor(0xf0f0f0, 1);
            renderer1.shadowMap.enabled = true;
            renderer1.shadowMap.type = THREE.PCFSoftShadowMap;
            
            renderer2.setSize(width, height);
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
            const aspectRatio = width / height;
            const camera1 = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
            const camera2 = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
            
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
            
            // Add hover event listeners to slider handle only
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
        
        // Add import map first to resolve "three" module specifier
        if (!document.querySelector('script[type="importmap"]')) {
            const importMap = document.createElement('script');
            importMap.type = 'importmap';
            importMap.textContent = JSON.stringify({
                "imports": {
                    "three": "https://unpkg.com/three@0.178.0/build/three.module.js",
                    "three/addons/": "https://unpkg.com/three@0.178.0/examples/jsm/"
                }
            });
            document.head.appendChild(importMap);
            
            // Wait a moment for import map to be processed
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Now load modules using ES module approach
        const moduleScript = document.createElement('script');
        moduleScript.type = 'module';
        moduleScript.textContent = `
            import * as THREE from 'three';
            import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
            import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
            
            // Make available globally - can't modify THREE object, so extend it
            window.THREE = Object.assign({}, THREE, {
                GLTFLoader: GLTFLoader,
                OrbitControls: OrbitControls
            });
            
            // Signal completion with a delay to ensure everything is ready
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('threeJSLoaded'));
            }, 50);
        `;
        
        // Wait for modules to load
        await new Promise((resolve, reject) => {
            const loadHandler = () => {
                window.removeEventListener('threeJSLoaded', loadHandler);
                // Additional verification that modules are actually available
                if (window.THREE && window.THREE.GLTFLoader && window.THREE.OrbitControls) {
                    resolve();
                } else {
                    reject(new Error('Three.js modules not properly loaded'));
                }
            };
            
            const errorHandler = (error) => {
                console.error('Failed to load Three.js modules:', error);
                reject(error);
            };
            
            window.addEventListener('threeJSLoaded', loadHandler);
            moduleScript.onerror = errorHandler;
            
            document.head.appendChild(moduleScript);
            
            // Timeout fallback
            setTimeout(() => {
                reject(new Error('Three.js loading timeout'));
            }, 10000);
        });
        
        // Don't remove the script element immediately - keep it for module persistence
        // document.head.removeChild(moduleScript);
    }

    addLights(scene) {
        // Strong ambient light for base illumination - no shadows
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        
        // Hemisphere light for natural sky/ground lighting
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemisphereLight.position.set(0, 10, 0);
        scene.add(hemisphereLight);
        
        // Multiple directional lights from different angles for even coverage
        // Main key light (front-top)
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
        keyLight.position.set(10, 10, 10);
        keyLight.castShadow = false; // Disable shadows for inspection
        scene.add(keyLight);
        
        // Fill light (back-left)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-10, 5, -5);
        fillLight.castShadow = false;
        scene.add(fillLight);
        
        // Rim light (right side)
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(5, 5, -10);
        rimLight.castShadow = false;
        scene.add(rimLight);
        
        // Bottom light to eliminate under-shadows
        const bottomLight = new THREE.DirectionalLight(0xffffff, 0.3);
        bottomLight.position.set(0, -10, 0);
        bottomLight.castShadow = false;
        scene.add(bottomLight);
        
        // Multiple point lights for detailed inspection
        const pointLights = [
            { pos: [8, 8, 8], intensity: 0.4 },
            { pos: [-8, 8, -8], intensity: 0.4 },
            { pos: [8, -8, -8], intensity: 0.3 },
            { pos: [-8, -8, 8], intensity: 0.3 },
            { pos: [0, 0, 10], intensity: 0.3 },
            { pos: [0, 0, -10], intensity: 0.3 }
        ];
        
        pointLights.forEach(light => {
            const pointLight = new THREE.PointLight(0xffffff, light.intensity, 100);
            pointLight.position.set(...light.pos);
            scene.add(pointLight);
        });
    }

    centerAndScaleModel(model, camera, distance = 5) {
        // First pass: basic centering and orientation
        const initialBox = new THREE.Box3().setFromObject(model);
        const initialCenter = initialBox.getCenter(new THREE.Vector3());
        model.position.sub(initialCenter);
        
        // Find the best viewing angle without rotating the model
        const bestViewAngle = this.findBestViewingAngle(model, initialBox.getSize(new THREE.Vector3()));
        
        // Keep model rotation at (0,0,0) to preserve proper axes
        model.rotation.set(0, 0, 0);
        
        // Calculate final bounding box (no rotation applied to model)
        const finalBox = new THREE.Box3().setFromObject(model);
        const finalCenter = finalBox.getCenter(new THREE.Vector3());
        const finalSize = finalBox.getSize(new THREE.Vector3());
        
        // Perfect centering: move model so its bounding box center is at origin
        model.position.sub(finalCenter);
        
        // Calculate apparent dimensions from the best viewing angle
        const angle = bestViewAngle;
        
        // Project the bounding box dimensions as they appear from the camera angle
        const apparentWidth = Math.abs(finalSize.x * Math.cos(angle)) + Math.abs(finalSize.z * Math.sin(angle));
        const apparentHeight = finalSize.y;
        const apparentDepth = Math.abs(finalSize.x * Math.sin(angle)) + Math.abs(finalSize.z * Math.cos(angle));
        
        // Scale based on the dimensions that will actually be visible
        const targetWidth = 5.0;
        const targetHeight = 5.0;
        const scaleX = targetWidth / apparentWidth;
        const scaleY = targetHeight / apparentHeight;
        const scale = Math.min(scaleX, scaleY); // Use the smaller scale to ensure it fits
        
        model.scale.setScalar(scale);
        
        // Recalculate bounding box after scaling
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        const scaledSize = scaledBox.getSize(new THREE.Vector3());
        
        // Final centering adjustment
        model.position.sub(scaledCenter);
        
        // Dynamic camera positioning for optimal framing
        const scaledApparentWidth = Math.abs(scaledSize.x * Math.cos(angle)) + Math.abs(scaledSize.z * Math.sin(angle));
        const scaledApparentHeight = scaledSize.y;
        const cameraDistance = Math.max(scaledApparentWidth, scaledApparentHeight) * 1.1; // Minimal padding
        
        camera.position.set(
            -cameraDistance * Math.sin(angle), // View from calculated best angle
            cameraDistance * 0.7,
            cameraDistance * Math.cos(angle)
        );
        
        camera.lookAt(0, 0, 0);
        
        // Update camera's projection matrix to ensure proper framing
        camera.updateProjectionMatrix();
    }



    findBestViewingAngle(model, size) {
        // Analyze model to find the best orientation
        const orientations = this.analyzeModelOrientations(model);
        
        // Find the orientation with the most surface area visible from the front
        let bestOrientation = 0;
        let maxVisibleArea = 0;
        
        for (let i = 0; i < orientations.length; i++) {
            if (orientations[i] > maxVisibleArea) {
                maxVisibleArea = orientations[i];
                bestOrientation = i;
            }
        }
        
        // Convert orientation to camera angle (instead of rotating model)
        const cameraAngle = (bestOrientation * Math.PI) / 2;
        
        // Add 45-degree offset for better 3D perception
        return cameraAngle + Math.PI / 4;
    }

    analyzeModelOrientations(model) {
        const orientations = [0, 0, 0, 0]; // Front, Right, Back, Left
        
        model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const geometry = child.geometry;
                const positions = geometry.attributes.position;
                
                if (positions) {
                    const vertices = positions.array;
                    const vertexCount = vertices.length / 3;
                    
                    // Sample vertices to estimate surface area in each direction
                    for (let i = 0; i < vertexCount; i += Math.max(1, Math.floor(vertexCount / 500))) {
                        const x = vertices[i * 3];
                        const y = vertices[i * 3 + 1];
                        const z = vertices[i * 3 + 2];
                        
                        // Weight vertices based on their distance from center and direction
                        const distance = Math.sqrt(x * x + y * y + z * z);
                        const weight = distance * distance;
                        
                        // Determine which direction this vertex faces
                        if (z > 0) orientations[0] += weight; // Front (+Z)
                        if (x > 0) orientations[1] += weight; // Right (+X)
                        if (z < 0) orientations[2] += weight; // Back (-Z)
                        if (x < 0) orientations[3] += weight; // Left (-X)
                    }
                }
            }
        });
        
        return orientations;
    }

    async generateThumbnail(file, itemId) {
        try {
            // Load Three.js if not already loaded
            if (!window.THREE) {
                await this.loadThreeJS();
            }

            // Create offscreen canvas for thumbnail rendering
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            
            // Create renderer
            const renderer = new THREE.WebGLRenderer({ 
                canvas: canvas,
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true
            });
            renderer.setSize(64, 64);
            renderer.setClearColor(0x000000, 0);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Create scene
            const scene = new THREE.Scene();
            
            // Add lighting (same as preview)
            this.addLights(scene);

            // Create camera
            const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

            // Load GLB file
            const loader = new THREE.GLTFLoader();
            const arrayBuffer = await file.arrayBuffer();
            const dataView = new DataView(arrayBuffer);
            
            return new Promise((resolve, reject) => {
                loader.parse(arrayBuffer, '', (gltf) => {
                    try {
                        const model = gltf.scene;
                        scene.add(model);
                        
                        // Center and scale the model (same logic as preview)
                        this.centerAndScaleModel(model, camera);
                        
                        // Render the scene
                        renderer.render(scene, camera);
                        
                        // Convert to base64
                        const dataURL = canvas.toDataURL('image/png');
                        
                        // Update the icon in the queue item
                        this.updateThumbnailIcon(itemId, dataURL);
                        
                        // Cleanup
                        scene.remove(model);
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.geometry.dispose();
                                if (child.material) {
                                    if (Array.isArray(child.material)) {
                                        child.material.forEach(mat => mat.dispose());
                                    } else {
                                        child.material.dispose();
                                    }
                                }
                            }
                        });
                        renderer.dispose();
                        
                        resolve();
                    } catch (error) {
                        console.error('Error rendering thumbnail:', error);
                        reject(error);
                    }
                }, (error) => {
                    console.error('Error loading GLB for thumbnail:', error);
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            // Silently fail - keep the star icon
        }
    }

    updateThumbnailIcon(itemId, dataURL) {
        const iconContainer = document.getElementById(`icon-${itemId}`);
        if (iconContainer) {
            iconContainer.innerHTML = `
                <img src="${dataURL}" alt="Model thumbnail" class="w-full h-full object-cover rounded-sm">
            `;
            iconContainer.classList.remove('bg-[#6C5CE7]');
            iconContainer.classList.add('bg-white');
        }
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
            
            // Calculate new position (clamp between 0% and 100%)
            let newLeft = startLeft + deltaPercent;
            newLeft = Math.max(0, Math.min(100, newLeft));
            
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
        
        // Mouse events - only on handle, not the line
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
            splitHandle.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
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