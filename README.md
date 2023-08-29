# aave-gov-gas

Script to get the gas used from block a to b on the governance contract of Aave according to an input file with information of the delegators.

## How to use

1. Run `npm i`
2. Copy `.env.example` and name it `.env`
3. Set your environment variables
4. Choose your preferred provider:
   - For Alchemy (default if no flag is provided): `node index.js --alchemy`
   - For Chainstack: `node index.js --chainstack`
   - For a Local Node: `node index.js --local`

It works without an Etherscan API key but it will be very slow.

## How to add yourself as a delegator

Just edit the `input.json` file and add your name and all your signer addresses! (If you are an EOA you can just add your address there)

## Providers

By default, the script uses Alchemy as the provider. However, you can switch between Alchemy, Chainstack, or a Local Node by using the appropriate flags (`--alchemy`, `--chainstack`, or `--local`) when running the script. Ensure you have set the appropriate environment variables for your chosen provider in the `.env` file.
