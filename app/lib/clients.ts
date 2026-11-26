import { createPublicClient, http } from "viem";
import { chain, qieMainnet } from "./config";

export const publicClient = createPublicClient({ chain, transport: http(), batch: { multicall: false } });
/** QIE components that live only on mainnet (oracle, real router quotes) are read here. */
export const mainnetClient =
  chain.id === qieMainnet.id ? publicClient : createPublicClient({ chain: qieMainnet, transport: http() });
