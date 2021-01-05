<template>
    <div>
        <button v-on:click="() => this.testMetamask()">Test Metamask</button>
        <br/>
        <button v-on:click="() => this.getAccount()" :disabled="!web3">Connect with Metamask</button>
        <button :disabled="!binanceExtension">Connect with Binance extension</button>
        <br/>
        <div v-if="account && ownerAddress === account">
            <label>
                <input type="text" placeholder="address token" v-model="addPairTokenAddress"/>
                <input type="number" placeholder="Output DFY" v-model="addPairOutputDFY"/>
                <input type="number" placeholder="Input token" v-model="addPairInputToken"/>
            </label>
            <button v-on:click="() => this.addPair()">Add pair</button>
        </div>
        <h1>Your address: {{account}}</h1>
        <h1>Owner address: {{ownerAddress}}</h1>
        <input type="number" placeholder="Amount token using to buy DFY" v-model="amountUsing"/>
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
                <th>
                    <button v-on:click="() => buyIdoDFY(item.tokenAddress)">Buy with this!</button>
                </th>
            </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
    import MetamaskUtils from '../utils/metamaskUtils';
    import erc20Abi from '../contracts/erc20.abi';
    import idoDFYAbi from '../contracts/idoDFY.abi';
    import Vue from 'vue';
    import Web3 from 'web3';

    const chainId = {
        "bscMainnet": 56,
        "bscTestnet": 97
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
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function",
            "constant": true
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
                amountUsing: null,
                metamaskUtils: null
            }
        },
        created: async function () {
            this.metamaskUtils = new MetamaskUtils();
            let web3 = null
            if (window.ethereum) {
                if (window.ethereum.chainId === Web3.utils.numberToHex(chainId.bscMainnet)
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
                this.buyIdoContract = new this.web3.eth.Contract(idoDFYAbi, '0xE56de856b4212A8bf463af32dAD1B2303863aC7D', {
                    transactionConfirmationBlocks: 1
                })
                this.dfyContract = new this.web3.eth.Contract(erc20Abi, '0xb6bd9bba44c8369d47f07ccc9032e65e811a112d', {
                    transactionConfirmationBlocks: 1
                })

                this.getSupportTokens()

                this.ownerAddress = await this.buyIdoContract.methods.getOwner().call()
            },
            buyIdoDFY: async function (tokenAddress) {
                const amount = this.amountUsing
                try {
                    const tokenContract = new this.web3.eth.Contract(erc20TokenAbi, tokenAddress)
                    const approveResult = await tokenContract.methods.approve('0xE56de856b4212A8bf463af32dAD1B2303863aC7D', amount).send({from: this.account});
                    // const approveResult = await tokenContract.methods.approve('0xE56de856b4212A8bf463af32dAD1B2303863aC7D', amount).call();
                    console.log('approveResult: ', approveResult)
                    const result = await this.buyIdoContract.methods.buyIdo(tokenAddress, amount).send({from: this.account})
                    console.log('buy ido result: ', result)
                } catch (e) {
                    console.error(e.message)
                }
            },
            testMetamask: async function () {
                console.log('..Test metamask..')
                console.log('isConnected: ',this.metamaskUtils.isConnected())
                const supportTokenAndBalance = await this.metamaskUtils.getSupportTokenAndBalance()
                console.log('getSupportTokenAndBalance: ',supportTokenAndBalance)
                const buyResult = await this.metamaskUtils.buyIdoContractCall(supportTokenAndBalance[0].tokenAddress,1, (msg) => {
                    console.log('buy state: ', msg)
                })
                console.log('buyResult: ', buyResult)
            },
            addPair: async function () {
                try {
                    if (!this.addPairInputToken) {
                        this.addPairInputToken = 1;
                    }
                    const updateResult = await this.buyIdoContract.methods.upsertExchangePair(this.addPairTokenAddress, this.addPairOutputDFY, this.addPairInputToken).send({from: this.account});
                    console.log('updateResult: ', updateResult)
                } catch (e) {
                    console.error(e.message)
                }
            },
            getSupportTokens: async function () {
                const buyIdoContract = this.buyIdoContract
                const tokenAddresses = await buyIdoContract.methods.getTokenSupport().call()
                for(const tokenAddress of tokenAddresses) {
                    const exchangeValue = await buyIdoContract.methods.exchangeValues(tokenAddress).call()
                    const tokenContract = new this.web3.eth.Contract(erc20TokenAbi, tokenAddress)
                    const userBalance = await tokenContract.methods.balanceOf(this.account).call()
                    Vue.set(this.balanceExchangeValue, this.balanceExchangeValue.length, {
                        tokenAddress: tokenAddress,
                        outputDFYNumber: exchangeValue.outputDFYNumber,
                        inputTokenNumber: exchangeValue.inputTokenNumber,
                        balance: userBalance
                    })
                }
            }
        }
    }
</script>

<style scoped>

</style>
