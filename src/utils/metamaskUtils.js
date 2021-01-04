import Web3 from 'web3';
import chainId from '../contracts/chainId';
import erc20Abi from '../contracts/erc20.abi';
import idoDFYAbi from '../contracts/idoDFY.abi';

export async function detectBinanceSmartContract() {
    let web3 = null
    if (window.ethereum) {
        if (window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscMainnet)
            || window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscTestnet)
        ) {
            try {
                console.log('connect to eth')
                web3 = new Web3(window.ethereum)
                await window.ethereum.enable()
            } catch (e) {
                web3 = null
            }
        }
    }
    this.web3 = web3
}
