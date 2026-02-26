import { describe, it, expect } from 'vitest';
import {
  SCOPES,
  validateScopes,
  normalizeScopes,
  getScopeService,
  getScopeDescription,
} from './scopes.js';

describe('scopes', () => {
  describe('SCOPES', () => {
    it('should have Gmail scopes', () => {
      expect(SCOPES.GMAIL.FULL).toBe('https://mail.google.com/');
      expect(SCOPES.GMAIL.MODIFY).toContain('gmail.modify');
      expect(SCOPES.GMAIL.READONLY).toContain('gmail.readonly');
      expect(SCOPES.GMAIL.SEND).toContain('gmail.send');
      expect(SCOPES.GMAIL.COMPOSE).toContain('gmail.compose');
      expect(SCOPES.GMAIL.LABELS).toContain('gmail.labels');
    });

    it('should have Calendar scopes', () => {
      expect(SCOPES.CALENDAR.FULL).toContain('calendar');
      expect(SCOPES.CALENDAR.READONLY).toContain('calendar.readonly');
      expect(SCOPES.CALENDAR.EVENTS).toContain('calendar.events');
    });

    it('should have Drive scopes', () => {
      expect(SCOPES.DRIVE.FULL).toContain('drive');
      expect(SCOPES.DRIVE.READONLY).toContain('drive.readonly');
      expect(SCOPES.DRIVE.FILE).toContain('drive.file');
    });

    it('should have Sheets scopes', () => {
      expect(SCOPES.SHEETS.FULL).toContain('spreadsheets');
      expect(SCOPES.SHEETS.READONLY).toContain('spreadsheets.readonly');
    });

    it('should have Docs scopes', () => {
      expect(SCOPES.DOCS.FULL).toContain('documents');
      expect(SCOPES.DOCS.READONLY).toContain('documents.readonly');
    });

    it('should have Slides scopes', () => {
      expect(SCOPES.SLIDES.FULL).toContain('presentations');
    });

    it('should have Tasks scopes', () => {
      expect(SCOPES.TASKS.FULL).toContain('tasks');
      expect(SCOPES.TASKS.READONLY).toContain('tasks.readonly');
    });

    it('should have Chat scopes', () => {
      expect(SCOPES.CHAT.SPACES).toContain('chat.spaces');
      expect(SCOPES.CHAT.MESSAGES).toContain('chat.messages');
    });

    it('should have Classroom scopes', () => {
      expect(SCOPES.CLASSROOM.COURSES).toContain('classroom.courses');
    });

    it('should have Forms scopes', () => {
      expect(SCOPES.FORMS.FULL).toContain('forms.body');
    });

    it('should have AppScript scopes', () => {
      expect(SCOPES.APPSCRIPT.PROJECTS).toContain('script.projects');
    });

    it('should have Keep scopes', () => {
      expect(SCOPES.KEEP.FULL).toContain('keep');
    });

    it('should have Groups scopes', () => {
      expect(SCOPES.GROUPS.FULL).toContain('cloud-identity.groups');
    });
  });

  describe('validateScopes', () => {
    it('should validate correct scopes', () => {
      expect(validateScopes([SCOPES.GMAIL.READONLY, SCOPES.CALENDAR.FULL])).toBe(true);
    });

    it('should validate Gmail full scope', () => {
      expect(validateScopes([SCOPES.GMAIL.FULL])).toBe(true);
    });

    it('should reject invalid scopes', () => {
      expect(validateScopes(['https://invalid.com/scope'])).toBe(false);
    });

    it('should handle empty array', () => {
      expect(validateScopes([])).toBe(true);
    });

    it('should reject mixed valid and invalid', () => {
      expect(validateScopes([SCOPES.GMAIL.READONLY, 'invalid'])).toBe(false);
    });
  });

  describe('normalizeScopes', () => {
    it('should deduplicate scopes', () => {
      const result = normalizeScopes([
        SCOPES.GMAIL.READONLY,
        SCOPES.GMAIL.READONLY,
        SCOPES.CALENDAR.FULL,
      ]);
      expect(result).toHaveLength(2);
    });

    it('should sort scopes', () => {
      const result = normalizeScopes([SCOPES.TASKS.FULL, SCOPES.CALENDAR.FULL, SCOPES.GMAIL.FULL]);
      expect(result).toEqual([...result].sort());
    });

    it('should handle empty array', () => {
      expect(normalizeScopes([])).toEqual([]);
    });
  });

  describe('getScopeService', () => {
    it('should return gmail for Gmail scopes', () => {
      expect(getScopeService(SCOPES.GMAIL.READONLY)).toBe('gmail');
    });

    it('should return gmail for full Gmail scope', () => {
      expect(getScopeService(SCOPES.GMAIL.FULL)).toBe('gmail');
    });

    it('should return calendar for Calendar scopes', () => {
      expect(getScopeService(SCOPES.CALENDAR.FULL)).toBe('calendar');
    });

    it('should return drive for Drive scopes', () => {
      expect(getScopeService(SCOPES.DRIVE.FULL)).toBe('drive');
    });

    it('should return sheets for Sheets scopes', () => {
      expect(getScopeService(SCOPES.SHEETS.FULL)).toBe('sheets');
    });

    it('should return docs for Docs scopes', () => {
      expect(getScopeService(SCOPES.DOCS.FULL)).toBe('docs');
    });

    it('should return slides for Slides scopes', () => {
      expect(getScopeService(SCOPES.SLIDES.FULL)).toBe('slides');
    });

    it('should return contacts for Contacts scopes', () => {
      expect(getScopeService(SCOPES.CONTACTS.FULL)).toBe('contacts');
    });

    it('should return tasks for Tasks scopes', () => {
      expect(getScopeService(SCOPES.TASKS.FULL)).toBe('tasks');
    });

    it('should return undefined for unknown scopes', () => {
      expect(getScopeService('unknown')).toBeUndefined();
    });
  });

  describe('getScopeDescription', () => {
    it('should return description for known scopes', () => {
      expect(getScopeDescription(SCOPES.GMAIL.READONLY)).toBe('Read-only access to Gmail');
      expect(getScopeDescription(SCOPES.CALENDAR.FULL)).toBe('Full access to Google Calendar');
      expect(getScopeDescription(SCOPES.DRIVE.FULL)).toBe('Full access to Google Drive');
    });

    it('should return the scope itself for unknown scopes', () => {
      const unknown = 'https://unknown.scope';
      expect(getScopeDescription(unknown)).toBe(unknown);
    });
  });
});
