<template>
    <div>
        <button v-if="web3" v-on:click="() => this.getAccount()">Connect with Metamask</button>
        <button>Connect with Binance extension</button>
        <button>Buy DFY</button>
        <h1>{{this.account}}</h1>
    </div>
</template>

<script>
    import Web3 from 'web3';

    const chainId = {
        bscMainnet: 56,
        bscTestnet: 97
    }

    export default {
        name: 'SwapCoin',
        data: function () {
            return {
                web3: null,
                account: null
            }
        },
        created: async function () {
            let web3 = null
            if(window.ethereum) {
                if(window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscMainnet)
                    || window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscTestnet)
                ) {
                    try {
                        web3 = new Web3(window.ethereum)
                        await window.ethereum.enable()
                    } catch (e) {
                        web3 = null
                    }
                }
            }
            this.web3 = web3
        },
        methods: {
            getAccount: async function () {
                const accounts = await this.web3.eth.getAccounts()
                this.account = accounts[0]
            }
        }
    }
</script>

<style scoped>

</style>
