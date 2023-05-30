# aave-gov-gas

Script to get the gas used form block a to b on the governance contract of Aave according to an input file with information of the delegators.


## How to use

1. Run `npm i`
2. Copy `.env.example` and name it `.env`
3. Set your env variables
4. Run `node index.js`

It works without an Etherscan API key but it will be very very slow

## How to add yourself as a delegator

Just edit the input.json file and add your name and all your signer addresses! (If you are an EOA you can just add your address there)

