import { writeContract } from '@wagmi/core';
import abi from './HemiMemoryABI.json';

export const contractAddress = '0x18B9FcE836037f7984028cd5a9B33BAA18De4093';

export async function writeScoreToChain(score, time) {
  try {
    const tx = await writeContract({
      address: contractAddress,
      abi,
      functionName: 'submitScore',
      args: [time, score],
    });
    console.log('✅ Transaction sent:', tx);
  } catch (err) {
    console.error('❌ Error writing to contract:', err);
  }
}
