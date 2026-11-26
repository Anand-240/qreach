// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PaidPost} from "../src/PaidPost.sol";
import {MockQUSDC, MockRouter, MockQIEID} from "../test/mocks/Mocks.sol";

/// Mainnet (chain 1990):
///   forge script script/Deploy.s.sol --rpc-url qie_mainnet --broadcast --account deployer
/// Testnet (chain 1983) deploys mocks because QUSDC/QIEDEX/oracle are mainnet only:
///   forge script script/Deploy.s.sol --rpc-url qie_testnet --broadcast --account deployer
contract Deploy is Script {
    address constant QUSDC = 0x3F43DA82eC9A4f5285F10FaF1F26EcA7319E5DA5;
    address constant ROUTER = 0x08cd2e72e156D8563B4351eb4065C262A9f553Ef;
    address constant QIE_ID = 0x9aab56e7727af53A3131985BFB16d845319b7bdc;

    function run() external returns (PaidPost pp) {
        vm.startBroadcast();
        if (block.chainid == 1990) {
            pp = new PaidPost(QUSDC, ROUTER, QIE_ID);
        } else {
            MockQUSDC usdc = new MockQUSDC();
            MockRouter router = new MockRouter(usdc, 1e9);
            MockQIEID qid = new MockQIEID();
            pp = new PaidPost(address(usdc), address(router), address(qid));
            console2.log("MockQIEID", address(qid));
            console2.log("MockQUSDC", address(usdc));
            console2.log("MockRouter", address(router));
        }
        vm.stopBroadcast();
        console2.log("PaidPost", address(pp));
        console2.log("chain", block.chainid);
        console2.log("block", block.number);
    }
}
