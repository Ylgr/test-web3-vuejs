<template>
    <div>
        <button v-on:click="() => this.getAccount()" :disabled="!web3">Connect with Metamask</button>
        <button :disabled="!binanceExtension">Connect with Binance extension</button>
        <br/>
        <div v-if="account && ownerAddress === account">
            <label>
                <input type="text"  placeholder="address token" v-model="addPairTokenAddress"/>
                <input type="number"  placeholder="Output DFY" v-model="addPairOutputDFY"/>
                <input type="number"  placeholder="Input token" v-model="addPairInputToken"/>
            </label>
            <button v-on:click="() => this.addPair()">Add pair</button>
        </div>
        <h1>Your address: {{account}}</h1>
        <h1>Owner address: {{ownerAddress}}</h1>
        <input type="number"  placeholder="Amount token using to buy DFY" v-model="amountUsing"/>
        <table>
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Token address</th>
                    <th scope="col">DFY for each token</th>
                    <th scope="col">Balance (wei)</th>
                </tr>
            </thead>
            <tbody>
                <tr :key="index" v-for="(item, index) in balanceExchangeValue">
                    <th>{{index}}</th>
                    <th>{{item.tokenAddress}}</th>
                    <th>{{item.outputDFYNumber / item.inputTokenNumber}}</th>
                    <th>{{item.balance}}</th>
                    <th><button v-on:click="() => buyIdoDFY(item.tokenAddress)">Buy with this!</button></th>
                </tr>
            </tbody>
        </table>
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

    const erc20TokenAbi = [{
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }]
    export default {
        name: 'SwapCoin',
        data: function () {
            return {
                web3: null,
                binanceExtension: null,
                account: null,
                balanceExchangeValue: [],
                buyIdoContract: null,
                ownerAddress: null,
                dfyContract: null,
                addPairTokenAddress: null,
                addPairOutputDFY: null,
                addPairInputToken: null,
                amountUsing: null
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

                this.ownerAddress = await this.buyIdoContract.methods.getOwner().call()
            },
            buyIdoDFY: async function (tokenAddress) {
                console.log('buying ido')
                const amount = this.amountUsing
                try {
                    const tokenContract = new this.web3.eth.Contract(erc20TokenAbi, tokenAddress)
                    const approveResult = await tokenContract.methods.approve('0xE56de856b4212A8bf463af32dAD1B2303863aC7D', amount).send({ from: this.account });
                    console.log('approveResult: ', approveResult)
                    const result = await this.buyIdoContract.methods.buyIdo(tokenAddress, amount).send({ from: this.account })
                    console.log('buy ido result: ', result)
                } catch (e) {
                    console.error(e.message)
                }
            },
            addPair: async function () {
                try {
                    if(!this.addPairInputToken) {
                        this.addPairInputToken = 1;
                    }
                    const updateResult = await this.buyIdoContract.methods.upsertExchangePair(this.addPairTokenAddress, this.addPairOutputDFY, this.addPairInputToken).send({from: this.account});
                    console.log('updateResult: ', updateResult)
                } catch (e) {
                    console.error(e.message)
                }
            },
            getSupportTokens: function () {
                const buyIdoContract = this.buyIdoContract
                const self = this
                buyIdoContract.methods.getTokenSupport().call(function(err, res){
                    res.forEach((tokenAddress) => {
                        buyIdoContract.methods.exchangeValues(tokenAddress).call(function(err, res){
                            Vue.set(self.balanceExchangeValue, self.balanceExchangeValue.length, {
                                tokenAddress: tokenAddress,
                                outputDFYNumber: res.outputDFYNumber,
                                inputTokenNumber: res.inputTokenNumber,
                                balance: 0
                            })
                        })
                    })
                })
            }
        }
    }
</script>

<style scoped>

</style>
