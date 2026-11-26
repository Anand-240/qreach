import { createConfig, http } from "wagmi";
import { injected } from "@wagmi/core";
import { chain } from "./config";

// QIE Wallet injects an EIP-1193 provider and announces itself via EIP-6963,
// so wagmi discovers it (and any other injected wallet) automatically.
export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  multiInjectedProviderDiscovery: true,
  transports: { [chain.id]: http() } as Record<number, ReturnType<typeof http>>,
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
