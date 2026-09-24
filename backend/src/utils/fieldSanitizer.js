// Fields a client is never allowed to set directly
const RESERVED_FIELDS = [
  '_id',
  'id',
  'patientId',
  'patient',
  'clientId',
  'updatedAt',
  'createdAt',
  'action',
];

const FILE_CLIENT_FIELDS = ['fileName', 'fileSize', 'mimeType', 'category', 'tags', 'folderId'];

const FOLDER_CLIENT_FIELDS = ['folderName', 'color', 'description', 'parentFolderId', 'sortOrder'];

const MEDICINE_CLIENT_FIELDS = [
  'name',
  'genericName',
  'strength',
  'form',
  'frequency',
  'doseTimes',
  'startDate',
  'endDate',
  'totalQuantity',
  'remainingQuantity',
  'lowStockThreshold',
  'instructions',
  'enableReminders',
  'isActive',
];

// Server-managed file fields must never be written from the client.
const FILE_SERVER_FIELDS = [
  'fileKey',
  'isDeleted',
  'deletedAt',
  'recoveryExpiresAt',
  'version',
  'uploadedAt',
];

function sanitizeFields(obj, allowed) {
  const clean = {};
  for (const field of allowed) {
    if (obj[field] !== undefined) {
      clean[field] = obj[field];
    }
  }
  return clean;
}

function stripClientFields(obj, allowed = []) {
  const clean = sanitizeFields(obj, allowed);
  for (const field of RESERVED_FIELDS) {
    delete clean[field];
  }
  for (const field of FILE_SERVER_FIELDS) {
    delete clean[field];
  }
  return clean;
}

module.exports = {
  RESERVED_FIELDS,
  FILE_CLIENT_FIELDS,
  FOLDER_CLIENT_FIELDS,
  MEDICINE_CLIENT_FIELDS,
  FILE_SERVER_FIELDS,
  sanitizeFields,
  stripClientFields,
};
