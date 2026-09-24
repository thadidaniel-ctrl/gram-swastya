const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const crypto = require('crypto');
const awsConfig = require('../config/awsConfig');
const logger = require('../utils/logger');
const { compressImage, isCompressible } = require('./compressionService');
const {
  uploadFileLocal,
  getLocalFileUrl,
  deleteFileLocal,
  copyFileLocal,
  getFileMetadataLocal,
  generateLocalKey,
  listPatientFilesLocal,
} = require('./localStorageService');

let s3Client = null;

function initS3() {
  if (s3Client) return s3Client;

  const { accessKeyId, secretAccessKey, region, endpoint, forcePathStyle } = awsConfig.s3;

  if (!accessKeyId || !secretAccessKey) {
    logger.warn('AWS S3 credentials not configured. Using local file storage fallback.');
    return null;
  }

  s3Client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  logger.info('AWS S3 client initialized', { region, bucket: awsConfig.s3.bucket });
  return s3Client;
}

function isS3Available() {
  return !!s3Client || !!initS3();
}

function generateS3Key(patientId, fileName) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
  return `files/${patientId}/${timestamp}-${random}-${sanitized}`;
}

function getFileCategoryFromMimeType(mimeType) {
  if (mimeType?.startsWith('image/')) return 'Medical Image';
  if (mimeType === 'application/pdf') return 'Lab Report';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'Prescription';
  if (mimeType === 'image/tiff' || mimeType === 'image/webp') return 'Medical Image';
  return 'Other';
}

async function uploadFile(fileBuffer, storageKey, mimeType, metadata = {}) {
  const s3Available = isS3Available();

  if (s3Available) {
    return uploadFileS3(fileBuffer, storageKey, mimeType, metadata);
  }

  logger.info('S3 not available, using local storage fallback');
  return uploadFileLocal(fileBuffer, storageKey, mimeType, metadata);
}

async function uploadFileS3(fileBuffer, s3Key, mimeType, metadata = {}) {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const { bucket } = awsConfig.s3;

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

    metadata = {
      ...metadata,
      'x-compressed': result.compressed.toString(),
      'x-original-size': result.originalSize.toString(),
      'x-compressed-size': result.compressedSize.toString(),
    };
  }

  try {
    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: s3Key,
        Body: uploadBuffer,
        ContentType: mimeType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    upload.on('httpUploadProgress', progress => {
      logger.debug('Upload progress', {
        key: s3Key,
        loaded: progress.loaded,
        total: progress.total,
      });
    });

    const result = await upload.done();
    logger.info('File uploaded to S3', {
      key: s3Key,
      etag: result.ETag,
      versionId: result.VersionId,
      compression: compressionInfo,
    });

    return {
      storageKey: result.Key,
      storageType: 's3',
      s3Bucket: result.Bucket,
      s3Region: awsConfig.s3.region,
      s3ETag: result.ETag,
      s3VersionId: result.VersionId,
      size: uploadBuffer.length,
      originalSize: fileBuffer.length,
      compression: compressionInfo,
    };
  } catch (error) {
    logger.error('S3 upload failed', { key: s3Key, error: error.message });
    throw error;
  }
}

async function getPresignedUploadUrl(
  storageKey,
  mimeType,
  expiry = awsConfig.presigned.uploadExpiry
) {
  const s3Available = isS3Available();

  if (s3Available) {
    const client = initS3();
    if (!client) throw new Error('S3 not configured');

    const command = new PutObjectCommand({
      Bucket: awsConfig.s3.bucket,
      Key: storageKey,
      ContentType: mimeType,
    });

    return getSignedUrl(client, command, { expiresIn: expiry });
  }

  // Local storage doesn't need presigned URLs for upload (handled by multer)
  throw new Error('Presigned upload URL not available for local storage');
}

async function getPresignedDownloadUrl(
  storageKey,
  originalName,
  expiry = awsConfig.presigned.downloadExpiry
) {
  const s3Available = isS3Available();

  if (s3Available) {
    const client = initS3();
    if (!client) throw new Error('S3 not configured');

    const command = new GetObjectCommand({
      Bucket: awsConfig.s3.bucket,
      Key: storageKey,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
    });

    return getSignedUrl(client, command, { expiresIn: expiry });
  }

  // For local storage, return direct URL (or we could generate a signed URL with JWT)
  return getLocalFileUrl(storageKey);
}

async function getPresignedPreviewUrl(storageKey, expiry = awsConfig.presigned.previewExpiry) {
  const s3Available = isS3Available();

  if (s3Available) {
    const client = initS3();
    if (!client) throw new Error('S3 not configured');

    const command = new GetObjectCommand({
      Bucket: awsConfig.s3.bucket,
      Key: storageKey,
      ResponseContentDisposition: 'inline',
    });

    return getSignedUrl(client, command, { expiresIn: expiry });
  }

  return getLocalFileUrl(storageKey);
}

async function deleteFile(storageKey) {
  const s3Available = isS3Available();

  if (s3Available) {
    const client = initS3();
    if (!client) throw new Error('S3 not configured');

    const command = new DeleteObjectCommand({
      Bucket: awsConfig.s3.bucket,
      Key: storageKey,
    });

    await client.send(command);
    logger.info('File deleted from S3', { key: storageKey });
    return { success: true, storageType: 's3' };
  }

  await deleteFileLocal(storageKey);
  return { success: true, storageType: 'local' };
}

async function copyFile(sourceKey, destKey) {
  const s3Available = isS3Available();

  if (s3Available) {
    const client = initS3();
    if (!client) throw new Error('S3 not configured');

    const command = new CopyObjectCommand({
      Bucket: awsConfig.s3.bucket,
      CopySource: `${awsConfig.s3.bucket}/${sourceKey}`,
      Key: destKey,
    });

    const result = await client.send(command);
    logger.info('File copied in S3', { source: sourceKey, dest: destKey });
    return { success: true, storageType: 's3', result };
  }

  await copyFileLocal(sourceKey, destKey);
  return { success: true, storageType: 'local' };
}

async function getFileMetadata(storageKey) {
  const s3Available = isS3Available();

  if (s3Available) {
    const client = initS3();
    if (!client) throw new Error('S3 not configured');

    const command = new HeadObjectCommand({
      Bucket: awsConfig.s3.bucket,
      Key: storageKey,
    });

    const result = await client.send(command);
    return {
      contentLength: result.ContentLength,
      contentType: result.ContentType,
      etag: result.ETag,
      lastModified: result.LastModified,
      metadata: result.Metadata,
      versionId: result.VersionId,
      storageType: 's3',
    };
  }

  const meta = getFileMetadataLocal(storageKey);
  if (!meta) return null;

  return {
    ...meta,
    storageType: 'local',
  };
}

async function listPatientFiles(patientId, prefix = '') {
  const s3Available = isS3Available();

  if (s3Available) {
    const client = initS3();
    if (!client) throw new Error('S3 not configured');

    const command = new ListObjectsV2Command({
      Bucket: awsConfig.s3.bucket,
      Prefix: `files/${patientId}/${prefix}`,
    });

    const result = await client.send(command);
    return result.Contents || [];
  }

  return listPatientFilesLocal(patientId, prefix);
}

async function generateThumbnail(storageKey) {
  // Placeholder - would integrate with sharp or similar
  // For now, return the original key as thumbnail
  return storageKey;
}

module.exports = {
  initS3,
  isS3Available,
  generateS3Key,
  generateLocalKey,
  getFileCategoryFromMimeType,
  uploadFile,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getPresignedPreviewUrl,
  deleteFile,
  copyFile,
  getFileMetadata,
  listPatientFiles,
  generateThumbnail,
};
