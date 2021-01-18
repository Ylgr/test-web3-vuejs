import Web3 from 'web3';
import window from 'global'
import chainId from '../contracts/chainId';
import erc20Abi from '../contracts/erc20.abi';
import idoDFYAbi from '../contracts/idoDFY.abi';
import {buyIdoContractState, extensionName} from './constants';
import {retryWithTimeout} from './utils';
import {BigNumber} from 'bignumber.js';

export default class WalletExtensionUtils {
    constructor(extension) {
        this.web3 = null
        this.idoSmartcontract = process.env.VUE_APP_IDO_DFY_SMART_CONTRACT_ADDRESS
        let self = this
        if (extension === extensionName.binanceExtension) {
            retryWithTimeout(function () {
                if (window.BinanceChain) {
                    self.extension = window.BinanceChain
                    self.web3 = new Web3(window.BinanceChain)
                    window.BinanceChain.enable().then(async () => {
                        const addresses = await self.web3.eth.getAccounts()
                        self.address = addresses[0]

                        self.buyIdoContract = new self.web3.eth.Contract(idoDFYAbi, self.idoSmartcontract, {
                            transactionConfirmationBlocks: 1
                        })
                    }).catch(error => {
                        console.error(error.message)
                        self.web3 = null
                    })
                } else throw new Error('Detect Binance Extension failed!')
            }, function () {
                alert('You need to have Binance Extension first')
            }, 5, 500)
        } else if (extension === extensionName.metamask || extension === extensionName.trustWallet) {
            retryWithTimeout(function () {
                if (window.ethereum) {
                    self.extension = window.ethereum
                    self.web3 = new Web3(window.ethereum)
                    window.ethereum.enable().then(async () => {
                        if (
                            !(
                                // window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscMainnet)
                                window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscTestnet)
                                // || window.ethereum.chainId == chainId.bscMainnet
                                || window.ethereum.chainId == chainId.bscTestnet
                                // || window.ethereum.networkVersion == chainId.bscMainnet
                                || window.ethereum.networkVersion == chainId.bscTestnet
                            )
                        ) {
                            alert('Please change network to Binance Smart chain!')
                        }
                        const addresses = await self.web3.eth.getAccounts()
                        self.address = addresses[0]

                        self.buyIdoContract = new self.web3.eth.Contract(idoDFYAbi, self.idoSmartcontract, {
                            transactionConfirmationBlocks: 1
                        })
                    }).catch(error => {
                        console.error(error.message)
                        self.web3 = null
                    })
                } else throw new Error('Detect Wallet failed!')
            }, function () {
                alert('Detect Wallet failed!')
            }, 5, 500)
        }
    }

    accountsChanged(callback) {
        const self = this
        this.extension.on('accountsChanged', function (accounts) {
            self.address = accounts[0]
            callback(accounts[0])
        });
    }

    isConnected() {
        return this.web3 !== null
    }

    getCurrentAddress() {
        return this.address
    }

    async getStartTime() {
        return this.buyIdoContract.methods.start().call()
    }

    async getEndTime() {
        return this.buyIdoContract.methods.end().call()
    }

    async getMaxBuyAmount() {
        return this.buyIdoContract.methods.buyMaximum().call()
    }

    async getMaxPersonRef() {
        return this.buyIdoContract.methods.maxPersonRef().call()
    }

    async getReferralRewardPercent() {
        return this.buyIdoContract.methods.refRewardPercent().call()
    }

    async isPauseStatus() {
        return this.buyIdoContract.methods.state().call()
    }

    async getCurrentReferralAmount() {
        return this.buyIdoContract.methods.referralRewardTotal(this.address).call()
    }

    async getBoughtAmount() {
        return this.buyIdoContract.methods.boughtAmountTotals(this.address).call()
    }

    async getRemainDFY() {
        const dfyContract = new this.web3.eth.Contract(erc20Abi, process.env.VUE_APP_DFY_SMART_CONTRACT_ADDRESS)
        return dfyContract.methods.balanceOf(this.idoSmartcontract).call()
    }

    async getSupportTokenAndBalance() {
        let supportTokenAndBalance = []
        const tokenAddresses = await this.buyIdoContract.methods.getTokenSupport().call()
        for (const tokenAddress of tokenAddresses) {
            const exchangeValue = await this.buyIdoContract.methods.exchangePairs(tokenAddress).call()
            const tokenContract = new this.web3.eth.Contract(erc20Abi, tokenAddress)
            const userBalance = await tokenContract.methods.balanceOf(this.address).call()
            if (userBalance.toString() !== '0') {
                const tokenSymbol = await tokenContract.methods.symbol().call()
                supportTokenAndBalance.push({
                    tokenAddress: tokenAddress,
                    tokenSymbol: tokenSymbol,
                    outputDFYNumber: exchangeValue.output,
                    inputTokenNumber: exchangeValue.input,
                    balance: userBalance
                })
            }
        }
        return supportTokenAndBalance
    }

    async buyIdoContractCall(tokenAddress, amount, refAddress, callback) {
        const tokenContract = new this.web3.eth.Contract(erc20Abi, tokenAddress)
        const amountInHex = '0x' + amount.toString(16)
        try {
            callback({
                status: buyIdoContractState.approving
            })
            const allowanceNumber = await tokenContract.methods.allowance(this.address, this.idoSmartcontract).call()
            if (!BigNumber(allowanceNumber).isGreaterThanOrEqualTo(BigNumber(amountInHex))) {
                await tokenContract.methods.approve(this.idoSmartcontract, amountInHex)
                    .send({from: this.address})
            }
            callback({
                status: buyIdoContractState.approved
            })
        } catch (e) {
            console.error(e.message)
            callback({
                status:buyIdoContractState.approveFailed
            })
            return e.message
        }
        try {
            const boughtResult = await this.buyIdoContract.methods.buyIdo(tokenAddress, amountInHex, refAddress)
                .send({from: this.address}, function (error, transactionHash) {
                    callback({
                        status: buyIdoContractState.buying,
                        transaction: {
                            txid: transactionHash,
                            address: this.address,
                            token: tokenAddress,
                            amount: amount.dividedBy(Math.pow(10, 18)).toString()
                        }
                    })
                })
            callback({
                status: buyIdoContractState.bought
            })
            return boughtResult
        } catch (e) {
            callback({
                status: buyIdoContractState.buyFailed
            })
            return e.message
        }
    }
}

