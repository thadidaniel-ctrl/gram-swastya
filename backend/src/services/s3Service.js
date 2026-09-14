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
const path = require('path');
const config = require('../config/awsConfig');
const logger = require('../utils/logger');
const { compressImage, isCompressible, getImageMetadata } = require('./compressionService');

let s3Client = null;

function initS3() {
  if (s3Client) return s3Client;

  const { accessKeyId, secretAccessKey, region, endpoint, forcePathStyle } = config.s3;

  if (!accessKeyId || !secretAccessKey) {
    logger.warn('AWS S3 credentials not configured. File storage will not work.');
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

  logger.info('AWS S3 client initialized', { region, bucket: config.s3.bucket });
  return s3Client;
}

function isS3Available() {
  return !!s3Client || !!initS3();
}

function generateS3Key(patientId, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
  return `files/${patientId}/${timestamp}-${random}-${sanitized}`;
}

function getFileCategoryFromMimeType(mimeType) {
  if (mimeType.startsWith('image/')) return 'imaging';
  if (mimeType === 'application/pdf') return 'lab_report';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'prescription';
  if (mimeType === 'text/plain') return 'other';
  return 'other';
}

async function uploadFile(fileBuffer, s3Key, mimeType, metadata = {}) {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const { bucket } = config.s3;

  // Compress image if applicable
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

    // Add compression metadata
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
      partSize: 5 * 1024 * 1024, // 5MB parts
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
      s3Key: result.Key,
      s3Bucket: result.Bucket,
      s3Region: config.s3.region,
      s3ETag: result.ETag,
      s3VersionId: result.VersionId,
      compression: compressionInfo,
    };
  } catch (error) {
    logger.error('S3 upload failed', { key: s3Key, error: error.message });
    throw error;
  }
}

async function getPresignedUploadUrl(s3Key, mimeType, expiry = config.presigned.uploadExpiry) {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key,
    ContentType: mimeType,
  });

  return getSignedUrl(client, command, { expiresIn: expiry });
}

async function getPresignedDownloadUrl(
  s3Key,
  originalName,
  expiry = config.presigned.downloadExpiry
) {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
  });

  return getSignedUrl(client, command, { expiresIn: expiry });
}

async function getPresignedPreviewUrl(s3Key, expiry = config.presigned.previewExpiry) {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key,
    ResponseContentDisposition: 'inline',
  });

  return getSignedUrl(client, command, { expiresIn: expiry });
}

async function deleteFile(s3Key) {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const command = new DeleteObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key,
  });

  await client.send(command);
  logger.info('File deleted from S3', { key: s3Key });
}

async function copyFile(sourceKey, destKey) {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const command = new CopyObjectCommand({
    Bucket: config.s3.bucket,
    CopySource: `${config.s3.bucket}/${sourceKey}`,
    Key: destKey,
  });

  const result = await client.send(command);
  logger.info('File copied in S3', { source: sourceKey, dest: destKey });
  return result;
}

async function getFileMetadata(s3Key) {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const command = new HeadObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key,
  });

  const result = await client.send(command);
  return {
    contentLength: result.ContentLength,
    contentType: result.ContentType,
    etag: result.ETag,
    lastModified: result.LastModified,
    metadata: result.Metadata,
    versionId: result.VersionId,
  };
}

async function listPatientFiles(patientId, prefix = '') {
  const client = initS3();
  if (!client) throw new Error('S3 not configured');

  const command = new ListObjectsV2Command({
    Bucket: config.s3.bucket,
    Prefix: `patients/${patientId}/${prefix}`,
  });

  const result = await client.send(command);
  return result.Contents || [];
}

async function generateThumbnail(s3Key) {
  // Placeholder - would integrate with sharp or similar
  // For now, return the original key as thumbnail
  return s3Key;
}

module.exports = {
  initS3,
  isS3Available,
  generateS3Key,
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
