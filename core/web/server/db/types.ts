/**
 * Shared types for the contact-messages data access layer.
 *
 * One durable resource (`ContactMessage`) is enough to prove SQLite / Postgres /
 * DynamoDB adapters end-to-end without inventing a full product model.
 */

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  body: string;
  /** ISO-8601 timestamp */
  createdAt: string;
}

export interface CreateContactMessageInput {
  name: string;
  email: string;
  body: string;
}

/**
 * Thin repository interface implemented by each environment adapter.
 */
export interface MessageStore {
  list(): Promise<ContactMessage[]>;
  create(input: CreateContactMessageInput): Promise<ContactMessage>;
  /** Optional cleanup for pooled / file-backed clients (tests, graceful shutdown). */
  close?(): Promise<void> | void;
}

/** Canonical SYS_ENV values (legacy `remote` is normalized to `development`). */
export type { SysEnv } from './sys-env';
