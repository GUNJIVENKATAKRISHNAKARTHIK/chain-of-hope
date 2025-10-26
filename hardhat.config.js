const fs = require("fs-extra");
const path = require("path");
const { task } = require("hardhat/config");

require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:7545"
    }
  }
};

// ✅ Hook into compile
task("compile", "Compiles the entire project, building all artifacts")
  .setAction(async (args, hre, runSuper) => {
    await runSuper(args); // run default compile

    const src = path.join(__dirname, "artifacts/contracts/ChainOfHope.sol/ChainOfHope.json");
    const dest = path.join(__dirname, "chain-of-hope-frontend/src/ChainOfHope.json");

    if (fs.existsSync(src)) {
      await fs.copy(src, dest);
      console.log("✅ ABI auto-copied to frontend/src/");
    } else {
      console.log("❌ ABI not found!");
    }
  });
