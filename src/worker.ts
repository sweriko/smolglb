interface ProcessGlbRequest {
  glbFile: File;
  apiKey: string;
  textureOptimizationEnabled?: boolean;
  targetFormat?: string;
  customWidth?: string;
  customHeight?: string;
  aspectRatioLocked?: boolean;
  resizePercentage?: number;
}

interface ProcessGlbResponse {
  success: boolean;
  data?: {
    processedGlbData: string;
    processedSize: number;
    filename: string;
    texturesOptimized: number;
    originalTextureSize: number;
    optimizedTextureSize: number;
    optimizedTextures: Array<{
      name: string;
      data: string; // base64
      mimeType: string;
      originalSize: number;
      optimizedSize: number;
    }>;
  };
  error?: string;
}

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const formData = await request.formData();
      const glbFile = formData.get('glbFile') as File;
      const apiKey = formData.get('apiKey') as string;
      const textureOptimizationEnabled = formData.get('textureOptimizationEnabled') === 'true';
      const targetFormat = formData.get('targetFormat') as string;
      const customWidth = formData.get('customWidth') as string;
      const customHeight = formData.get('customHeight') as string;
      const aspectRatioLocked = formData.get('aspectRatioLocked') === 'true';
      const resizePercentage = formData.get('resizePercentage') as string;

      console.log('GLB file:', glbFile ? `${glbFile.name} (${glbFile.size} bytes)` : 'null');
      console.log('API key:', apiKey ? 'present' : 'missing');

      // Validate inputs
      if (!glbFile || !apiKey) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Missing GLB file or API key. GlbFile: ${!!glbFile}, ApiKey: ${!!apiKey}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate file type
      if (!glbFile.name.toLowerCase().endsWith('.glb')) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid file type. Only GLB files are allowed.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate file size (100MB limit for Cloudflare Workers)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (glbFile.size > maxSize) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'File too large. Maximum size is 100MB.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Convert file to buffer
      const glbBuffer = await glbFile.arrayBuffer();
      const glbData = new Uint8Array(glbBuffer);

      console.log(`Starting GLB processing for ${glbFile.name} (${glbFile.size} bytes)`);
      console.log(`Texture optimization enabled: ${textureOptimizationEnabled}`);
      const startTime = Date.now();
      
      let optimizationResult;
      
      if (textureOptimizationEnabled) {
        // Process GLB file with texture optimization
        const textureOptions = {
          targetFormat: targetFormat !== 'compress' ? targetFormat : undefined,
          customWidth: customWidth ? parseInt(customWidth) : undefined,
          customHeight: customHeight ? parseInt(customHeight) : undefined,
          aspectRatioLocked,
          resizePercentage: resizePercentage ? parseInt(resizePercentage) : undefined
        };

        optimizationResult = await optimizeGlbTextures(glbData, apiKey, textureOptions);
      } else {
        // Skip texture optimization, return original GLB data
        console.log('Texture optimization disabled, returning original GLB data');
        optimizationResult = {
          processedGlbData: glbData.buffer,
          texturesOptimized: 0,
          originalTextureSize: 0,
          optimizedTextureSize: 0,
          optimizedTextures: [],
        };
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`GLB processing completed in ${processingTime}ms`);

      // Generate filename for processed GLB
      const originalName = glbFile.name;
      const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
      const processedFilename = `${nameWithoutExt}_optimized.glb`;

      // Convert processed data to base64
      const base64Data = arrayBufferToBase64(optimizationResult.processedGlbData);

      const response: ProcessGlbResponse = {
        success: true,
        data: {
          processedGlbData: base64Data,
          processedSize: optimizationResult.processedGlbData.byteLength,
          filename: processedFilename,
          texturesOptimized: optimizationResult.texturesOptimized,
          originalTextureSize: optimizationResult.originalTextureSize,
          optimizedTextureSize: optimizationResult.optimizedTextureSize,
          optimizedTextures: optimizationResult.optimizedTextures,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error processing GLB file:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

async function optimizeGlbTextures(glbData: Uint8Array, apiKey: string, options: {
  targetFormat?: string;
  customWidth?: number;
  customHeight?: number;
  aspectRatioLocked?: boolean;
  resizePercentage?: number;
}): Promise<{
  processedGlbData: ArrayBuffer;
  texturesOptimized: number;
  originalTextureSize: number;
  optimizedTextureSize: number;
  optimizedTextures: Array<{name: string; data: string; mimeType: string; originalSize: number; optimizedSize: number;}>;
}> {
  try {
    console.log(`Processing GLB file: ${glbData.byteLength} bytes`);
    
    // Import gltf-transform modules
    const { NodeIO } = await import('@gltf-transform/core');
    
    // Create IO for reading GLB
    const io = new NodeIO();
    
    // Read the GLB file
    const document = await io.readBinary(glbData);
    
    // Get all textures from the document
    const textures = document.getRoot().listTextures();
    const originalTextureCount = textures.length;
    
    if (originalTextureCount === 0) {
      console.log('No textures found in GLB file');
      return {
        processedGlbData: glbData.buffer,
        texturesOptimized: 0,
        originalTextureSize: 0,
        optimizedTextureSize: 0,
        optimizedTextures: [],
      };
    }
    
    console.log(`Found ${originalTextureCount} textures to optimize`);
    
    let originalTextureSize = 0;
    let optimizedTextureSize = 0;
    let texturesOptimized = 0;
    const optimizedTextures: Array<{name: string; data: string; mimeType: string; originalSize: number; optimizedSize: number;}> = [];
    
    // Process each texture
    for (let i = 0; i < textures.length; i++) {
      const texture = textures[i];
      const originalImageData = texture.getImage();
      
      if (!originalImageData) {
        console.log(`Texture ${i} has no image data, skipping`);
        continue;
      }
      
      const originalSize = originalImageData.byteLength;
      originalTextureSize += originalSize;
      
      console.log(`Processing texture ${i}: ${originalSize} bytes`);
      
      try {
        // Compress texture with TinyPNG
        let processedImageData: ArrayBuffer;
        let mimeType = texture.getMimeType() || 'image/jpeg';
        
        if (options.targetFormat) {
          // Convert and compress
          const { data, mimeType: newMimeType } = await convertAndCompressTexture(
            new Uint8Array(originalImageData), 
            apiKey, 
            options.targetFormat
          );
          processedImageData = data;
          mimeType = newMimeType;
        } else if (options.customWidth || options.customHeight || options.resizePercentage) {
          // Resize and compress
          const { data, mimeType: newMimeType } = await resizeAndCompressTexture(
            new Uint8Array(originalImageData), 
            apiKey, 
            options
          );
          processedImageData = data;
          mimeType = newMimeType;
        } else {
          // Just compress
          const { data, mimeType: newMimeType } = await compressTexture(new Uint8Array(originalImageData), apiKey);
          processedImageData = data;
          mimeType = newMimeType;
        }
        
        const compressedSize = processedImageData.byteLength;
        optimizedTextureSize += compressedSize;
        
        console.log(`Texture ${i} compressed: ${originalSize} -> ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);
        
        // Store optimized texture data  
        optimizedTextures.push({
          name: texture.getName() || `texture_${i}`,
          data: arrayBufferToBase64(processedImageData),
          mimeType,
          originalSize,
          optimizedSize: compressedSize
        });
        
        // Update the texture image data
        texture.setImage(new Uint8Array(processedImageData));
        
        // Update MIME type if format was changed
        if (options.targetFormat) {
          texture.setMimeType(mimeType);
        }
        
        texturesOptimized++;
        
      } catch (error) {
        console.error(`Failed to process texture ${i}:`, error);
        // Continue with other textures even if one fails
      }
    }
    
    console.log(`Optimization complete: ${texturesOptimized}/${originalTextureCount} textures processed`);
    console.log(`Total texture size: ${originalTextureSize} -> ${optimizedTextureSize} bytes`);
    
    // Write the optimized GLB
    const optimizedGlbData = await io.writeBinary(document);
    
    return {
      processedGlbData: optimizedGlbData.buffer,
      texturesOptimized,
      originalTextureSize,
      optimizedTextureSize,
      optimizedTextures,
    };
    
  } catch (error) {
    console.error('GLB texture optimization error:', error);
    throw error;
  }
}

async function compressTexture(imageData: Uint8Array, apiKey: string): Promise<{data: ArrayBuffer, mimeType: string}> {
  try {
    console.log(`Compressing texture: ${imageData.byteLength} bytes`);
    
    // Upload and get compressed image URL
    const compressedUrl = await uploadToTinyPNG(imageData, apiKey);
    
    // Download compressed image
    const auth = btoa(`api:${apiKey}`);
    const downloadResponse = await fetch(compressedUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error('Failed to download compressed texture');
    }

    const data = await downloadResponse.arrayBuffer();
    const mimeType = downloadResponse.headers.get('Content-Type') || 'image/jpeg';
    
    return { data, mimeType };

  } catch (error) {
    console.error('TinyPNG texture compression error:', error);
    throw error;
  }
}

async function convertAndCompressTexture(imageData: Uint8Array, apiKey: string, targetFormat: string): Promise<{data: ArrayBuffer, mimeType: string}> {
  try {
    // First compress the image
    const compressedUrl = await uploadToTinyPNG(imageData, apiKey);
    
    // Then convert it
    const auth = btoa(`api:${apiKey}`);
    const convertResponse = await fetch(compressedUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        convert: { type: targetFormat }
      })
    });

    if (!convertResponse.ok) {
      throw new Error(`Failed to convert texture: ${convertResponse.status}`);
    }

    const data = await convertResponse.arrayBuffer();
    const mimeType = convertResponse.headers.get('Content-Type') || getMimeTypeFromFormat(targetFormat);
    
    return { data, mimeType };
    
  } catch (error) {
    console.error('TinyPNG texture conversion error:', error);
    throw error;
  }
}

async function resizeAndCompressTexture(imageData: Uint8Array, apiKey: string, options: {
  customWidth?: number;
  customHeight?: number;
  aspectRatioLocked?: boolean;
  resizePercentage?: number;
}): Promise<{data: ArrayBuffer, mimeType: string}> {
  try {
    // First compress the image and get the URL
    const compressedUrl = await uploadToTinyPNG(imageData, apiKey);
    
    // Get original image dimensions from the compressed version
    const auth = btoa(`api:${apiKey}`);
    const infoResponse = await fetch(compressedUrl, {
      method: 'HEAD',
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    });
    
    const originalWidth = parseInt(infoResponse.headers.get('Image-Width') || '0');
    const originalHeight = parseInt(infoResponse.headers.get('Image-Height') || '0');
    
    let resizeOptions: any = {};
    
    if (options.resizePercentage) {
      // Calculate new dimensions based on percentage
      const newWidth = Math.round(originalWidth * (options.resizePercentage / 100));
      const newHeight = Math.round(originalHeight * (options.resizePercentage / 100));
      
      resizeOptions = {
        resize: {
          method: 'fit',
          width: newWidth,
          height: newHeight
        }
      };
    } else if (options.customWidth || options.customHeight) {
      // Use fit method for custom dimensions
      if (options.customWidth && options.customHeight) {
        resizeOptions = {
          resize: {
            method: 'fit',
            width: options.customWidth,
            height: options.customHeight
          }
        };
      } else {
        // Use scale method when only one dimension is provided
        resizeOptions = {
          resize: {
            method: 'scale',
            ...(options.customWidth && { width: options.customWidth }),
            ...(options.customHeight && { height: options.customHeight })
          }
        };
      }
    } else {
      throw new Error('No resize options provided');
    }

    const resizeResponse = await fetch(compressedUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resizeOptions)
    });

    if (!resizeResponse.ok) {
      const errorData = await resizeResponse.text();
      throw new Error(`Failed to resize texture (${resizeResponse.status}): ${errorData}`);
    }

    const data = await resizeResponse.arrayBuffer();
    const mimeType = resizeResponse.headers.get('Content-Type') || 'image/jpeg';
    
    return { data, mimeType };
    
  } catch (error) {
    console.error('TinyPNG texture resize error:', error);
    throw error;
  }
}

async function uploadToTinyPNG(imageData: Uint8Array, apiKey: string): Promise<string> {
  const url = 'https://api.tinify.com/shrink';
  const auth = btoa(`api:${apiKey}`);
  
  const uploadResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageData,
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.text();
    let errorMessage = 'TinyPNG API error';
    
    try {
      const errorJson = JSON.parse(errorData);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch (e) {
      errorMessage = errorData || errorMessage;
    }
    
    throw new Error(`TinyPNG API error (${uploadResponse.status}): ${errorMessage}`);
  }

  const uploadResult = await uploadResponse.json() as {
    output: {
      url: string;
      size: number;
      type: string;
    };
  };
  
  return uploadResult.output.url;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

function getMimeTypeFromFormat(format: string): string {
  switch (format) {
    case 'png': return 'image/png';
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    default: return 'image/jpeg';
  }
} 