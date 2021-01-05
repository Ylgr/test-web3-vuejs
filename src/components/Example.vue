<template>
    <div>
        <button v-on:click="() => this.connnectWithExtension(getExtension().metamask)">Connect with Metamask</button>
        <button v-on:click="() => this.connnectWithExtension(getExtension().binanceExtension)">Connect with Binance Extension</button>
        <br/>
        <button v-on:click="() => this.getHistory()" :disabled="!extension">Get history</button>
        <button v-on:click="() => this.buyIdo()" :disabled="!extension">Buy Ido</button>

    </div>
</template>

<script>
    import WalletExtensionUtils from '../utils/walletExtensionUtils';
    import {extensionName} from '../utils/constants';

    export default {
        name: 'Example',
        data: function () {
            return {
                extension: null
            }
        },
        methods: {
            getExtension() {
                return extensionName
            },
            connnectWithExtension(extension) {
                this.extension = new WalletExtensionUtils(extension)
            },
            getHistory: async function () {
                console.log('..Test getHistory..')
                console.log('isConnected: ',this.extension.isConnected())
                const history = await this.extension.getBuyHistoryOfThisAccount()
                console.log('history: ', history)
            },
            buyIdo: async function () {
                console.log('..Test getHistory..')
                console.log('isConnected: ',this.extension.isConnected())

                const supportTokenAndBalance = await this.extension.getSupportTokenAndBalance()
                console.log('getSupportTokenAndBalance: ',supportTokenAndBalance)
                const buyResult = await this.extension.buyIdoContractCall(supportTokenAndBalance[0].tokenAddress,1, (msg) => {
                    console.log('buy state: ', msg)
                })
                console.log('buyResult: ', buyResult)
            }
        }
    }
</script>

<style scoped>

</style>
