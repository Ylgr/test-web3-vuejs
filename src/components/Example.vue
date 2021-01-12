<template>
    <div>
        <button v-on:click="() => this.connnectWithExtension(getExtension().metamask)" :disabled="!isMetamaskAvailable()">Connect with Metamask</button>
        <button v-on:click="() => this.connnectWithExtension(getExtension().binanceExtension)">Connect with Binance Extension</button>
        <button v-on:click="() => this.connnectWithExtension(getExtension().trustWallet)" :disabled="!isTrustWalletAvailable()">Connect with Trust Wallet</button>
        <br/>
        <button v-on:click="() => this.getHistory()" :disabled="!extension">Get history</button>
        <button v-on:click="() => this.buyIdo()" :disabled="!extension">Buy Ido</button>

        <p>{{this.log.join(', ')}}</p>
    </div>
</template>

<script>
    import WalletExtensionUtils from '../utils/walletExtensionUtils';
    import Vue from 'vue';
    import {extensionName} from '../utils/constants';
    import {isMetamaskAvailable, isBinanceExtensionAvailable, isTrustWalletAvailable} from '../utils/utils';

    export default {
        name: 'Example',
        data: function () {
            return {
                extension: null,
                log: []
            }
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
                this.extension = new WalletExtensionUtils(extension)
                this.extension.accountsChanged(function (log) {
                    console.log('callback account change')
                    console.log(log)
                })

            },
            getHistory: async function () {
                console.log('..Test getHistory..')
                console.log('isConnected: ',this.extension.isConnected())
                let isConnect = 'isConnected: ' + this.extension.isConnected()
                Vue.set(this.log, this.log.length, isConnect)
                const history = await this.extension.getBuyHistoryOfThisAccount()
                console.log('history: ', history)
                Vue.set(this.log, this.log.length, 'history: ' + history.map(e => JSON.stringify(e)).join(', '))

            },
            buyIdo: async function () {
                const start = await this.extension.getStartTime()
                console.log('getStartTime: ', start)
                const end = await this.extension.getEndTime()
                console.log('getEndTime: ', end)
                console.log('..Test getHistory..')
                console.log('isConnected: ',this.extension.isConnected())
                Vue.set(this.log, this.log.length, 'isConnected: ' + this.extension.isConnected())
                const supportTokenAndBalance = await this.extension.getSupportTokenAndBalance()
                console.log('getSupportTokenAndBalance: ',supportTokenAndBalance)
                Vue.set(this.log, this.log.length, 'getSupportTokenAndBalance: ' + supportTokenAndBalance.map(e => JSON.stringify(e)).join(', '))

                const buyResult = await this.extension.buyIdoContractCall(supportTokenAndBalance[0].tokenAddress,1, (msg) => {
                    console.log('buy state: ', msg)
                    Vue.set(this.log, this.log.length, 'state: ' + msg)

                })
                console.log('buyResult: ', buyResult)
            }
        }
    }
</script>

<style scoped>

</style>
