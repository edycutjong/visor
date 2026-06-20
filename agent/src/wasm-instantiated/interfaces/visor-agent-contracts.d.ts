/** @module Interface visor:agent/contracts@1.0.0 **/
export function registerTemplate(req: GenericInput): Uint8Array;
export function draftSubmission(req: GenericInput): Uint8Array;
export function blindSubmit(req: GenericInput): Uint8Array;
export function finalize(req: GenericInput): Uint8Array;
export function getStatus(req: GenericInput): Uint8Array;
export function verifyReceipt(req: GenericInput): Uint8Array;
export interface GenericInput {
  input?: Uint8Array,
  userProfile?: Uint8Array,
  context?: Uint8Array,
}
