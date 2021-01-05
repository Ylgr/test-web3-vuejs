import Web3 from 'web3';
import chainId from '../contracts/chainId';
import erc20Abi from '../contracts/erc20.abi';
import idoDFYAbi from '../contracts/idoDFY.abi';
import {buyIdoContractState} from './constants';

export default class MetamaskUtils {
    constructor() {
        this.web3 = null
        this.idoSmartcontract = process.env.VUE_APP_IDO_DFY_SMART_CONTRACT_ADDRESS
        console.log('process.env: ', process.env)
        console.log('this.idoSmartcontract: ', this.idoSmartcontract)
        const self = this
        if (window.ethereum) {
            if (window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscMainnet)
                || window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscTestnet)
            ) {
                console.log('connect to eth')
                this.web3 = new Web3(window.ethereum)
                window.ethereum.enable().then(async () => {
                    const addresses = await this.web3.eth.getAccounts()
                    this.address = addresses[0]

                    this.buyIdoContract = new this.web3.eth.Contract(idoDFYAbi, self.idoSmartcontract, {
                        transactionConfirmationBlocks: 1
                    })
                }).catch(error => {
                    console.error(error.message)
                    this.web3 = null
                })
            }
        }
    }

    isConnected() {
        return this.web3 !== null
    }

    getCurrentAddress() {
        return this.address
    }

    async getSupportTokenAndBalance() {
        let supportTokenAndBalance = []
        const tokenAddresses = await this.buyIdoContract.methods.getTokenSupport().call()
        for(const tokenAddress of tokenAddresses) {
            const exchangeValue = await this.buyIdoContract.methods.exchangeValues(tokenAddress).call()
            const tokenContract = new this.web3.eth.Contract(erc20Abi, tokenAddress)
            const userBalance = await tokenContract.methods.balanceOf(this.address).call()
            supportTokenAndBalance.push({
                tokenAddress: tokenAddress,
                outputDFYNumber: exchangeValue.outputDFYNumber,
                inputTokenNumber: exchangeValue.inputTokenNumber,
                balance: userBalance
            })
        }
        return supportTokenAndBalance
    }

    async addPairContractCall(addPairTokenAddress, addPairOutputDFY, addPairInputToken = 1) {
        return this.buyIdoContract.methods.upsertExchangePair(addPairTokenAddress, addPairOutputDFY, addPairInputToken)
            .send({from: this.address});
    }


    async buyIdoContractCall(tokenAddress, amount, callback) {
        const tokenContract = new this.web3.eth.Contract(erc20Abi, tokenAddress)
        try {
            callback(buyIdoContractState.approving)
            await tokenContract.methods.approve(this.idoSmartcontract, amount)
                .send({from: this.address})
            callback(buyIdoContractState.approved)
        } catch (e) {
            callback(buyIdoContractState.approveFailed)
            return e.message
        }
        try {
            callback(buyIdoContractState.buying)
            const boughtResult = await this.buyIdoContract.methods.buyIdo(tokenAddress, amount)
                .send({from: this.address})
            callback(buyIdoContractState.bought)
            return boughtResult
        } catch (e) {
            callback(buyIdoContractState.buyFailed)
            return e.message
        }
    }
}

