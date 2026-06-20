/** @module Interface host:interfaces/signing@2.1.0 **/
export function sign(message: Uint8Array): Uint8Array;
export type SignError = SignErrorNoSigningKey | SignErrorSigningFailed | SignErrorPubkeyFormat | SignErrorEncodingFailed;
export interface SignErrorNoSigningKey {
  tag: 'no-signing-key',
}
export interface SignErrorSigningFailed {
  tag: 'signing-failed',
  val: string,
}
export interface SignErrorPubkeyFormat {
  tag: 'pubkey-format',
}
export interface SignErrorEncodingFailed {
  tag: 'encoding-failed',
  val: string,
}
