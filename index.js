const ethers = require("ethers");
const fs = require('fs').promises;
require("dotenv").config();

let etherscanProvider = new ethers.providers.EtherscanProvider(
    ethers.providers.getNetwork("homestead"),
    process.env.ETHERSCAN_API_KEY
);

let provider;

if (process.argv.includes("--chainstack")) {
    provider = new ethers.providers.JsonRpcProvider(process.env.CHAINSTACK_NODE_URL);
    console.log("Connected to Chainstack node.");
} else if (process.argv.includes("--local")) {
    provider = new ethers.providers.JsonRpcProvider(process.env.LOCAL_NODE_URL);
    console.log("Connected to local node.");
} else {
    provider = new ethers.providers.AlchemyProvider(
        ethers.providers.getNetwork("homestead"),
        process.env.ALCHEMY_API_KEY
    );
    console.log("Connected to Alchemy.");
}

async function getGasCostsForMultisig(address) {
    console.log(`Calculating gas for multisig address: ${address}`);
    let totalGas = ethers.BigNumber.from('0');
    let history = await etherscanProvider.getHistory(address, process.env.FROM_BLOCK, process.env.TO_BLOCK);
    for(let tx of history) {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        let gas = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        totalGas = totalGas.add(gas);
    }
    return totalGas;
}

async function getGasCosts(delegates) {
    // First, calculate gas for multisig addresses
    for(let j = 0; j < delegates.length; j++) {
        for(let k = 0; k < delegates[j].signers.length; k++) {
            if (delegates[j].signers[k].isMultisig) {
                let gas = await getGasCostsForMultisig(delegates[j].signers[k].address);
                delegates[j].signers[k].gasUsed = gas;
            }
        }
    }

    // Then, process the AAVE_GOVERNANCE_V2 history for non-multisig addresses
    console.log("Processing AAVE_GOVERNANCE_V2 history...");
    let aaveHistory = await etherscanProvider.getHistory(
        process.env.AAVE_GOVERNANCE_V2,
        process.env.FROM_BLOCK,
        process.env.TO_BLOCK
    );

    for(let i = 0; i < aaveHistory.length; ++i) {
        const receipt = await provider.getTransactionReceipt(aaveHistory[i].hash);
        for(let j = 0; j < delegates.length; j++) {
            for(let k = 0; k < delegates[j].signers.length; k++) {
                if(delegates[j].signers[k].address === receipt.from && !delegates[j].signers[k].isMultisig) {
                    let gas = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                    if (delegates[j].signers[k].gasUsed) {
                        delegates[j].signers[k].gasUsed = delegates[j].signers[k].gasUsed.add(gas);
                    } else {
                        delegates[j].signers[k].gasUsed = gas;
                    }
                }
            }
        }
        console.log(`Processed transaction ${i + 1} of ${aaveHistory.length}`);
    }
    return delegates;
}

async function parseDelegates() {
    console.log("Parsing delegates from input file...");
    let data = await fs.readFile('./data/input.json', 'utf-8');
    return JSON.parse(data);
}

async function writeOutput(output) {
    console.log("Writing output to file...");
    for(let i = 0; i < output.length; i++) {
        let sum = ethers.BigNumber.from('0');
        for(let j = 0; j < output[i].signers.length; j++) {
            sum = sum.add(output[i].signers[j].gasUsed);
            output[i].signers[j].gasUsed = ethers.utils.formatEther(output[i].signers[j].gasUsed);
        }
        output[i].gasUsed = ethers.utils.formatEther(sum);
    }

    const file = {
        delegates: output,
        block_range: {
            from: process.env.FROM_BLOCK,
            to: process.env.TO_BLOCK
        }
    };

    await fs.writeFile('./data/output.json', JSON.stringify(file, null, '\t'));
}

async function main() {
    console.log("Checking transactions please wait");
    let delegates = await parseDelegates();
    let output = await getGasCosts(delegates);
    await writeOutput(output);
    console.log("output.json written");   
}

main();
