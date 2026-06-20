/** @module Interface host:interfaces/authorisation@2.1.0 **/
export function checkAuthorized(host: Array<string>): void;
export type AuthError = AuthErrorDeniedUnauthorized | AuthErrorDeniedNoAllowlist | AuthErrorDeniedScope | AuthErrorDeniedRevoked;
export interface AuthErrorDeniedUnauthorized {
  tag: 'denied-unauthorized',
  val: string,
}
export interface AuthErrorDeniedNoAllowlist {
  tag: 'denied-no-allowlist',
}
export interface AuthErrorDeniedScope {
  tag: 'denied-scope',
  val: string,
}
export interface AuthErrorDeniedRevoked {
  tag: 'denied-revoked',
}
