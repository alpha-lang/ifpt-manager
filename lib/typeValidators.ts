/**
 * Type validators and guards for Supabase data
 * These functions safely validate and cast data without dangerous "as" assertions
 */

// ============================================
// TYPE DEFINITIONS WITH STRICT SAFETY
// ============================================

export interface SafeRegister {
  id: string;
  status?: string | null;
  created_at?: string;
  opening_date?: string;
  opening_amount?: number | null;
  opening_balance_global?: number | null;
  closing_balance_global?: number | null;
  details_billetage?: unknown;
  [key: string]: unknown;
}

export interface SafeVault {
  id: string;
  name: string;
  balance: number;
  type?: string | null;
  icon?: string | null;
  [key: string]: unknown;
}

export interface SafeStudent {
  id: string;
  matricule: string;
  nom: string;
  classe: string;
  prenom?: string | null;
  [key: string]: unknown;
}

export interface SafeTransaction {
  id: string;
  amount: number;
  type: string;
  category?: string | null;
  description?: string | null;
  created_at: string;
  vault_id?: string | null;
  register_id?: string | null;
  status?: string | null;
  author?: string | null;
  requester_name?: string | null;
  destination_vault_id?: string | null;
  vaults?: { name?: string | null; icon?: string | null } | null;
  [key: string]: unknown;
}

export interface SafePaymentRequest {
  id: string;
  beneficiary: string;
  amount: number;
  description?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

// ============================================
// VALIDATORS
// ============================================

/**
 * Validates if object is a SafeRegister
 */
export function isRegister(obj: unknown): obj is SafeRegister {
  if (!obj || typeof obj !== 'object') return false;
  const data = obj as Record<string, unknown>;
  return typeof data.id === 'string';
}

/**
 * Validates if object is a SafeVault
 */
export function isVault(obj: unknown): obj is SafeVault {
  if (!obj || typeof obj !== 'object') return false;
  const data = obj as Record<string, unknown>;
  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    (typeof data.balance === 'number' || data.balance === null)
  );
}

/**
 * Validates if object is a SafeStudent
 */
export function isStudent(obj: unknown): obj is SafeStudent {
  if (!obj || typeof obj !== 'object') return false;
  const data = obj as Record<string, unknown>;
  return (
    typeof data.id === 'string' &&
    typeof data.matricule === 'string' &&
    typeof data.nom === 'string' &&
    typeof data.classe === 'string'
  );
}

/**
 * Validates if object is a SafeTransaction
 */
export function isTransaction(obj: unknown): obj is SafeTransaction {
  if (!obj || typeof obj !== 'object') return false;
  const data = obj as Record<string, unknown>;
  return (
    typeof data.id === 'string' &&
    typeof data.amount === 'number' &&
    typeof data.type === 'string' &&
    typeof data.created_at === 'string'
  );
}

/**
 * Validates if object is a SafePaymentRequest
 */
export function isPaymentRequest(obj: unknown): obj is SafePaymentRequest {
  if (!obj || typeof obj !== 'object') return false;
  const data = obj as Record<string, unknown>;
  return (
    typeof data.id === 'string' &&
    typeof data.beneficiary === 'string' &&
    typeof data.amount === 'number'
  );
}

// ============================================
// SAFE CASTING FUNCTIONS
// ============================================

/**
 * Safely cast and validate array of registers
 */
export function toRegisters(data: unknown[]): SafeRegister[] {
  return Array.isArray(data)
    ? data.filter(isRegister)
    : [];
}

/**
 * Safely cast and validate array of vaults
 */
export function toVaults(data: unknown[]): SafeVault[] {
  return Array.isArray(data)
    ? data.filter(isVault).map(v => ({
        ...v,
        balance: v.balance ?? 0,
      }))
    : [];
}

/**
 * Safely cast and validate array of students
 */
export function toStudents(data: unknown[]): SafeStudent[] {
  return Array.isArray(data)
    ? data.filter(isStudent)
    : [];
}

/**
 * Safely cast and validate array of transactions
 */
export function toTransactions(data: unknown[]): SafeTransaction[] {
  return Array.isArray(data)
    ? data.filter(isTransaction)
    : [];
}

/**
 * Safely cast and validate array of payment requests
 */
export function toPaymentRequests(data: unknown[]): SafePaymentRequest[] {
  return Array.isArray(data)
    ? data.filter(isPaymentRequest)
    : [];
}

/**
 * Safely cast single register
 */
export function toRegister(data: unknown): SafeRegister | null {
  return isRegister(data) ? data : null;
}

/**
 * Safely cast single vault
 */
export function toVault(data: unknown): SafeVault | null {
  if (!isVault(data)) return null;
  return {
    ...data,
    balance: data.balance ?? 0,
  };
}

/**
 * Safely cast single student
 */
export function toStudent(data: unknown): SafeStudent | null {
  return isStudent(data) ? data : null;
}

/**
 * Safely cast single transaction
 */
export function toTransaction(data: unknown): SafeTransaction | null {
  return isTransaction(data) ? data : null;
}

/**
 * Safely cast single payment request
 */
export function toPaymentRequest(data: unknown): SafePaymentRequest | null {
  return isPaymentRequest(data) ? data : null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get vault name safely
 */
export function getVaultName(vault: SafeVault | null | undefined): string {
  return vault?.name ?? 'Inconnu';
}

/**
 * Get student display name safely
 */
export function getStudentName(student: SafeStudent | null | undefined): string {
  return student ? `${student.nom} (${student.matricule})` : 'Inconnu';
}

/**
 * Parse amount safely
 */
export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Format amount for display
 */
export function formatAmount(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : '0';
}
