/** @module Interface host:interfaces/http-with-placeholders@2.1.0 **/
export function call(request: Request): Response;
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
  headers?: Array<[string, string]>,
  payload?: Uint8Array,
}
export interface Response {
  code: number,
  payload: Uint8Array,
}
export type HttpError = HttpErrorEgressDenied | HttpErrorPlaceholderDenied | HttpErrorPlaceholderUnknown | HttpErrorPlaceholderNoUserContext | HttpErrorUpstreamError;
export interface HttpErrorEgressDenied {
  tag: 'egress-denied',
  val: string,
}
export interface HttpErrorPlaceholderDenied {
  tag: 'placeholder-denied',
  val: string,
}
export interface HttpErrorPlaceholderUnknown {
  tag: 'placeholder-unknown',
  val: string,
}
export interface HttpErrorPlaceholderNoUserContext {
  tag: 'placeholder-no-user-context',
}
export interface HttpErrorUpstreamError {
  tag: 'upstream-error',
  val: string,
}
