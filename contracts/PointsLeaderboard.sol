// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PointsLeaderboard
/// @notice A simple on-chain points leaderboard for testing and demos on Arc Testnet.
/// @dev This contract stores player profiles, allows owner-controlled point awards,
///      and maintains a top-100 leaderboard sorted by points (highest first).
contract PointsLeaderboard is Ownable {
    /// @notice Player profile data stored per wallet.
    struct Player {
        string username;
        uint256 points;
        bool registered;
    }

    /// @notice Public leaderboard row returned by getLeaderboard().
    struct LeaderboardEntry {
        address wallet;
        string username;
        uint256 points;
    }

    /// @notice Thrown when trying to register a username that is already in use.
    error UsernameTaken();

    /// @notice Thrown when username format is invalid.
    error UsernameInvalid();

    /// @notice Thrown when a wallet tries to register more than once.
    error AlreadyRegistered();

    /// @notice Thrown when an operation expects a registered player but none exists.
    error NotRegistered();

    /// @notice Thrown when a non-owner calls an owner-only function.
    error NotOwner();

    /// @notice Thrown when a player attempts to claim before cooldown has elapsed.
    /// @param availableAt The timestamp when the next claim becomes available.
    error ClaimCooldownActive(uint256 availableAt);

    /// @notice Emitted when a player registers their username.
    /// @param player The wallet that registered.
    /// @param username The registered username.
    event PlayerRegistered(address indexed player, string username);

    /// @notice Emitted when points are awarded to a player.
    /// @param player The wallet that received points.
    /// @param amount The amount of points awarded.
    /// @param newTotal The player's updated total points.
    event PointsAwarded(address indexed player, uint256 amount, uint256 newTotal);

    /// @notice Emitted when a player claims daily faucet points.
    /// @param player The wallet that claimed points.
    /// @param amount The amount of points claimed.
    /// @param newTotal The player's updated total points.
    event PointsClaimed(address indexed player, uint256 amount, uint256 newTotal);

    /// @notice Maximum number of wallets kept in the leaderboard.
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    /// @notice Fixed number of points awarded per faucet claim.
    uint256 public constant CLAIM_AMOUNT = 10;

    /// @notice Required wait time between faucet claims by the same wallet.
    uint256 public constant CLAIM_COOLDOWN = 24 hours;

    /// @notice Maps wallet address to player profile.
    mapping(address => Player) public players;

    /// @notice Tracks the most recent claim timestamp per wallet.
    mapping(address => uint256) public lastClaimTime;

    /// @dev Tracks whether a username is already taken by hashing the exact string.
    mapping(bytes32 => bool) private _usernameTaken;

    /// @dev Stores leaderboard wallet addresses sorted by descending points.
    address[] private _leaderboard;

    /// @notice Deploys the contract and sets the deployer as owner.
    constructor() Ownable(msg.sender) {}

    /// @notice Registers a username for the caller wallet (one-time only).
    /// @dev Username must be 3-20 characters, alphanumeric or underscore.
    /// @param username The desired username.
    function registerUsername(string calldata username) external {
        if (players[msg.sender].registered) revert AlreadyRegistered();
        if (!_isValidUsername(username)) revert UsernameInvalid();

        bytes32 usernameHash = keccak256(bytes(username));
        if (_usernameTaken[usernameHash]) revert UsernameTaken();

        players[msg.sender] = Player({username: username, points: 0, registered: true});
        _usernameTaken[usernameHash] = true;

        // New players start with 0 points. Add to leaderboard if there is room.
        if (_leaderboard.length < MAX_LEADERBOARD_SIZE) {
            _leaderboard.push(msg.sender);
        }

        emit PlayerRegistered(msg.sender, username);
    }

    /// @notice Awards points to one registered player.
    /// @dev Only the contract owner can call this function.
    /// @param player The player wallet receiving points.
    /// @param amount Number of points to add.
    function awardPoints(address player, uint256 amount) external {
        _onlyOwnerCustom();
        _awardPoints(player, amount);
    }

    /// @notice Awards points to many registered players in one transaction.
    /// @dev Only the contract owner can call this function.
    /// @param playerList List of player wallets.
    /// @param amountList List of point amounts; must match playerList length.
    function awardPointsBatch(address[] calldata playerList, uint256[] calldata amountList) external {
        _onlyOwnerCustom();
        if (playerList.length != amountList.length) revert UsernameInvalid();

        for (uint256 i = 0; i < playerList.length; i++) {
            _awardPoints(playerList[i], amountList[i]);
        }
    }

    /// @notice Claims CLAIM_AMOUNT test points for the caller. Callable once every CLAIM_COOLDOWN.
    /// @dev Reverts with NotRegistered if the caller has no account.
    ///      Reverts with ClaimCooldownActive(availableAt) if the cooldown has not elapsed.
    ///      No real monetary value — test points only.
    function claimDailyPoints() external {
        if (!players[msg.sender].registered) revert NotRegistered();

        uint256 availableAt = lastClaimTime[msg.sender] + CLAIM_COOLDOWN;
        if (lastClaimTime[msg.sender] != 0 && block.timestamp < availableAt) {
            revert ClaimCooldownActive(availableAt);
        }

        lastClaimTime[msg.sender] = block.timestamp;
        players[msg.sender].points += CLAIM_AMOUNT;
        _upsertAndResortLeaderboard(msg.sender);

        emit PointsClaimed(msg.sender, CLAIM_AMOUNT, players[msg.sender].points);
    }

    /// @notice Returns the timestamp when the caller can next claim points.
    /// @param player The wallet address to query.
    /// @return nextClaimTime_ 0 if the caller can claim right now, otherwise the future timestamp.
    function nextClaimTime(address player) external view returns (uint256 nextClaimTime_) {
        uint256 last = lastClaimTime[player];
        uint256 availableAt = last + CLAIM_COOLDOWN;

        if (last == 0 || block.timestamp >= availableAt) {
            return 0;
        }

        return availableAt;
    }

    /// @notice Returns the current top leaderboard entries.
    /// @return entries Array of leaderboard rows sorted by descending points.
    function getLeaderboard() external view returns (LeaderboardEntry[] memory entries) {
        uint256 len = _leaderboard.length;
        entries = new LeaderboardEntry[](len);

        for (uint256 i = 0; i < len; i++) {
            address wallet = _leaderboard[i];
            Player storage p = players[wallet];
            entries[i] = LeaderboardEntry({wallet: wallet, username: p.username, points: p.points});
        }
    }

    /// @notice Returns a player's full profile.
    /// @param player The wallet address to query.
    /// @return The Player struct for the wallet.
    function getPlayer(address player) external view returns (Player memory) {
        return players[player];
    }

    /// @notice Checks whether a wallet has already registered.
    /// @param player The wallet address to query.
    /// @return True if the wallet is registered, false otherwise.
    function isRegistered(address player) external view returns (bool) {
        return players[player].registered;
    }

    /// @notice Internal point-award logic used by single and batch award functions.
    /// @param player The player wallet receiving points.
    /// @param amount Number of points to add.
    function _awardPoints(address player, uint256 amount) internal {
        if (!players[player].registered) revert NotRegistered();

        players[player].points += amount;
        _upsertAndResortLeaderboard(player);

        emit PointsAwarded(player, amount, players[player].points);
    }

    /// @notice Ensures caller is the owner using required custom error.
    function _onlyOwnerCustom() internal view {
        if (msg.sender != owner()) revert NotOwner();
    }

    /// @notice Validates username format (3-20 chars; A-Z, a-z, 0-9, underscore).
    /// @param username The username string to validate.
    /// @return True if valid, false otherwise.
    function _isValidUsername(string calldata username) internal pure returns (bool) {
        bytes calldata usernameBytes = bytes(username);
        uint256 len = usernameBytes.length;

        if (len < 3 || len > 20) {
            return false;
        }

        for (uint256 i = 0; i < len; i++) {
            bytes1 char = usernameBytes[i];

            bool isUpper = (char >= 0x41 && char <= 0x5A); // A-Z
            bool isLower = (char >= 0x61 && char <= 0x7A); // a-z
            bool isDigit = (char >= 0x30 && char <= 0x39); // 0-9
            bool isUnderscore = (char == 0x5F); // _

            if (!(isUpper || isLower || isDigit || isUnderscore)) {
                return false;
            }
        }

        return true;
    }

    /// @notice Inserts or repositions a player in the top-100 leaderboard.
    /// @dev Leaderboard remains sorted by descending points after each update.
    /// @param player The wallet to place/reposition.
    function _upsertAndResortLeaderboard(address player) internal {
        uint256 len = _leaderboard.length;
        uint256 playerPoints = players[player].points;

        // 1) If player is already in leaderboard, bubble up while points are greater.
        for (uint256 i = 0; i < len; i++) {
            if (_leaderboard[i] == player) {
                while (i > 0 && playerPoints > players[_leaderboard[i - 1]].points) {
                    _leaderboard[i] = _leaderboard[i - 1];
                    _leaderboard[i - 1] = player;
                    i--;
                }
                return;
            }
        }

        // 2) If not in leaderboard and there is room, append then bubble up.
        if (len < MAX_LEADERBOARD_SIZE) {
            _leaderboard.push(player);
            uint256 j = _leaderboard.length - 1;

            while (j > 0 && playerPoints > players[_leaderboard[j - 1]].points) {
                _leaderboard[j] = _leaderboard[j - 1];
                _leaderboard[j - 1] = player;
                j--;
            }
            return;
        }

        // 3) Leaderboard full and player not present:
        //    include player only if they beat current last place.
        address lastWallet = _leaderboard[len - 1];
        uint256 lastPoints = players[lastWallet].points;

        if (playerPoints <= lastPoints) {
            return;
        }

        _leaderboard[len - 1] = player;
        uint256 k = len - 1;

        while (k > 0 && playerPoints > players[_leaderboard[k - 1]].points) {
            _leaderboard[k] = _leaderboard[k - 1];
            _leaderboard[k - 1] = player;
            k--;
        }
    }
}
