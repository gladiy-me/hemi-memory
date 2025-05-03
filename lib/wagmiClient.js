import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

const hemiMainnet = {
  id: 43111, // ✅ Chain ID для Hemi Mainnet
  name: 'Hemi Mainnet',
  network: 'hemi',
  nativeCurrency: {
    name: 'Hemi',
    symbol: 'HEMI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hemi.network/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hemi Explorer',
      url: 'https://explorer.hemi.network',
    },
  },
};

export const config = getDefaultConfig({
  appName: 'Hemi Memory',
  projectId: 'test123', // или замени на свой WalletConnect Cloud projectId
  chains: [hemiMainnet],
  transports: {
    [hemiMainnet.id]: http(),
  },
});
