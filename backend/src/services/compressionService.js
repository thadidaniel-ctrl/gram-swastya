const sharp = require('sharp');
const logger = require('../utils/logger');

const COMPRESSION_CONFIG = {
  jpeg: { quality: 80, progressive: true, mozjpeg: true },
  png: { compressionLevel: 9, adaptiveFiltering: true },
  webp: { quality: 80, lossless: false },
  tiff: { quality: 80, compression: 'jpeg' },
};

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];

function isCompressible(mimeType) {
  return SUPPORTED_MIME_TYPES.includes(mimeType);
}

async function compressImage(buffer, mimeType, options = {}) {
  if (!isCompressible(mimeType)) {
    return {
      buffer,
      compressed: false,
      originalSize: buffer.length,
      compressedSize: buffer.length,
      ratio: 1,
    };
  }

  const config = { ...COMPRESSION_CONFIG, ...options };
  let sharpInstance = sharp(buffer, { failOnError: false });

  try {
    switch (mimeType) {
      case 'image/jpeg':
        sharpInstance = sharpInstance.jpeg(config.jpeg);
        break;
      case 'image/png':
        sharpInstance = sharpInstance.png(config.png);
        break;
      case 'image/webp':
        sharpInstance = sharpInstance.webp(config.webp);
        break;
      case 'image/tiff':
        sharpInstance = sharpInstance.tiff(config.tiff);
        break;
    }

    const compressedBuffer = await sharpInstance.toBuffer();
    const originalSize = buffer.length;
    const compressedSize = compressedBuffer.length;
    const ratio = originalSize > 0 ? compressedSize / originalSize : 1;

    logger.info('Image compressed', {
      mimeType,
      originalSize,
      compressedSize,
      ratio: (ratio * 100).toFixed(1) + '%',
      savings: ((1 - ratio) * 100).toFixed(1) + '%',
    });

    // Only return compressed if it's actually smaller
    if (compressedSize < originalSize) {
      return {
        buffer: compressedBuffer,
        compressed: true,
        originalSize,
        compressedSize,
        ratio,
      };
    }

    return {
      buffer,
      compressed: false,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
    };
  } catch (error) {
    logger.warn('Image compression failed, returning original', { error: error.message, mimeType });
    return {
      buffer,
      compressed: false,
      originalSize: buffer.length,
      compressedSize: buffer.length,
      ratio: 1,
    };
  }
}

async function getImageMetadata(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
    };
  } catch (error) {
    logger.warn('Failed to get image metadata', { error: error.message });
    return null;
  }
}

async function generateThumbnail(buffer, mimeType, width = 200, height = 200) {
  if (!isCompressible(mimeType)) {
    return buffer;
  }

  try {
    const thumbnail = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    return thumbnail;
  } catch (error) {
    logger.warn('Thumbnail generation failed', { error: error.message });
    return buffer;
  }
}

module.exports = {
  isCompressible,
  compressImage,
  getImageMetadata,
  generateThumbnail,
  COMPRESSION_CONFIG,
};
