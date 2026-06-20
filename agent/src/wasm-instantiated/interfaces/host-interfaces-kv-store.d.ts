/** @module Interface host:interfaces/kv-store@2.1.0 **/
export function get(mapName: string, key: Uint8Array): Uint8Array | undefined;
export function put(mapName: string, key: Uint8Array, value: Uint8Array): void;
