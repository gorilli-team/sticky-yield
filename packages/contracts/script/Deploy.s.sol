// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptimizerVault.sol";
import "../src/whitelist.sol";

/**
 * @title DeployScript
 * @dev Deployment script for OptimizerVault
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address assetToken = vm.envAddress("ASSET_TOKEN");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy whitelist contract
        Whitelist whitelist = new Whitelist();
        console.log("Whitelist deployed at:", address(whitelist));

        // Create initial whitelist array (empty for now)
        address[] memory initialWhitelist = new address[](0);

        // Deploy optimizer vault
        OptimizerVault vault = new OptimizerVault(assetToken, initialWhitelist);
        console.log("OptimizerVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
