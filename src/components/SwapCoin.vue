<template>
    <div>
        <button v-if="web3" v-on:click="() => this.getAccount()">Connect with Metamask</button>
        <button disabled>Connect with Binance extension</button>
        <button v-if="buyIdoContract" v-on:click="() => this.buyIdoDFY()">Buy DFY</button>
        <button v-if="dfyContract" v-on:click="() => this.testContract()">Test contract</button>
        <h1>{{account}}</h1>
        <h1>{{ownerAddress}}</h1>
        <h1>{{supportTokenExchangeList}}</h1>
        <ul v-if="supportTokenExchangeList.length">
            <li :key="index" v-for="(item, index) in supportTokenExchangeList">
                {{index}} - {{item.tokenAddress}} - {{item.outputDFYNumber}} - {{item.inputTokenNumber}}
            </li>
        </ul>
    </div>
</template>

<script>
    import Web3 from 'web3';
    import IdoDFY from '../contracts/IdoDFY';
    import DFY from '../contracts/DFY';
    import Vue from 'vue'

    const chainId = {
        bscMainnet: 56,
        bscTestnet: 97
    }

    export default {
        name: 'SwapCoin',
        data: function () {
            return {
                web3: null,
                account: null,
                balanceExchangeValue: [],
                buyIdoContract: null,
                ownerAddress: null,
                dfyContract: null,
            }
        },
        created: async function () {
            let web3 = null
            if(window.ethereum) {
                if(window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscMainnet)
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
        },
        computed: {
            supportTokenExchangeList: function() {
                return this.balanceExchangeValue;
            }
        },
        methods: {
            getAccount: async function () {
                const accounts = await this.web3.eth.getAccounts()
                this.account = accounts[0]

                // call contract to get exchange data
                this.buyIdoContract = new this.web3.eth.Contract(IdoDFY.abi, '0xE56de856b4212A8bf463af32dAD1B2303863aC7D', {
                    transactionConfirmationBlocks: 1
                })
                this.dfyContract = new this.web3.eth.Contract(DFY.abi, DFY.networks["97"].address, {
                    transactionConfirmationBlocks: 1
                })

                this.getSupportTokens()
            },
            buyIdoDFY: function () {
                this.buyIdoContract.methods.getOwner().call(function(err, res){
                    //do something with res here
                    console.log(res); //for example
                })
            },
            testContract: function () {
                this.buyIdoContract.methods.getOwner().call(function(err, res){
                    this.ownerAddress = res
                    console.log(res); //for example
                })
            },
            getSupportTokens: function () {
                const buyIdoContract = this.buyIdoContract
                buyIdoContract.methods.getTokenSupport().call(function(err, res){
                    let balanceExchangeValue = []
                    res.forEach((tokenAddress) => {
                        buyIdoContract.methods.exchangeValues(tokenAddress).call(function(err, res){
                            balanceExchangeValue.push({
                                tokenAddress: tokenAddress,
                                outputDFYNumber: res.outputDFYNumber,
                                inputTokenNumber: res.inputTokenNumber
                            })
                        })
                    })
                    Vue.set(this, 'balanceExchangeValue', balanceExchangeValue);
                })
            }
        }
    }
</script>

<style scoped>

</style>
