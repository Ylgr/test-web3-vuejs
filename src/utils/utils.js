import window from "global";

export function isMetamaskAvailable() {
    return !!(window.ethereum && window.ethereum.isMetaMask)
}

export function isBinanceExtensionAvailable() {
    return !!window.BinanceChain
}

export function isTrustWalletAvailable() {
    return !!(window.ethereum && window.ethereum.isTrust)
}

export function retryWithTimeout(callback, callbackReject = function () {} , retryTime = 5, timeout = 1000) {
    return setTimeout(async () => {
        try {
            await callback()
        } catch (e) {
            console.log(e.message)
            if(retryTime === 0) {
                console.error(e.message)
                await callbackReject()
            } else {
                return retryWithTimeout(callback,retryTime - 1, timeout)
            }
        }
    }, timeout)
}

import Web3 from "web3";
import idoDFYAbi from '../contracts/idoDFY.abi';
const web3 = new Web3(process.env.VUE_APP_BLOCKCHAIN_NETWORK === 'TESTNET' ? 'https://data-seed-prebsc-1-s1.binance.org:8545' : 'https://bsc-dataseed.binance.org/')


const buyIdoContract = new web3.eth.Contract(idoDFYAbi, process.env.VUE_APP_IDO_DFY_SMART_CONTRACT_ADDRESS, {
    transactionConfirmationBlocks: 1
})

export async function getContractStartTime() {
    return buyIdoContract.methods.start().call()
}

export async function getContractEndTime() {
    return buyIdoContract.methods.end().call()
}

export async function isContractPauseStatus() {
    return buyIdoContract.methods.stage().call()
}

export async function isContractPublicOpen() {
    return buyIdoContract.methods.isPublic().call()
}

export async function isContractBuyingOpen() {
    let reason = []
    let isOpen = true
    const currentTime = (new Date().getTime()) / 1000
    console.log('currentTime: ', currentTime)
    const startTime = await getContractStartTime()
    console.log('startTime: ', startTime)
    const endTime = await getContractEndTime()
    console.log('endTime: ', endTime)

    const isPause = await isContractPauseStatus()
    console.log('isPause: ', isPause)

    const isPublic = await isContractPublicOpen()
    console.log('isPublic: ', isPublic)

    if (currentTime < startTime) {
        isOpen = false
        reason.push('Sales time is not started.')
    }
    if (currentTime > endTime) {
        isOpen = false
        reason.push('Sales time is not ended.')
    }
    if (isPause.toString() === '1') {
        isOpen = false
        reason.push('Contract is pause.')
    }
    if (!isPublic) {
        reason.push('Public sales still not open.')
    }
    return {
        status: isOpen,
        reason: reason
    }
}
