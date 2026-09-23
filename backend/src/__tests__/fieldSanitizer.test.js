const {
  RESERVED_FIELDS,
  FILE_CLIENT_FIELDS,
  FOLDER_CLIENT_FIELDS,
  MEDICINE_CLIENT_FIELDS,
  FILE_SERVER_FIELDS,
  sanitizeFields,
  stripClientFields,
} = require('../utils/fieldSanitizer');

describe('fieldSanitizer (syncEngine hardening helpers)', () => {
  describe('sanitizeFields', () => {
    it('copies only allowed fields present on the object', () => {
      const src = { name: 'Paracetamol', strength: '500mg', evil: 'x', doseTimes: [] };
      expect(sanitizeFields(src, MEDICINE_CLIENT_FIELDS)).toEqual({
        name: 'Paracetamol',
        strength: '500mg',
        doseTimes: [],
      });
    });

    it('drops undefined fields', () => {
      const src = { name: 'X', endDate: undefined };
      expect(sanitizeFields(src, MEDICINE_CLIENT_FIELDS)).toEqual({ name: 'X' });
    });

    it('returns empty object when nothing is allowed', () => {
      expect(sanitizeFields({ a: 1 }, [])).toEqual({});
    });
  });

  describe('stripClientFields', () => {
    it('strips reserved fields even if allowlisted', () => {
      const src = {
        fileName: 'r.pdf',
        fileSize: 10,
        _id: 'abc',
        patientId: 'p1',
        updatedAt: 'now',
      };
      const result = stripClientFields(src, FILE_CLIENT_FIELDS);
      expect(result).toEqual({ fileName: 'r.pdf', fileSize: 10 });
      for (const f of ['_id', 'patientId', 'updatedAt']) {
        expect(result[f]).toBeUndefined();
      }
    });

    it('always strips server-managed file fields', () => {
      const src = { fileName: 'r.pdf', fileKey: 'secret-key', isDeleted: true, version: 3 };
      const result = stripClientFields(src, FILE_CLIENT_FIELDS);
      expect(result.fileKey).toBeUndefined();
      expect(result.isDeleted).toBeUndefined();
      expect(result.version).toBeUndefined();
      expect(result.fileName).toBe('r.pdf');
    });

    it('strips unknown/non-allowlisted keys entirely', () => {
      const src = { folderName: 'Main', color: 'blue', hackerInput: 'x' };
      expect(stripClientFields(src, FOLDER_CLIENT_FIELDS)).toEqual({
        folderName: 'Main',
        color: 'blue',
      });
    });

    it('does not mutate the source object', () => {
      const src = { name: 'Med', _id: 'keepme' };
      stripClientFields(src, MEDICINE_CLIENT_FIELDS);
      expect(src._id).toBe('keepme');
    });
  });

  describe('allowlists', () => {
    it('reserved fields never overlap with client allowlists', () => {
      const clientFields = [
        ...FILE_CLIENT_FIELDS,
        ...FOLDER_CLIENT_FIELDS,
        ...MEDICINE_CLIENT_FIELDS,
      ];
      const collision = clientFields.filter(f => RESERVED_FIELDS.includes(f));
      expect(collision).toEqual([]);
    });

    it('server file fields are disjoint from file client fields', () => {
      expect(FILE_SERVER_FIELDS.some(f => FILE_CLIENT_FIELDS.includes(f))).toBe(false);
    });
  });
});
