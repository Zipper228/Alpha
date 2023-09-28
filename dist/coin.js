import { TatumLtcSDK } from "@tatumio/ltc";
import { Fiat } from "@tatumio/api-client";
import dotenv from "dotenv";
import { parseFloat } from "./db.js";
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
            return parseFloat(Number(balance.incoming) - Number(balance.outgoing), 8);
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
        valueNew = parseFloat(value, 8);
    }
    const numberToCheck = process.env.NUM_CHECK || 10;
    console.log(numberToCheck);
    try {
        const txByAddress = await ltcSDK.blockchain.getTransactionsByAddress(address, Number(numberToCheck));
        for (let i = 0; i < txByAddress.length; i++) {
            var txInfo = txByAddress[i];
            let txOutputs;
            if (txInfo !== undefined) {
                txOutputs = txByAddress[i].outputs;
                if (txOutputs !== undefined) {
                    for (let j = 0; j < txOutputs.length; j++) {
                        let txOutputsJth = txOutputs[j];
                        let share = Number(process.env.ALLOWED_DIF) || 0.1;
                        if (txOutputsJth.address === address &&
                            moreOrLessThanNum(Number(txOutputsJth.value), valueNew, share)) {
                            response.push({
                                hash: JSON.stringify(txByAddress[i].hash),
                                index: j,
                                value: parseFloat(txOutputsJth.value, 2),
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
    valueToSend = parseFloat(valueToSend, 8);
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
