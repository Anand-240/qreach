// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Qreach, IQIEDEXRouter, IQIEID} from "../src/Qreach.sol";

interface IAggregator {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function decimals() external view returns (uint8);
}

/// @notice Runs against a fork of QIE mainnet. Skipped unless FORK=1.
///         FORK=1 forge test --match-contract Fork --fork-url https://rpc1mainnet.qie.digital -vv
contract QreachForkTest is Test {
    address constant QUSDC = 0x3F43DA82eC9A4f5285F10FaF1F26EcA7319E5DA5;
    address constant ROUTER = 0x08cd2e72e156D8563B4351eb4065C262A9f553Ef;
    address constant QIE_ID = 0x9aab56e7727af53A3131985BFB16d845319b7bdc;
    address constant QIE_USD = 0x3Bc617cF3A4Bb77003e4c556B87b13D556903D17;

    function setUp() public {
        if (!vm.envOr("FORK", false)) vm.skip(true);
    }

    function test_fork_qusdcLooksRight() public view {
        assertEq(IERC20Metadata(QUSDC).decimals(), 6);
        assertEq(IERC20Metadata(QUSDC).symbol(), "QUSDC");
    }

    function test_fork_oracleIsFresh() public view {
        (, int256 answer,, uint256 updatedAt,) = IAggregator(QIE_USD).latestRoundData();
        assertGt(answer, 0);
        assertLt(block.timestamp - updatedAt, 1 days);
    }

    /// qie.qie exists on mainnet; its owner can claim it, anyone else cannot.
    function test_fork_setQieName() public {
        Qreach pp = new Qreach(QUSDC, ROUTER, QIE_ID);
        address owner_ = IQIEID(QIE_ID).domainOwnerByName("qie", "qie");
        vm.prank(owner_);
        pp.setQieName("qie");
        assertEq(pp.qieLabelOf(owner_), "qie");
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(Qreach.NotNameOwner.selector);
        pp.setQieName("qie");
        vm.expectRevert(Qreach.NotNameOwner.selector);
        pp.setQieName("this-name-should-not-exist-9f3a");
    }

    function test_fork_payWithQIE() public {
        Qreach pp = new Qreach(QUSDC, ROUTER, QIE_ID);
        address sponsor = makeAddr("sponsor");
        address creator = makeAddr("creator");
        vm.deal(sponsor, 1_000 ether);
        vm.prank(sponsor);
        uint256 id = pp.createCampaignWithQIE{value: 1_000 ether}(
            creator,
            1_000_000,
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 3 days),
            1 hours,
            "fork test",
            block.timestamp + 300
        );
        assertEq(IERC20Metadata(QUSDC).balanceOf(address(pp)), 1_000_000);
        assertEq(pp.getCampaign(id).amount, 1_000_000);
        assertEq(address(pp).balance, 0);
        assertGt(sponsor.balance, 0);
        // silence unused import warning
        IQIEDEXRouter(ROUTER).WETH();
    }
}
