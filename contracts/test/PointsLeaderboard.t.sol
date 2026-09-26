// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PointsLeaderboard} from "../PointsLeaderboard.sol";

contract PointsLeaderboardTest is Test {
    PointsLeaderboard internal lb;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob   = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal dave  = makeAddr("dave");

    // ─── events (mirror from contract so vm.expectEmit can reference them) ───
    event PlayerRegistered(address indexed player, string username);
    event PointsAwarded(address indexed player, uint256 amount, uint256 newTotal);
    event PointsClaimed(address indexed player, uint256 amount, uint256 newTotal);

    function setUp() public {
        vm.prank(owner);
        lb = new PointsLeaderboard();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 1. DEPLOYMENT / INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    function test_OwnerSetCorrectly() public view {
        assertEq(lb.owner(), owner);
    }

    function test_MaxLeaderboardSizeIsHundred() public view {
        assertEq(lb.MAX_LEADERBOARD_SIZE(), 100);
    }

    function test_EmptyLeaderboardOnDeploy() public view {
        PointsLeaderboard.LeaderboardEntry[] memory entries = lb.getLeaderboard();
        assertEq(entries.length, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. HAPPY PATH — registerUsername
    // ═══════════════════════════════════════════════════════════════════

    function test_RegisterUsername_SetsPlayerData() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        PointsLeaderboard.Player memory p = lb.getPlayer(alice);
        assertEq(p.username, "alice123");
        assertEq(p.points, 0);
        assertTrue(p.registered);
    }

    function test_IsRegistered_TrueAfterRegister() public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        assertTrue(lb.isRegistered(alice));
    }

    function test_IsRegistered_FalseForUnregistered() public view {
        assertFalse(lb.isRegistered(alice));
    }

    function test_RegisterUsername_AddsToLeaderboard() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        PointsLeaderboard.LeaderboardEntry[] memory entries = lb.getLeaderboard();
        assertEq(entries.length, 1);
        assertEq(entries[0].wallet, alice);
        assertEq(entries[0].username, "alice123");
        assertEq(entries[0].points, 0);
    }

    // boundary lengths: exactly 3 and exactly 20
    function test_RegisterUsername_MinLength() public {
        vm.prank(alice);
        lb.registerUsername("abc"); // 3 chars — minimum valid
        assertTrue(lb.isRegistered(alice));
    }

    function test_RegisterUsername_MaxLength() public {
        vm.prank(alice);
        lb.registerUsername("abcdefghij1234567890"); // 20 chars — maximum valid
        assertTrue(lb.isRegistered(alice));
    }

    function test_RegisterUsername_Underscore() public {
        vm.prank(alice);
        lb.registerUsername("alice_bob"); // underscore allowed
        assertTrue(lb.isRegistered(alice));
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. REVERT PATHS — registerUsername
    // ═══════════════════════════════════════════════════════════════════

    function test_RevertAlreadyRegistered() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.AlreadyRegistered.selector);
        lb.registerUsername("alice456");
    }

    function test_RevertUsernameTaken_SameString() public {
        vm.prank(alice);
        lb.registerUsername("coolname");

        vm.prank(bob);
        vm.expectRevert(PointsLeaderboard.UsernameTaken.selector);
        lb.registerUsername("coolname");
    }

    function test_RevertUsernameInvalid_TooShort() public {
        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.UsernameInvalid.selector);
        lb.registerUsername("ab"); // 2 chars < 3
    }

    function test_RevertUsernameInvalid_TooLong() public {
        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.UsernameInvalid.selector);
        lb.registerUsername("abcdefghij12345678901"); // 21 chars > 20
    }

    function test_RevertUsernameInvalid_SpecialChars_Hyphen() public {
        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.UsernameInvalid.selector);
        lb.registerUsername("ali-ce"); // hyphen not allowed
    }

    function test_RevertUsernameInvalid_SpecialChars_Space() public {
        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.UsernameInvalid.selector);
        lb.registerUsername("ali ce"); // space not allowed
    }

    function test_RevertUsernameInvalid_SpecialChars_At() public {
        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.UsernameInvalid.selector);
        lb.registerUsername("ali@ce"); // @ not allowed
    }

    function test_RevertUsernameInvalid_SpecialChars_Dot() public {
        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.UsernameInvalid.selector);
        lb.registerUsername("alice."); // dot not allowed
    }

    function test_RevertUsernameInvalid_EmptyString() public {
        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.UsernameInvalid.selector);
        lb.registerUsername(""); // 0 chars < 3
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. HAPPY PATH — awardPoints
    // ═══════════════════════════════════════════════════════════════════

    function test_AwardPoints_UpdatesPlayerPoints() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(owner);
        lb.awardPoints(alice, 500);

        PointsLeaderboard.Player memory p = lb.getPlayer(alice);
        assertEq(p.points, 500);
    }

    function test_AwardPoints_Accumulates() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.startPrank(owner);
        lb.awardPoints(alice, 100);
        lb.awardPoints(alice, 250);
        vm.stopPrank();

        assertEq(lb.getPlayer(alice).points, 350);
    }

    function test_AwardPoints_ZeroAmountAllowed() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(owner);
        lb.awardPoints(alice, 0);

        assertEq(lb.getPlayer(alice).points, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. REVERT PATHS — awardPoints
    // ═══════════════════════════════════════════════════════════════════

    function test_RevertNotOwner_AwardPoints() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(bob);
        vm.expectRevert(PointsLeaderboard.NotOwner.selector);
        lb.awardPoints(alice, 100);
    }

    function test_RevertNotRegistered_AwardPoints() public {
        vm.prank(owner);
        vm.expectRevert(PointsLeaderboard.NotRegistered.selector);
        lb.awardPoints(alice, 100); // alice never registered
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. HAPPY PATH — awardPointsBatch
    // ═══════════════════════════════════════════════════════════════════

    function test_AwardPointsBatch_UpdatesAll() public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        vm.prank(bob);
        lb.registerUsername("bob456");

        address[] memory players = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        players[0] = alice; amounts[0] = 300;
        players[1] = bob;   amounts[1] = 700;

        vm.prank(owner);
        lb.awardPointsBatch(players, amounts);

        assertEq(lb.getPlayer(alice).points, 300);
        assertEq(lb.getPlayer(bob).points,   700);
    }

    function test_AwardPointsBatch_EmptyArraysSucceeds() public {
        address[] memory players = new address[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.prank(owner);
        lb.awardPointsBatch(players, amounts); // no revert expected
    }

    // ═══════════════════════════════════════════════════════════════════
    // 7. REVERT PATHS — awardPointsBatch
    // ═══════════════════════════════════════════════════════════════════

    function test_RevertNotOwner_AwardPointsBatch() public {
        address[] memory players = new address[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.prank(alice);
        vm.expectRevert(PointsLeaderboard.NotOwner.selector);
        lb.awardPointsBatch(players, amounts);
    }

    function test_RevertUsernameInvalid_MismatchedArrays() public {
        // awardPointsBatch reuses UsernameInvalid for length mismatch
        vm.prank(alice);
        lb.registerUsername("alice123");

        address[] memory players = new address[](1);
        uint256[] memory amounts = new uint256[](2); // wrong length
        players[0] = alice;
        amounts[0] = 100;
        amounts[1] = 200;

        vm.prank(owner);
        vm.expectRevert(PointsLeaderboard.UsernameInvalid.selector);
        lb.awardPointsBatch(players, amounts);
    }

    function test_RevertNotRegistered_BatchIncludesUnregistered() public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        // bob is NOT registered

        address[] memory players = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        players[0] = alice; amounts[0] = 100;
        players[1] = bob;   amounts[1] = 200;

        vm.prank(owner);
        vm.expectRevert(PointsLeaderboard.NotRegistered.selector);
        lb.awardPointsBatch(players, amounts);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. EVENTS — PlayerRegistered
    // ═══════════════════════════════════════════════════════════════════

    function test_EmitPlayerRegistered() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true, address(lb));
        emit PlayerRegistered(alice, "alice123");
        lb.registerUsername("alice123");
    }

    function test_EmitPlayerRegistered_Bob() public {
        vm.prank(bob);
        vm.expectEmit(true, false, false, true, address(lb));
        emit PlayerRegistered(bob, "bobbob");
        lb.registerUsername("bobbob");
    }

    // ═══════════════════════════════════════════════════════════════════
    // 9. EVENTS — PointsAwarded
    // ═══════════════════════════════════════════════════════════════════

    function test_EmitPointsAwarded() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(owner);
        vm.expectEmit(true, false, false, true, address(lb));
        emit PointsAwarded(alice, 500, 500);
        lb.awardPoints(alice, 500);
    }

    function test_EmitPointsAwarded_AccumulatedTotal() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.startPrank(owner);
        lb.awardPoints(alice, 100);

        vm.expectEmit(true, false, false, true, address(lb));
        emit PointsAwarded(alice, 200, 300); // newTotal = 100 + 200
        lb.awardPoints(alice, 200);
        vm.stopPrank();
    }

    function test_EmitPointsAwarded_BatchEmitsPerPlayer() public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        vm.prank(bob);
        lb.registerUsername("bob456");

        address[] memory players = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        players[0] = alice; amounts[0] = 10;
        players[1] = bob;   amounts[1] = 20;

        vm.startPrank(owner);
        // Expect alice's event first, then bob's
        vm.expectEmit(true, false, false, true, address(lb));
        emit PointsAwarded(alice, 10, 10);
        vm.expectEmit(true, false, false, true, address(lb));
        emit PointsAwarded(bob, 20, 20);
        lb.awardPointsBatch(players, amounts);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 10. LEADERBOARD SORTING
    // ═══════════════════════════════════════════════════════════════════

    function test_LeaderboardDescendingOrder_TwoPlayers() public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        vm.prank(bob);
        lb.registerUsername("bob456");

        vm.startPrank(owner);
        lb.awardPoints(alice, 100);
        lb.awardPoints(bob,   500);
        vm.stopPrank();

        PointsLeaderboard.LeaderboardEntry[] memory entries = lb.getLeaderboard();
        // bob (500) should be before alice (100)
        assertEq(entries[0].wallet, bob);
        assertEq(entries[0].points, 500);
        assertEq(entries[1].wallet, alice);
        assertEq(entries[1].points, 100);
    }

    function test_LeaderboardDescendingOrder_FourPlayers() public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        vm.prank(bob);
        lb.registerUsername("bob456");
        vm.prank(carol);
        lb.registerUsername("carol_x");
        vm.prank(dave);
        lb.registerUsername("dave999");

        vm.startPrank(owner);
        lb.awardPoints(alice, 200);
        lb.awardPoints(bob,   800);
        lb.awardPoints(carol, 500);
        lb.awardPoints(dave,  350);
        vm.stopPrank();

        PointsLeaderboard.LeaderboardEntry[] memory entries = lb.getLeaderboard();

        // Expected descending: bob(800), carol(500), dave(350), alice(200)
        assertEq(entries[0].wallet, bob);
        assertEq(entries[1].wallet, carol);
        assertEq(entries[2].wallet, dave);
        assertEq(entries[3].wallet, alice);
    }

    function test_LeaderboardDescendingOrder_AfterOvertake() public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        vm.prank(bob);
        lb.registerUsername("bob456");

        vm.startPrank(owner);
        lb.awardPoints(alice, 1000); // alice leads first
        lb.awardPoints(bob,   600);
        // Now give bob enough to overtake alice
        lb.awardPoints(bob, 500);  // bob = 1100, alice = 1000
        vm.stopPrank();

        PointsLeaderboard.LeaderboardEntry[] memory entries = lb.getLeaderboard();
        assertEq(entries[0].wallet, bob);
        assertEq(entries[0].points, 1100);
        assertEq(entries[1].wallet, alice);
        assertEq(entries[1].points, 1000);
    }

    function test_LeaderboardLength_GrowsWithRegistrations() public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        assertEq(lb.getLeaderboard().length, 1);

        vm.prank(bob);
        lb.registerUsername("bob456");
        assertEq(lb.getLeaderboard().length, 2);
    }

    function test_LeaderboardPoints_Reflect_Zero_Then_Awarded() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        // Before any award: alice in leaderboard with 0 points
        PointsLeaderboard.LeaderboardEntry[] memory before = lb.getLeaderboard();
        assertEq(before[0].points, 0);

        vm.prank(owner);
        lb.awardPoints(alice, 42);

        PointsLeaderboard.LeaderboardEntry[] memory afterAward = lb.getLeaderboard();
        assertEq(afterAward[0].wallet, alice);
        assertEq(afterAward[0].points, 42);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 11. FUZZ — awardPoints accumulation
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Fuzz the awarded amount; confirms points always equal the sum of two awards.
    function testFuzz_AwardPoints_AccumulatesCorrectly(uint128 firstAward, uint128 secondAward) public {
        // Using uint128 to avoid overflow when summing two awards into uint256
        vm.prank(alice);
        lb.registerUsername("alice123");

        uint256 a = uint256(firstAward);
        uint256 b = uint256(secondAward);

        vm.startPrank(owner);
        lb.awardPoints(alice, a);
        lb.awardPoints(alice, b);
        vm.stopPrank();

        assertEq(lb.getPlayer(alice).points, a + b);
    }

    /// @dev Fuzz a single large award; confirms player struct and leaderboard entry agree.
    function testFuzz_AwardPoints_LeaderboardMatchesPlayerStruct(uint128 amount) public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(owner);
        lb.awardPoints(alice, uint256(amount));

        uint256 playerPoints = lb.getPlayer(alice).points;
        PointsLeaderboard.LeaderboardEntry[] memory entries = lb.getLeaderboard();

        // There is only one player so they must be at index 0
        assertEq(entries[0].points, playerPoints);
        assertEq(entries[0].wallet, alice);
    }

    /// @dev Fuzz awardPointsBatch with two players; total points must equal sum of batch amounts.
    function testFuzz_AwardPointsBatch_TotalMatchesSumOfAmounts(
        uint64 aliceAmt,
        uint64 bobAmt
    ) public {
        vm.prank(alice);
        lb.registerUsername("alice123");
        vm.prank(bob);
        lb.registerUsername("bob456");

        address[] memory players = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        players[0] = alice; amounts[0] = uint256(aliceAmt);
        players[1] = bob;   amounts[1] = uint256(bobAmt);

        vm.prank(owner);
        lb.awardPointsBatch(players, amounts);

        assertEq(lb.getPlayer(alice).points, uint256(aliceAmt));
        assertEq(lb.getPlayer(bob).points,   uint256(bobAmt));
    }

    // ═══════════════════════════════════════════════════════════════════
    // 12. INVARIANT — leaderboard order never violated after many awards
    // ═══════════════════════════════════════════════════════════════════

    /// @dev After bulk operations the leaderboard must remain strictly
    ///      non-increasing from index 0 to n-1.
    function test_Invariant_LeaderboardAlwaysDescending() public {
        // Register four players
        address[4] memory addrs = [alice, bob, carol, dave];
        string[4] memory names  = ["alice123", "bob456", "carol_x", "dave999"];

        for (uint256 i = 0; i < 4; i++) {
            vm.prank(addrs[i]);
            lb.registerUsername(names[i]);
        }

        // Award varied amounts to create a non-trivial sort
        uint256[4] memory pts = [uint256(150), 900, 450, 300];
        vm.startPrank(owner);
        for (uint256 i = 0; i < 4; i++) {
            lb.awardPoints(addrs[i], pts[i]);
        }
        // Additional awards to shuffle order further
        lb.awardPoints(alice, 500); // alice = 650
        lb.awardPoints(carol, 300); // carol = 750
        vm.stopPrank();

        PointsLeaderboard.LeaderboardEntry[] memory entries = lb.getLeaderboard();
        for (uint256 i = 1; i < entries.length; i++) {
            assertGe(entries[i - 1].points, entries[i].points);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 13. HAPPY PATH — claimDailyPoints
    // ═══════════════════════════════════════════════════════════════════

    /// @dev First claim gives 10 points and records lastClaimTime.
    function test_ClaimDailyPoints_HappyPath_PointsAndTimestamp() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        uint256 tsBefore = block.timestamp;

        vm.prank(alice);
        lb.claimDailyPoints();

        PointsLeaderboard.Player memory p = lb.getPlayer(alice);
        assertEq(p.points, lb.CLAIM_AMOUNT());
        assertEq(lb.lastClaimTime(alice), tsBefore);
    }

    /// @dev Claim increments points to exactly CLAIM_AMOUNT (10).
    function test_ClaimDailyPoints_HappyPath_ExactClaimAmount() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(alice);
        lb.claimDailyPoints();

        assertEq(lb.getPlayer(alice).points, 10);
    }

    /// @dev PointsClaimed event is emitted with correct args on first claim.
    function test_ClaimDailyPoints_EmitsPointsClaimed() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(alice);
        vm.expectEmit(true, false, false, true, address(lb));
        emit PointsClaimed(alice, 10, 10);
        lb.claimDailyPoints();
    }

    /// @dev After claim, alice's leaderboard entry reflects the new points.
    function test_ClaimDailyPoints_UpdatesLeaderboard() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(alice);
        lb.claimDailyPoints();

        PointsLeaderboard.LeaderboardEntry[] memory entries = lb.getLeaderboard();
        assertEq(entries.length, 1);
        assertEq(entries[0].wallet, alice);
        assertEq(entries[0].points, 10);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 14. REVERT PATHS — claimDailyPoints
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Unregistered wallet cannot claim.
    function test_ClaimDailyPoints_RevertNotRegistered() public {
        vm.prank(alice); // alice never registered
        vm.expectRevert(PointsLeaderboard.NotRegistered.selector);
        lb.claimDailyPoints();
    }

    /// @dev Second claim within 24 h reverts with ClaimCooldownActive carrying the correct availableAt.
    function test_ClaimDailyPoints_RevertClaimCooldownActive() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        // First claim — succeeds and records lastClaimTime = block.timestamp
        uint256 firstClaimTs = block.timestamp;
        vm.prank(alice);
        lb.claimDailyPoints();

        uint256 expectedAvailableAt = firstClaimTs + lb.CLAIM_COOLDOWN();

        // Advance by less than CLAIM_COOLDOWN (e.g. 12 hours)
        vm.warp(block.timestamp + 12 hours);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PointsLeaderboard.ClaimCooldownActive.selector, expectedAvailableAt)
        );
        lb.claimDailyPoints();
    }

    /// @dev The cooldown is tight: revert at exactly (availableAt - 1).
    function test_ClaimDailyPoints_RevertClaimCooldownActive_OneBefore() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        uint256 firstClaimTs = block.timestamp;
        vm.prank(alice);
        lb.claimDailyPoints();

        uint256 availableAt = firstClaimTs + lb.CLAIM_COOLDOWN();

        // Warp to one second before the window opens
        vm.warp(availableAt - 1);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PointsLeaderboard.ClaimCooldownActive.selector, availableAt)
        );
        lb.claimDailyPoints();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 15. COOLDOWN RESET — second claim after warp succeeds
    // ═══════════════════════════════════════════════════════════════════

    /// @dev After warping past the cooldown, the second claim succeeds and awards another 10 pts.
    function test_ClaimDailyPoints_CooldownReset_SecondClaimSucceeds() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        // First claim
        vm.prank(alice);
        lb.claimDailyPoints();

        // Advance past the cooldown
        vm.warp(block.timestamp + 24 hours + 1);

        uint256 secondClaimTs = block.timestamp;

        // Second claim — must not revert
        vm.prank(alice);
        lb.claimDailyPoints();

        // Points accumulated to 20
        assertEq(lb.getPlayer(alice).points, 20);
        // lastClaimTime updated to the second claim timestamp
        assertEq(lb.lastClaimTime(alice), secondClaimTs);
    }

    /// @dev PointsClaimed event on the second (post-cooldown) claim carries accumulated total.
    function test_ClaimDailyPoints_CooldownReset_EmitsEvent() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(alice);
        lb.claimDailyPoints(); // first claim: total = 10

        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(alice);
        vm.expectEmit(true, false, false, true, address(lb));
        emit PointsClaimed(alice, 10, 20); // newTotal = 20
        lb.claimDailyPoints();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 16. nextClaimTime() view function
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Returns 0 before any claim has been made.
    function test_NextClaimTime_ReturnsZero_BeforeFirstClaim() public view {
        // alice never claimed — lastClaimTime == 0
        assertEq(lb.nextClaimTime(alice), 0);
    }

    /// @dev Returns the correct future timestamp immediately after a claim.
    function test_NextClaimTime_ReturnsFuture_MidCooldown() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        uint256 claimTs = block.timestamp;
        vm.prank(alice);
        lb.claimDailyPoints();

        uint256 expected = claimTs + lb.CLAIM_COOLDOWN();
        assertEq(lb.nextClaimTime(alice), expected);
    }

    /// @dev Returns 0 after the full cooldown has elapsed.
    function test_NextClaimTime_ReturnsZero_AfterCooldownElapsed() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        vm.prank(alice);
        lb.claimDailyPoints();

        // Advance past cooldown boundary
        vm.warp(block.timestamp + 24 hours + 1);

        assertEq(lb.nextClaimTime(alice), 0);
    }

    /// @dev nextClaimTime returns 0 at the exact boundary (availableAt == block.timestamp).
    function test_NextClaimTime_ReturnsZero_AtExactBoundary() public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        uint256 claimTs = block.timestamp;
        vm.prank(alice);
        lb.claimDailyPoints();

        // Warp to exactly availableAt
        vm.warp(claimTs + lb.CLAIM_COOLDOWN());

        assertEq(lb.nextClaimTime(alice), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 17. FUZZ — claimDailyPoints cooldown boundary
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Fuzz a timestamp offset: offsets < CLAIM_COOLDOWN must revert;
    ///      offsets >= CLAIM_COOLDOWN must succeed.
    function testFuzz_ClaimDailyPoints_CooldownBoundary(uint32 offsetSeconds) public {
        vm.prank(alice);
        lb.registerUsername("alice123");

        uint256 firstClaimTs = block.timestamp;
        vm.prank(alice);
        lb.claimDailyPoints();

        uint256 cooldown = lb.CLAIM_COOLDOWN(); // 86400
        uint256 warpTo = firstClaimTs + uint256(offsetSeconds);

        vm.warp(warpTo);

        if (uint256(offsetSeconds) < cooldown) {
            // Still within cooldown — must revert
            uint256 availableAt = firstClaimTs + cooldown;
            vm.prank(alice);
            vm.expectRevert(
                abi.encodeWithSelector(PointsLeaderboard.ClaimCooldownActive.selector, availableAt)
            );
            lb.claimDailyPoints();
        } else {
            // Cooldown elapsed — must succeed
            vm.prank(alice);
            lb.claimDailyPoints();
            assertEq(lb.getPlayer(alice).points, 20); // 10 + 10
        }
    }
}
