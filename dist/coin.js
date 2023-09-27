import { TatumLtcSDK } from "@tatumio/ltc";
import { Fiat } from "@tatumio/api-client";
import dotenv from "dotenv";
dotenv.config();
const ltcSDK = TatumLtcSDK({
    apiKey: process.env.API_KEY || "",
});
function moreOrLessThanNum(value, valueCompareWith, percent) {
    if (value <= valueCompareWith * (1 + percent) &&
        value >= valueCompareWith * (1 - percent)) {
        return true;
    }
    else {
        return false;
    }
}
export async function checkAccountBalance(addressToCheck) {
    if (addressToCheck !== undefined) {
        try {
            const balance = await ltcSDK.blockchain.getBlockchainAccountBalance(addressToCheck);
            return (Number(balance.incoming) - Number(balance.outgoing)).toFixed(8);
        }
        catch (error) {
            throw "Такого аккаунта не существует.";
        }
    }
}
export async function checkTransactionByUSD(value, litecoin) {
    const address = process.env.MY_ADDRESS || "";
    var response = [];
    var valueNew;
    if (litecoin) {
        valueNew = Number(value.toFixed(8));
    }
    else {
        const LTCrateRUB = await ltcSDK.getExchangeRate(Fiat.RUB);
        value = value / Number(LTCrateRUB.value);
        valueNew = Number(value.toFixed(8));
    }
    console.log(valueNew);
    try {
        const txByAddress = await ltcSDK.blockchain.getTransactionsByAddress(address, 10);
        console.log(txByAddress);
        for (let i = 0; i < txByAddress.length; i++) {
            var txInfo = txByAddress[i];
            let txOutputs;
            if (txInfo !== undefined) {
                txOutputs = txByAddress[i].outputs;
                if (txOutputs !== undefined) {
                    for (let j = 0; j < txOutputs.length; j++) {
                        let txOutputsJth = txOutputs[j];
                        if (txOutputsJth.address === address &&
                            moreOrLessThanNum(Number(txOutputsJth.value), valueNew, 0.15)) {
                            response.push({
                                hash: JSON.stringify(txByAddress[i].hash),
                                index: j,
                                value: Number(Number(txOutputsJth.value).toFixed(8)),
                            });
                        }
                    }
                }
                else {
                    console.log("Trouple with txOutputs");
                    throw "400";
                }
            }
            else {
                console.log("Trouple with txinfo");
                throw "400";
            }
        }
        return response;
    }
    catch (error) {
        console.log("There was an error", error);
        throw "400";
    }
}
export async function make_transaction(valueToSend1, recipientAddress1) {
    const privateKey = process.env.MY_PRIVATE_KEY || "";
    var valueToSend = valueToSend1;
    valueToSend = Number(valueToSend.toFixed(8));
    var recipientAddress = recipientAddress1;
    const fee = process.env.FEE;
    const changeAddress = process.env.MY_ADDRESS || "";
    console.log(valueToSend, recipientAddress);
    const options = { testnet: false };
    try {
        const txData = await ltcSDK.transaction.sendTransaction({
            fromAddress: [
                {
                    address: changeAddress,
                    privateKey: privateKey,
                },
            ],
            to: [
                {
                    address: recipientAddress,
                    value: valueToSend,
                },
            ],
            fee: fee,
            changeAddress: changeAddress,
        }, options);
        console.log(`Транзакция отправлена: ${JSON.stringify(txData)}`);
        return JSON.stringify(txData);
    }
    catch (error) {
        console.log(error);
        throw "Транзакция провалилась";
    }
}
