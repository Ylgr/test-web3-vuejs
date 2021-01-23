import Web3 from 'web3';
import window from 'global'
import chainId from '../contracts/chainId';
import erc20Abi from '../contracts/erc20.abi';
import idoDFYAbi from '../contracts/idoDFY.abi';
import {buyIdoContractState, extensionName, address0} from './constants';
import {retryWithTimeout} from './utils';
import {BigNumber} from 'bignumber.js';

export default class WalletExtensionUtils {
    constructor(extension) {
        this.web3 = null
        this.idoSmartcontract = process.env.VUE_APP_IDO_DFY_SMART_CONTRACT_ADDRESS
        let self = this
        if(process.env.VUE_APP_BLOCKCHAIN_NETWORK === 'TESTNET') {
            import('../tokens/supportTokenTest').then(token => {
                self.mapTokenSymbol = token.default
            })
        } else {
            import('../tokens/supportToken').then(token => {
                self.mapTokenSymbol = token.default
            })
        }
        if (extension === extensionName.binanceExtension) {
            retryWithTimeout(function () {
                if (window.BinanceChain) {
                    self.extension = window.BinanceChain
                    self.web3 = new Web3(window.BinanceChain)
                    window.BinanceChain.enable().then(async () => {
                        const envCheck = process.env.VUE_APP_BLOCKCHAIN_NETWORK === 'TESTNET'
                            ? !(window.BinanceChain.chainId === Web3.utils.numberToHex(chainId.bscTestnet))
                            : !(window.BinanceChain.chainId === Web3.utils.numberToHex(chainId.bscMainnet))
                        if (envCheck) {
                            self.isWrongNetwork = true
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
                        const envCheck = process.env.VUE_APP_BLOCKCHAIN_NETWORK === 'TESTNET'
                            ? !(
                                window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscTestnet)
                                || window.ethereum.chainId == chainId.bscTestnet
                                || window.ethereum.networkVersion == chainId.bscTestnet
                            )
                            : !(
                                window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscMainnet)
                                || window.ethereum.chainId == chainId.bscMainnet
                                || window.ethereum.networkVersion == chainId.bscMainnet
                            )
                        if (envCheck) {
                            self.isWrongNetwork = true
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

    checkWrongNetwork() {
        return this.isWrongNetwork
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

    async getBnbBalance() {
        return this.web3.eth.getBalance(this.address)
    }

    async getSupportTokenAndBalance() {
        let supportTokenAndBalance = []
        const tokenAddresses = await this.buyIdoContract.methods.getTokenSupport().call()
        for (const tokenAddress of tokenAddresses) {
            const exchangeValue = await this.buyIdoContract.methods.exchangePairs(tokenAddress).call()
            try {
                let userBalance = 0
                let tokenSymbol = 'BNB'
                if(tokenAddress === address0) {
                    userBalance = await this.getBnbBalance()
                } else {
                    const tokenContract = new this.web3.eth.Contract(erc20Abi, tokenAddress)
                    userBalance = await tokenContract.methods.balanceOf(this.address).call()
                    tokenSymbol = await tokenContract.methods.symbol().call()
                }

                if (userBalance.toString() !== '0') {
                    supportTokenAndBalance.push({
                        tokenAddress: tokenAddress,
                        tokenSymbol: tokenSymbol,
                        outputDFYNumber: exchangeValue.output,
                        inputTokenNumber: exchangeValue.input,
                        balance: userBalance
                    })
                }
            } catch (e) {
                // donothing
            }
        }
        return supportTokenAndBalance.sort(function (x, y) {
            return x.tokenAddress === address0 ? -1 : y.tokenAddress === address0 ? 1 : 0;
        });
    }

    async buyIdoContractCall(tokenAddress, amount, refAddress, callback) {
        const amountInHex = '0x' + amount.toString(16)
        if(tokenAddress === address0) {
            try {
                const self = this
                const boughtResult = await this.buyIdoContract.methods.buyIdo(tokenAddress, amountInHex, refAddress)
                    .send({from: this.address, value: amountInHex}, function (error, transactionHash) {
                        callback({
                            status: buyIdoContractState.buying,
                            transaction: {
                                txid: transactionHash,
                                address: self.address,
                                token: self.mapTokenSymbol[Web3.utils.toChecksumAddress(tokenAddress)],
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
        } else {
            const tokenContract = new this.web3.eth.Contract(erc20Abi, tokenAddress)
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
                const self = this
                const boughtResult = await this.buyIdoContract.methods.buyIdo(tokenAddress, amountInHex, refAddress)
                    .send({from: this.address}, function (error, transactionHash) {
                        callback({
                            status: buyIdoContractState.buying,
                            transaction: {
                                txid: transactionHash,
                                address: self.address,
                                token: self.mapTokenSymbol[Web3.utils.toChecksumAddress(tokenAddress)],
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
}

