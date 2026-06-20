/** @module Interface host:tenant/tenant-context@1.0.0 **/
export function tenantDid(): Uint8Array;
export function callingUserDid(): Uint8Array | undefined;
export function clusterTimestampSecs(): bigint;
