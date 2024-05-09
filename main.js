import "./style.css";
import javascriptLogo from "./javascript.svg";
import viteLogo from "/vite.svg";
// import { Buffer } from "buffer";
import * as secp from "@noble/secp256k1";
import Btc from "@ledgerhq/hw-app-btc";
import {ethers} from "ethers"
import _ from "lodash";
import varuint from "varuint-bitcoin";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import bitcoinMessage from "bitcoinjs-message";
import { bech32 } from "@scure/base";
import { parse, stringify } from 'yaml'
const {Contract} = ethers;  
const PROPOSERS = import.meta.env.VITE_PROPOSERS.split(",");
// https://github.com/bitcoin/bitcoin/blob/a85e5a7c9ab75209bc88e49be6991ba0a467034e/src/util/message.cpp#L24
const MESSAGE_MAGIC = Buffer.from("Bitcoin Signed Message:\n");

async function loadAddress(e) {
  e.preventDefault();
  try {
    const transport = await TransportWebHID.create();
    const btc = new Btc({ transport });
    const { bitcoinAddress } = await btc.getWalletPublicKey("84'/0'/0'/0/0", {
      format: "bech32",
    });
    transport.close();
    document.getElementById("bitcoin-1-address").value = bitcoinAddress;
    const utxos = loadUtxos();
  } catch (e) {
    if (e.message) {
      alert(e.message);
    }
  }
  setMessage()
}
async function loadBitcoin2Address(e) {
  e.preventDefault();
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  document.getElementById("bitcoin-2-address").value = await signer.getAddress()
  setMessage()
}

async function loadUtxos() {
  const address = document.querySelector("#bitcoin-1-address").value;
  const utxos = await (
    await fetch(`https://mempool.space/api/address/${address}/utxo`)
  ).json();
  showTotalValue(utxos);
}

async function setMessage() {
  const btc1Address = document.querySelector("#bitcoin-1-address").value;
  const btc2Address = document.querySelector("#bitcoin-2-address").value;
  if (btc1Address && btc2Address) {
    const utxos = await (
      await fetch(`https://mempool.space/api/address/${btc1Address}/utxo`)
    ).json();
    document.getElementById("message").value = messageToSign(utxos, btc2Address);
  }
}

async function signMessage(e) {
  e.preventDefault();
  const bitcoinAddress = document.querySelector("#bitcoin-1-address").value;
  try {
    const transport = await TransportWebHID.create();
    const message = document.getElementById("message").value;
    const btc = new Btc({ transport });
    const result = await btc.signMessage(
      "84'/0'/0'/0/0",
      Buffer.from(message).toString("hex"),
    );
    transport.close();
    var v = result["v"] + 27 + 4;
    var signature = Buffer.from(
      v.toString(16) + result["r"] + result["s"],
      "hex",
    ).toString("base64");

    document.getElementById("signature").value = signature;
  } catch (e) {
    if (e.message) {
      alert(e.message);
    }
  }
}
function messageToSign(utxos, btc2Address) {
  return [
    "Action: Upgrade",
    "Destination Chain ID: 203",
    `Destination Address: ${btc2Address}`,
    "Inputs:",
    ...utxos.map(({ txid, vout }) => `  -\n    Hash: ${txid}\n    Index: ${vout}`),
  ].join("\n");
}

function showTotalValue(utxos) {
  const value = totalValue(utxos);
  document.querySelector("#total-value").innerText =
    `You have ${value / 100000000} BTC to migrate to Bitcoin 2.0`;
  document.querySelector("#total-value").classList.remove("d-none");
}

async function migrate(e) {
  e.preventDefault();
  


const { chainId } = await provider.getNetwork()
if (chainId != 178n) {
await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [{
      chainId: "0xB2",
      rpcUrls: PROPOSERS,
      chainName: "Bitcoin 2",
      nativeCurrency: {
          name: "BTC2",
          symbol: "BTC2",
          decimals: 18,
      },
  }]
});
}
  let abi = [
    "function upgradeByMessage(string calldata message, bytes calldata signature)"
  ]

  let contract = new Contract("0x0000000000000000000000000000000000000000", abi, await provider.getSigner())
  let tx = await contract.upgradeByMessage(
    document.getElementById("message").value,
    Buffer.from(document.getElementById("signature").value, "base64")
  )
  await tx.wait()
}

const totalValue = (utxos) => _.sumBy(utxos, "value");
let provider;
if (window.ethereum == null) {
    console.log("MetaMask not installed; using read-only defaults")
    provider = ethers.getDefaultProvider()
} else {
    provider = new ethers.BrowserProvider(window.ethereum,  "any");
}
provider // Or window.ethereum if you don't support EIP-6963.
  .listAccounts()
  .then((accounts) => handleAccountsChanged(accounts.map((account) => account.address)))
  .catch((err) => {
    // Some unexpected error.
    // For backwards compatibility reasons, if no accounts are available, eth_accounts returns an
    // empty array.
    console.error(err);
  });

// Note that this event is emitted on page load. If the array of accounts is non-empty, you're
// already connected.
// Or window.ethereum if you don't support EIP-6963.
window.ethereum.on("accountsChanged", handleAccountsChanged);

// eth_accounts always returns an array.
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // MetaMask is locked or the user has not connected any accounts.
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } else if (accounts[0] !==  document.getElementById("bitcoin-2-address").value) {
    // Reload your interface with accounts[0].
    document.getElementById("bitcoin-2-address").value = accounts[0];
    setMessage()
    // Update the account displayed (see the HTML for the connect button)
  }
}

const connectWithProvider = async (wallet) => {
  try {
    await wallet.provider.request({ method: "eth_requestAccounts" });
  } catch (error) {
    console.error("Failed to connect to provider:", error);
  }
};

  window.addEventListener("eip6963:announceProvider", (event) => {
    const button = document.createElement("button");
    button.classList.add('btn')
    button.classList.add('btn-primary')

    button.innerHTML = `
      <img src="${event.detail.info.icon}" alt="${event.detail.info.name}" />
      Connect with ${event.detail.info.name}
    `;

    // Call connectWithProvider when a user selects the button.
    button.onclick = (e) => {
      e.preventDefault();
      connectWithProvider(event.detail)
    };
    document.querySelector("#providerButtons").appendChild(button);
  });

  // Notify event listeners and other parts of the dapp that a provider is requested.
document
  .querySelector("#load-bitcoin-address")
  .addEventListener("click", loadAddress);

document
  .querySelector("#sign-with-ledger")
  .addEventListener("click", signMessage);
document
  .querySelector("#bitcoin-1-address")
  .addEventListener("change", loadUtxos);
document.getElementById("migrate").addEventListener("click", migrate);
