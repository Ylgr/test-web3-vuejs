<template>
    <div>
        <button v-on:click="() => this.connnectWithExtension(getExtension().metamask)">Connect with Metamask</button>
        <button v-on:click="() => this.connnectWithExtension(getExtension().binanceExtension)">Connect with Binance Extension</button>
        <button v-on:click="() => this.connnectWithExtension(getExtension().trustWallet)">Connect with Trust Wallet</button>
        <br/>
        <button v-on:click="() => this.buyIdo()" :disabled="!extension">Buy Ido</button>

        <p>{{this.log.join(', ')}}</p>
    </div>
</template>

<script>
    import WalletExtensionUtils from '../utils/walletExtensionUtils';
    import Vue from 'vue';
    import {buyIdoContractState, extensionName} from '../utils/constants';
    import {isMetamaskAvailable, isBinanceExtensionAvailable, isTrustWalletAvailable} from '../utils/utils';
    import { BigNumber } from 'bignumber.js';
    import supportToken from '../tokens/supportToken';
    import axios from 'axios'
    import {isContractBuyingOpen} from '../utils/utils'

    export default {
        name: 'Example',
        data: function () {
            return {
                extension: null,
                log: []
            }
        },
        mounted() {
            isContractBuyingOpen().then(e => console.log('startTime:', e))
        },
        methods: {
            getExtension() {
                return extensionName
            },
            isMetamaskAvailable() {
                return isMetamaskAvailable()
            },
            isBinanceExtensionAvailable() {
                return isBinanceExtensionAvailable()
            },
            isTrustWalletAvailable() {
                return isTrustWalletAvailable()
            },
            connnectWithExtension(extension) {

                Vue.set(this.log, this.log.length, 'window.ethereum')
                Vue.set(this.log, this.log.length, JSON.stringify(window.ethereum))
                Vue.set(this.log, this.log.length, 'window.BinanceChain')
                Vue.set(this.log, this.log.length, JSON.stringify(window.BinanceChain))
                Vue.set(this.log, this.log.length, 'window.Web3')
                Vue.set(this.log, this.log.length, JSON.stringify(window.Web3))

                this.extension = new WalletExtensionUtils(extension)
                console.log('supportToken: ', Object.keys(supportToken))

                function getInfo(self, retryTime) {
                    setTimeout(async () => {
                        console.log('getting info....')
                        try {
                            // if(self.extension.checkWrongNetwork()) {
                            //     alert('Wrong network!')
                            // } else {
                                console.log('pause status')
                                const isBuyingOpen = await self.extension.isBuyingOpen()
                                console.log('isBuyingOpen: ', isBuyingOpen)
                                // console.time('supportToken');
                                // const bnbBalance = await self.extension.getBalance(Object.keys(supportToken))
                                // console.log('getBnbBalance: ', bnbBalance)
                                // console.timeEnd('supportToken')
                                self.extension.accountsChanged(function (log) {
                                    console.log('callback account change')
                                    console.log(log)
                                })
                                console.log('dasdasd')
                                const balance = await self.extension.getSupportTokenAndBalance()
                                console.log('balance: ', balance)
                                const boughtAmount = await self.extension.getBoughtAmount()
                                console.log('boughtAmount: ', boughtAmount)
                                const remainDFY = await self.extension.getRemainDFY()
                                console.log('remainDFY: ', remainDFY)
                                return true
                            // }
                        } catch (e) {
                            console.log('retryTime: ', retryTime)
                            if(retryTime === 0) {
                                console.error(e.message)
                            } else {
                                return getInfo(self,retryTime - 1)
                            }
                        }
                    }, 1000)

                }

                getInfo(this,5)
            },
            buyIdo: async function () {
                const start = await this.extension.getStartTime()
                console.log('getStartTime: ', start)
                const end = await this.extension.getEndTime()
                console.log('getEndTime: ', end)
                console.log('..Test getHistory..')
                console.log('isConnected: ',this.extension.isConnected())
                Vue.set(this.log, this.log.length, 'isConnected: ' + this.extension.isConnected())
                const address0 = '0x0000000000000000000000000000000000000000'
                const buyResult = await this.extension.buyIdoContractCall('0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378',BigNumber(0.05*Math.pow(10,18)),address0, (msg) => {
                    console.log('buy state: ', msg)
                    if(msg.status === buyIdoContractState.buying) {
                        const config = {
                            method: 'post',
                            url: 'https://be.defi.com.vn/api/transaction-histories/pending',
                            headers: {
                                'Authorization': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJyb290IiwiaWF0IjoxNjEwNDIzNjgyLCJiNTZmOWQ3Ni00YTFhLTQ4ODQtYTNkZS1hMGM4OGMwZGJhMTYiOiI2NDE4YWY0ZS0wMDFkLTRlYjgtYWIyNC1kZjM3NjZkNTc5N2QiLCI1ZmQzYmU0My0wNDRlLTQyNjAtYWE4Ny02Mjg2NWY2ZTk0ZTkiOiJkNTY0NWY0NC1kMGZkLTRhOWEtYThmMS1hYTJhMDYxODM3YTIiLCJleHAiOjM3NTc5MDczMjl9.1O6rsDpKcCx_j1B3NtaHb5wPTtgFUA8HnJ_61IAPlpohATfyV5oZO5z5lYXoEfDGtwzwtPv5shjzMzEzoKnmZg',
                                'Content-Type': 'application/json'
                            },
                            data : JSON.stringify(msg.transaction)
                        }

                        axios(config)
                            .then(function (response) {
                                console.log(JSON.stringify(response.data));
                            })
                            .catch(function (error) {
                                console.log(error);
                            });
                    }
                    Vue.set(this.log, this.log.length, 'state: ' + JSON.stringify(msg))

                })
                console.log('buyResult: ', buyResult)
            }
        }
    }
</script>

<style scoped>

</style>
