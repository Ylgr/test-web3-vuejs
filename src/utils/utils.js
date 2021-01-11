import window from "global";

export function isMetamaskAvailable() {
    return !!(window.ethereum && window.ethereum.isMetaMask)
}

export function isBinanceExtensionAvailable() {
    return !!window.BinanceChain
}

export function isTrustWalletAvailable() {
    return !!(window.ethereum && window.ethereum.isTrust)
}
