/** @module Interface host:outbox/outbox@1.0.0 **/
export function enqueue(idk: string, request: Request): void;
/**
 * # Variants
 * 
 * ## `"get"`
 * 
 * ## `"post"`
 * 
 * ## `"put"`
 * 
 * ## `"patch"`
 * 
 * ## `"delete"`
 */
export type Verb = 'get' | 'post' | 'put' | 'patch' | 'delete';
export interface Request {
  method: Verb,
  url: string,
  headers: Array<[string, string]>,
  body: Uint8Array,
}
export type OutboxError = OutboxErrorInvalidIdk | OutboxErrorIdkCollision | OutboxErrorOutboxFull | OutboxErrorNoActiveTx | OutboxErrorHostNotAllowed | OutboxErrorInvalidUrl | OutboxErrorKv | OutboxErrorDecode | OutboxErrorLeaderOnly;
export interface OutboxErrorInvalidIdk {
  tag: 'invalid-idk',
  val: string,
}
export interface OutboxErrorIdkCollision {
  tag: 'idk-collision',
}
export interface OutboxErrorOutboxFull {
  tag: 'outbox-full',
}
export interface OutboxErrorNoActiveTx {
  tag: 'no-active-tx',
}
export interface OutboxErrorHostNotAllowed {
  tag: 'host-not-allowed',
  val: string,
}
export interface OutboxErrorInvalidUrl {
  tag: 'invalid-url',
  val: string,
}
export interface OutboxErrorKv {
  tag: 'kv',
  val: string,
}
export interface OutboxErrorDecode {
  tag: 'decode',
  val: string,
}
export interface OutboxErrorLeaderOnly {
  tag: 'leader-only',
}
