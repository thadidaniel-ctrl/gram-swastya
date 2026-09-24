const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { compressImage, isCompressible } = require('./compressionService');

const UPLOAD_DIR = config.upload.localPath || path.join(process.cwd(), 'uploads');
const BASE_URL = config.server.baseUrl || 'http://localhost:3000';

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

function generateLocalKey(patientId, fileName) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
  return `files/${patientId}/${timestamp}-${random}-${sanitized}`;
}

async function uploadFileLocal(fileBuffer, localKey, mimeType, _metadata = {}) {
  ensureUploadDir();

  let uploadBuffer = fileBuffer;
  let compressionInfo = {
    compressed: false,
    originalSize: fileBuffer.length,
    compressedSize: fileBuffer.length,
    ratio: 1,
  };

  if (isCompressible(mimeType)) {
    const result = await compressImage(fileBuffer, mimeType);
    uploadBuffer = result.buffer;
    compressionInfo = result;
  }

  const fullPath = path.join(UPLOAD_DIR, localKey);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, uploadBuffer);

  logger.info('File saved locally', {
    key: localKey,
    path: fullPath,
    size: uploadBuffer.length,
    compression: compressionInfo,
  });

  return {
    localKey,
    localPath: fullPath,
    size: uploadBuffer.length,
    originalSize: fileBuffer.length,
    compression: compressionInfo,
  };
}

function getLocalFileUrl(localKey) {
  return `${BASE_URL}/uploads/${localKey}`;
}

function getLocalFilePath(localKey) {
  return path.join(UPLOAD_DIR, localKey);
}

async function deleteFileLocal(localKey) {
  const fullPath = getLocalFilePath(localKey);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    logger.info('Local file deleted', { key: localKey });
  }
}

async function copyFileLocal(sourceKey, destKey) {
  ensureUploadDir();
  const sourcePath = getLocalFilePath(sourceKey);
  const destPath = getLocalFilePath(destKey);
  const destDir = path.dirname(destPath);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(sourcePath, destPath);
  logger.info('Local file copied', { source: sourceKey, dest: destKey });
}

function getFileMetadataLocal(localKey) {
  const fullPath = getLocalFilePath(localKey);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const stats = fs.statSync(fullPath);
  return {
    contentLength: stats.size,
    lastModified: stats.mtime,
  };
}

function listPatientFilesLocal(patientId, prefix = '') {
  ensureUploadDir();
  const patientDir = path.join(UPLOAD_DIR, 'files', patientId, prefix);
  if (!fs.existsSync(patientDir)) {
    return [];
  }

  const files = [];
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(UPLOAD_DIR, fullPath);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        files.push({
          Key: relativePath,
          Size: stats.size,
          LastModified: stats.mtime,
          StorageClass: 'LOCAL',
        });
      }
    }
  }

  walkDir(patientDir);
  return files;
}

module.exports = {
  ensureUploadDir,
  generateLocalKey,
  uploadFileLocal,
  getLocalFileUrl,
  getLocalFilePath,
  deleteFileLocal,
  copyFileLocal,
  getFileMetadataLocal,
  listPatientFilesLocal,
};
