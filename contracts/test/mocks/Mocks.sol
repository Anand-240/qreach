// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice 6-decimal QUSDC stand-in for tests. Never deploy to mainnet.
contract MockQUSDC is ERC20 {
    constructor() ERC20("Mock QUSDC", "mQUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice UniswapV2-style router stand-in. 1 QUSDC unit costs `weiPerUnit` wei of native QIE.
contract MockRouter {
    address public immutable WETH = address(0xBEEF);
    MockQUSDC public immutable token;
    uint256 public immutable weiPerUnit;
    bool public shortChange; // if true, delivers 1 unit less than asked

    constructor(MockQUSDC token_, uint256 weiPerUnit_) {
        token = token_;
        weiPerUnit = weiPerUnit_;
    }

    function setShortChange(bool v) external {
        shortChange = v;
    }

    function swapETHForExactTokens(uint256 amountOut, address[] calldata path, address to, uint256 deadline)
        external
        payable
        returns (uint256[] memory amounts)
    {
        require(block.timestamp <= deadline, "EXPIRED");
        require(path.length == 2 && path[0] == WETH && path[1] == address(token), "PATH");
        uint256 cost = amountOut * weiPerUnit;
        require(msg.value >= cost, "EXCESSIVE_INPUT_AMOUNT");
        token.mint(to, shortChange ? amountOut - 1 : amountOut);
        if (msg.value > cost) {
            (bool ok,) = msg.sender.call{value: msg.value - cost}("");
            require(ok, "REFUND");
        }
        amounts = new uint256[](2);
        amounts[0] = cost;
        amounts[1] = amountOut;
    }
}

/// @notice QIE ID stand-in: same tokenId scheme and revert-on-unknown behaviour as the real Zone contract.
contract MockQIEID {
    mapping(uint256 => address) public owners;

    function register(string calldata label, address owner) external {
        owners[uint256(keccak256(abi.encodePacked("qie", label)))] = owner;
    }

    function domainOwnerByName(string calldata label, string calldata parent) external view returns (address o) {
        o = owners[uint256(keccak256(abi.encodePacked(parent, label)))];
        require(o != address(0), "ERC721: owner query for nonexistent token");
    }
}
