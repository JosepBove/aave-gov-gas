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
    // Default to Alchemy if no flag or --alchemy flag is provided
    provider = new ethers.providers.AlchemyProvider(
        ethers.providers.getNetwork("homestead"),
        process.env.ALCHEMY_API_KEY
    );
    console.log("Connected to Alchemy.");
}


async function getGasCosts(delegates) {

    let history = await etherscanProvider.getHistory(
        process.env.AAVE_GOVERNANCE_V2,
        process.env.FROM_BLOCK,
        process.env.TO_BLOCK
    );

    let receipt;
    let delegateIndex;
    let signerIndex; 

    for(let i = 0; i < history.length; ++i) {
       
        delegateIndex = -1;
        signerIndex = -1;

        receipt = (await provider.getTransactionReceipt(history[i].hash));

        for(let j = 0; j < delegates.length; j++) {
            for(let k = 0; k < delegates[j].signers.length; k++) {
                if(delegates[j].signers[k].address === receipt.from) {
                    delegateIndex = j;
                    signerIndex = k;
                }
            }
        }

        if(delegateIndex != -1) {
            let gas = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            
            if(delegates[delegateIndex].signers[signerIndex].gasUsed) {
                delegates[delegateIndex].signers[signerIndex].gasUsed = delegates[delegateIndex].signers[signerIndex].gasUsed.add(gas);
            } else {
                delegates[delegateIndex].signers[signerIndex].gasUsed = gas;
            }
        }
        console.log(`Processed transaction ${i + 1} of ${history.length}`);
    }
    return delegates;

}

async function parseDelegates() {
    let data = await fs.readFile('./data/input.json', 'utf-8');
    let obj = JSON.parse(data);

    obj.map((x, index) => {
        x.signers = x.signers.map(e => {
            // Check if the address has a correct checksum
            const checksummedAddress = ethers.utils.getAddress(e);
            if (checksummedAddress !== e) {
                throw new Error(`Address ${e} does not have a correct checksum. Expected ${checksummedAddress}`);
            }

            return {
                address: e,
                gasUsed: 0 
            };
        });
        console.log(`Parsed delegate ${index + 1} of ${obj.length}`);
    });

    return obj;
}



async function writeOutput(output) {
    
    for(let i = 0; i < output.length; i++) {

        let sum = ethers.BigNumber.from('0');
        
        for(let j = 0; j < output[i].signers.length; j++) {
            sum =  sum.add(output[i].signers[j].gasUsed);
            output[i].signers[j].gasUsed ?  output[i].signers[j].gasUsed = ethers.utils.formatEther(output[i].signers[j].gasUsed): 0; 
        }
        output[i].gasUsed = ethers.utils.formatEther(sum);
    }

    let file = {delegates: {}, block_range: {}};

    file.delegates = output;

    file.block_range = {
        from: process.env.FROM_BLOCK,
        to: process.env.TO_BLOCK
    }

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