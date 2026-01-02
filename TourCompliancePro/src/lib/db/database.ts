/**
 * TourCompliance Pro - Database Layer
 * =====================================
 *
 * Offline-first database using Dexie (IndexedDB wrapper)
 * with sync support for cloud backup.
 *
 * Features:
 * - Local-first: Works completely offline
 * - Auto-sync: Syncs to cloud when online
 * - Conflict resolution: Last-write-wins with audit trail
 * - Multi-company: Each company's data is isolated
 */

import Dexie, { Table } from 'dexie';
import {
  Company,
  Client,
  Booking,
  Document,
  Payment,
  User,
  AuditLog,
  License,
  ThemeConfig,
  NumberingConfig,
  SyncableEntity
} from '@/types';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

// Extend types with sync metadata
type WithSync<T> = T & SyncableEntity;

export class TourComplianceDB extends Dexie {
  // Tables
  companies!: Table<WithSync<Company>>;
  clients!: Table<WithSync<Client>>;
  bookings!: Table<WithSync<Booking>>;
  documents!: Table<WithSync<Document>>;
  payments!: Table<WithSync<Payment>>;
  users!: Table<WithSync<User>>;
  auditLogs!: Table<AuditLog>;
  licenses!: Table<License>;
  themes!: Table<ThemeConfig>;
  numberingConfigs!: Table<NumberingConfig>;

  // Sync queue for offline changes
  syncQueue!: Table<{
    id: string;
    tableName: string;
    recordId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    data: unknown;
    timestamp: Date;
    retryCount: number;
  }>;

  constructor() {
    super('TourComplianceProDB');

    // Define schema with indexes
    this.version(1).stores({
      companies: 'id, name, gstin, _syncStatus, _lastModified',

      clients: 'id, companyId, name, gstin, phone, _syncStatus, _lastModified, [companyId+name]',

      bookings: `id, companyId, clientId, bookingNumber, status, departureDate, paymentStatus,
                 _syncStatus, _lastModified,
                 [companyId+status], [companyId+departureDate], [clientId+departureDate]`,

      documents: `id, companyId, bookingId, clientId, type, documentNumber, documentDate, status,
                  _syncStatus, _lastModified,
                  [companyId+type], [companyId+documentDate], [bookingId+type]`,

      payments: `id, bookingId, date, mode, _syncStatus, _lastModified,
                 [bookingId+date]`,

      users: `id, companyId, email, role, isActive, _syncStatus, _lastModified,
              [companyId+email], [companyId+role]`,

      auditLogs: `id, companyId, userId, action, resource, timestamp,
                  [companyId+timestamp], [companyId+resource+timestamp], [userId+timestamp]`,

      licenses: 'id, companyId, licenseKey, status, expiryDate',

      themes: 'id, companyId, name',

      numberingConfigs: 'id, companyId, documentType, [companyId+documentType]',

      syncQueue: 'id, tableName, recordId, timestamp, retryCount'
    });
  }
}

// Singleton instance
export const db = new TourComplianceDB();

// ============================================================================
// CRUD OPERATIONS WITH SYNC SUPPORT
// ============================================================================

/**
 * Create a record with sync metadata
 */
export async function createRecord<T extends { id: string }>(
  table: Table<WithSync<T>>,
  data: Omit<T, 'id'> & { id?: string },
  companyId?: string
): Promise<WithSync<T>> {
  const id = data.id || generateId();
  const now = new Date();

  const record: WithSync<T> = {
    ...data,
    id,
    _syncStatus: 'PENDING',
    _localVersion: 1,
    _lastModified: now
  } as WithSync<T>;

  await table.add(record);

  // Add to sync queue
  await db.syncQueue.add({
    id: generateId(),
    tableName: table.name,
    recordId: id,
    action: 'CREATE',
    data: record,
    timestamp: now,
    retryCount: 0
  });

  // Create audit log
  if (companyId) {
    await createAuditLog({
      companyId,
      action: 'CREATE',
      resource: table.name,
      resourceId: id,
      changes: undefined
    });
  }

  return record;
}

/**
 * Update a record with sync support
 */
export async function updateRecord<T extends { id: string }>(
  table: Table<WithSync<T>>,
  id: string,
  updates: Partial<T>,
  companyId?: string,
  userId?: string
): Promise<WithSync<T> | undefined> {
  const existing = await table.get(id);
  if (!existing) {
    throw new Error(`Record not found: ${id}`);
  }

  const now = new Date();

  // Track changes for audit
  const changes = Object.entries(updates).map(([field, newValue]) => ({
    field,
    oldValue: (existing as unknown as Record<string, unknown>)[field],
    newValue
  })).filter(c => c.oldValue !== c.newValue);

  const updated: WithSync<T> = {
    ...existing,
    ...updates,
    _syncStatus: 'PENDING',
    _localVersion: (existing._localVersion || 0) + 1,
    _lastModified: now
  };

  await table.put(updated);

  // Add to sync queue
  await db.syncQueue.add({
    id: generateId(),
    tableName: table.name,
    recordId: id,
    action: 'UPDATE',
    data: updates,
    timestamp: now,
    retryCount: 0
  });

  // Create audit log
  if (companyId && changes.length > 0) {
    await createAuditLog({
      companyId,
      userId,
      action: 'UPDATE',
      resource: table.name,
      resourceId: id,
      changes
    });
  }

  return updated;
}

/**
 * Soft delete a record
 */
export async function deleteRecord<T extends { id: string }>(
  table: Table<WithSync<T>>,
  id: string,
  companyId?: string,
  userId?: string
): Promise<void> {
  const existing = await table.get(id);
  if (!existing) {
    return; // Already deleted
  }

  const now = new Date();

  // Soft delete by marking
  const deleted: WithSync<T> = {
    ...existing,
    _syncStatus: 'PENDING',
    _deletedAt: now,
    _lastModified: now
  };

  await table.put(deleted);

  // Add to sync queue
  await db.syncQueue.add({
    id: generateId(),
    tableName: table.name,
    recordId: id,
    action: 'DELETE',
    data: null,
    timestamp: now,
    retryCount: 0
  });

  // Create audit log
  if (companyId) {
    await createAuditLog({
      companyId,
      userId,
      action: 'DELETE',
      resource: table.name,
      resourceId: id
    });
  }
}

/**
 * Get active records (not deleted)
 */
export async function getActiveRecords<T extends { id: string }>(
  table: Table<WithSync<T>>,
  filter?: Partial<T>
): Promise<WithSync<T>[]> {
  let query = table.filter(record => !record._deletedAt);

  if (filter) {
    query = query.filter(record => {
      return Object.entries(filter).every(([key, value]) =>
        (record as unknown as Record<string, unknown>)[key] === value
      );
    });
  }

  return query.toArray();
}

// ============================================================================
// AUDIT LOG
// ============================================================================

interface AuditLogInput {
  companyId: string;
  userId?: string;
  action: AuditLog['action'];
  resource: string;
  resourceId: string;
  changes?: AuditLog['changes'];
}

async function createAuditLog(input: AuditLogInput): Promise<void> {
  const log: AuditLog = {
    id: generateId(),
    companyId: input.companyId,
    userId: input.userId || 'system',
    userName: 'System', // Will be populated from user context
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    changes: input.changes,
    timestamp: new Date()
  };

  await db.auditLogs.add(log);
}

// ============================================================================
// DOCUMENT NUMBERING
// ============================================================================

/**
 * Get next document number
 */
export async function getNextDocumentNumber(
  companyId: string,
  documentType: string
): Promise<string> {
  const config = await db.numberingConfigs
    .where('[companyId+documentType]')
    .equals([companyId, documentType])
    .first();

  if (!config) {
    // Create default config
    const defaultConfig: NumberingConfig = {
      documentType: documentType as NumberingConfig['documentType'],
      prefix: getDefaultPrefix(documentType),
      separator: '-',
      includeYear: true,
      yearFormat: 'FY',
      startNumber: 1,
      currentNumber: 0,
      paddingDigits: 4
    };

    await db.numberingConfigs.add({
      id: generateId(),
      companyId,
      ...defaultConfig
    } as NumberingConfig & { id: string; companyId: string });

    return formatDocumentNumber(defaultConfig, 1);
  }

  const nextNumber = config.currentNumber + 1;

  // Update current number
  const configWithId = config as NumberingConfig & { id: string };
  await db.numberingConfigs.update(configWithId.id, { currentNumber: nextNumber });

  return formatDocumentNumber(config, nextNumber);
}

function getDefaultPrefix(documentType: string): string {
  const prefixes: Record<string, string> = {
    INVOICE: 'INV',
    PROFORMA: 'PRO',
    DEBIT_NOTE: 'DN',
    CREDIT_NOTE: 'CN',
    QUOTATION: 'QT',
    RECEIPT: 'RCP'
  };
  return prefixes[documentType] || 'DOC';
}

function formatDocumentNumber(config: NumberingConfig, number: number): string {
  const parts: string[] = [];

  // Add prefix
  if (config.prefix) {
    parts.push(config.prefix);
  }

  // Add year
  if (config.includeYear) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (config.yearFormat) {
      case 'YYYY':
        parts.push(year.toString());
        break;
      case 'YY':
        parts.push(year.toString().slice(-2));
        break;
      case 'FY':
        // Financial year format: 2024-25
        if (month >= 3) { // April onwards
          parts.push(`${year}-${(year + 1).toString().slice(-2)}`);
        } else {
          parts.push(`${year - 1}-${year.toString().slice(-2)}`);
        }
        break;
    }
  }

  // Add number with padding
  const paddedNumber = number.toString().padStart(config.paddingDigits, '0');
  parts.push(paddedNumber);

  // Add suffix if present
  if (config.suffix) {
    parts.push(config.suffix);
  }

  return parts.join(config.separator);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique ID (UUID v4)
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get cumulative booking amount for a client in current FY
 */
export async function getClientCumulativeForFY(
  clientId: string,
  financialYearStart: Date,
  financialYearEnd: Date
): Promise<number> {
  const bookings = await db.bookings
    .where('clientId')
    .equals(clientId)
    .filter(booking =>
      !booking._deletedAt &&
      booking.status !== 'CANCELLED' &&
      new Date(booking.departureDate) >= financialYearStart &&
      new Date(booking.departureDate) <= financialYearEnd
    )
    .toArray();

  return bookings.reduce((sum, booking) => sum + (booking.grandTotal || 0), 0);
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize database with default data if needed
 */
export async function initializeDatabase(): Promise<void> {
  // Check if already initialized
  const companyCount = await db.companies.count();
  if (companyCount > 0) {
    console.log('Database already initialized');
    return;
  }

  console.log('Initializing database...');

  // Database is empty, ready for first company setup
  // The actual company will be created during onboarding
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
  console.log('Database cleared');
}

/**
 * Export database for backup
 */
export async function exportDatabase(): Promise<object> {
  const data: Record<string, unknown[]> = {};

  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }

  return {
    exportDate: new Date().toISOString(),
    version: db.verno,
    data
  };
}

/**
 * Import database from backup
 */
export async function importDatabase(backup: {
  version: number;
  data: Record<string, unknown[]>;
}): Promise<void> {
  if (backup.version !== db.verno) {
    throw new Error(`Database version mismatch. Expected ${db.verno}, got ${backup.version}`);
  }

  await db.transaction('rw', db.tables, async () => {
    for (const [tableName, records] of Object.entries(backup.data)) {
      const table = db.table(tableName);
      await table.clear();
      await table.bulkAdd(records);
    }
  });

  console.log('Database imported successfully');
}
