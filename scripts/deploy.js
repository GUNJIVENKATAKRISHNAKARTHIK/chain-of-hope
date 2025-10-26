const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const ChainOfHope = await ethers.getContractFactory("ChainOfHope");
  const chainOfHope = await ChainOfHope.deploy();
  await chainOfHope.waitForDeployment();

  const address = await chainOfHope.getAddress();
  console.log("✅ ChainOfHope deployed to:", address);

  // ✅ Save contract address to frontend/src/contract-address.json
  const frontendDir = path.join(__dirname, "../chain-of-hope-frontend/src");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const data = { contractAddress: address };
  fs.writeFileSync(
    path.join(frontendDir, "contract-address.json"),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
  console.log("📁 Contract address written to frontend/src/contract-address.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
