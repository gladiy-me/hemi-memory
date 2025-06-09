// lib/contract.js
import { BrowserProvider, Contract } from "ethers";
import abi from "./HemiMemoryABI.json";

// Ваш контракт
export const contractAddress = "0x801478A4CadD6b99f5E612B309BDA5b29022f09A";

// Возвращает BrowserProvider (v6) или кидает, если MetaMask не найден
function getProvider() {
  // @ts-ignore
  if (!window.ethereum) throw new Error("MetaMask не найдена");
  // ethers v6
  return new BrowserProvider(window.ethereum);
}

/**
 * Подписать и отправить submitScore(score) в контракт
 * @param {number} score
 */
export async function writeScoreToChain(score) {
  // 1) получаем провайдер
  const provider = getProvider();
  // 2) просим подключиться
  await provider.send("eth_requestAccounts", []);
  // 3) берём signer
  const signer = await provider.getSigner();
  // 4) создаём инстанс контракта
  const contract = new Contract(contractAddress, abi, signer);
  // 5) шлём транзакцию
  const tx = await contract.submitScore(score);
  // 6) ждём подтверждений
  return tx.wait();
}
