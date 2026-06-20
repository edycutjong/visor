// world root:component/root
import type * as HostInterfacesAuthorisation from './interfaces/host-interfaces-authorisation.js'; // host:interfaces/authorisation@2.1.0
import type * as HostInterfacesHttpWithPlaceholders from './interfaces/host-interfaces-http-with-placeholders.js'; // host:interfaces/http-with-placeholders@2.1.0
import type * as HostInterfacesKvStore from './interfaces/host-interfaces-kv-store.js'; // host:interfaces/kv-store@2.1.0
import type * as HostInterfacesLogging from './interfaces/host-interfaces-logging.js'; // host:interfaces/logging@2.1.0
import type * as HostInterfacesSigning from './interfaces/host-interfaces-signing.js'; // host:interfaces/signing@2.1.0
import type * as HostOutboxOutbox from './interfaces/host-outbox-outbox.js'; // host:outbox/outbox@1.0.0
import type * as HostTenantTenantContext from './interfaces/host-tenant-tenant-context.js'; // host:tenant/tenant-context@1.0.0
import type * as VisorAgentChainRpc from './interfaces/visor-agent-chain-rpc.js'; // visor:agent/chain-rpc@1.0.0
import type * as VisorAgentZkVerify from './interfaces/visor-agent-zk-verify.js'; // visor:agent/zk-verify@1.0.0
import type * as WasiCliEnvironment from './interfaces/wasi-cli-environment.js'; // wasi:cli/environment@0.2.6
import type * as WasiCliExit from './interfaces/wasi-cli-exit.js'; // wasi:cli/exit@0.2.6
import type * as WasiCliStderr from './interfaces/wasi-cli-stderr.js'; // wasi:cli/stderr@0.2.6
import type * as WasiIoError from './interfaces/wasi-io-error.js'; // wasi:io/error@0.2.6
import type * as WasiIoStreams from './interfaces/wasi-io-streams.js'; // wasi:io/streams@0.2.6
import type * as VisorAgentContracts from './interfaces/visor-agent-contracts.js'; // visor:agent/contracts@1.0.0
export interface ImportObject {
  'host:interfaces/authorisation@2.1.0': typeof HostInterfacesAuthorisation,
  'host:interfaces/http-with-placeholders@2.1.0': typeof HostInterfacesHttpWithPlaceholders,
  'host:interfaces/kv-store@2.1.0': typeof HostInterfacesKvStore,
  'host:interfaces/logging@2.1.0': typeof HostInterfacesLogging,
  'host:interfaces/signing@2.1.0': typeof HostInterfacesSigning,
  'host:outbox/outbox@1.0.0': typeof HostOutboxOutbox,
  'host:tenant/tenant-context@1.0.0': typeof HostTenantTenantContext,
  'visor:agent/chain-rpc@1.0.0': typeof VisorAgentChainRpc,
  'visor:agent/zk-verify@1.0.0': typeof VisorAgentZkVerify,
  'wasi:cli/environment@0.2.6': typeof WasiCliEnvironment,
  'wasi:cli/exit@0.2.6': typeof WasiCliExit,
  'wasi:cli/stderr@0.2.6': typeof WasiCliStderr,
  'wasi:io/error@0.2.6': typeof WasiIoError,
  'wasi:io/streams@0.2.6': typeof WasiIoStreams,
}
export interface Root {
  'visor:agent/contracts@1.0.0': typeof VisorAgentContracts,
  contracts: typeof VisorAgentContracts,
}

/**
* Instantiates this component with the provided imports and
* returns a map of all the exports of the component.
*
* This function is intended to be similar to the
* `WebAssembly.Instantiate` constructor. The second `imports`
* argument is the "import object" for wasm, except here it
* uses component-model-layer types instead of core wasm
* integers/numbers/etc.
*
* The first argument to this function, `getCoreModule`, is
* used to compile core wasm modules within the component.
* Components are composed of core wasm modules and this callback
* will be invoked per core wasm module. The caller of this
* function is responsible for reading the core wasm module
* identified by `path` and returning its compiled
* `WebAssembly.Module` object. This would use the
* `WebAssembly.Module` constructor on the web, for example.
*/
export function instantiate(
getCoreModule: (path: string) => WebAssembly.Module,
imports: ImportObject,
instantiateCore?: (module: WebAssembly.Module, imports: Record<string, any>) => WebAssembly.Instance
): Root;
export function instantiate(
getCoreModule: (path: string) => WebAssembly.Module | Promise<WebAssembly.Module>,
imports: ImportObject,
instantiateCore?: (module: WebAssembly.Module, imports: Record<string, any>) => WebAssembly.Instance | Promise<WebAssembly.Instance>
): Root | Promise<Root>;

