const ethers = require("ethers");
const fs = require('fs').promises;
require("dotenv").config();

let etherscanProvider = new ethers.providers.EtherscanProvider(
    ethers.providers.getNetwork("homestead"),
    process.env.ETHERSCAN_API_KEY
);

let alchemyProvider = new ethers.providers.AlchemyProvider(
    ethers.providers.getNetwork("homestead"),
    process.env.ALCHEMY_RPC
);

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

        receipt = (await alchemyProvider.getTransactionReceipt(history[i].hash));

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
    }
    return delegates;

}

async function parseDelegates() {
    let data = await fs.readFile('input.json', 'utf-8');
    let obj = JSON.parse(data);

    obj.map(x => 
        x.signers = x.signers.map( e =>
            e = {
                address: e,
                gasUsed: 0 
            }
        )
    );

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

    await fs.writeFile('output.json', JSON.stringify(output, null, '\t'));
}

async function main() {
    console.log("Checking transactions please wait");

    let delegates = await parseDelegates();
    
    let output = await getGasCosts(delegates);
    
    await writeOutput(output);

    console.log("output.json written");   
}

main();