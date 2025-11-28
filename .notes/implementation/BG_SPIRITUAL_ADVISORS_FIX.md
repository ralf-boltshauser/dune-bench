# BG Spiritual Advisors Fix

## Issue
**Rule 2.02.05: SPIRITUAL ADVISORS** was never triggered during gameplay.

The Bene Gesserit ability states:
> "Whenever any other faction Ships Forces onto Dune from off-planet, you may Send 1 Force (fighter) for free from your reserves to the Polar Sink."

### Root Cause
The methods `requestBGSpiritualAdvisor()` and `processBGSpiritualAdvisorDecision()` existed in `shipment-movement.ts` but were never called from the main game flow.

## Solution

### Changes Made in `/src/lib/game/phases/handlers/shipment-movement.ts`

1. **Added check in `processStep()`** (line 128-135)
   - Added handler for BG spiritual advisor decisions before processing other responses
   - When `waitingForBGAdvisor` flag is set, process BG's decision first

2. **Added trigger check after shipment** (line 175-189)
   - After a non-BG faction successfully ships forces, check if BG should be asked
   - Use `shouldAskBGSpiritualAdvisor()` to determine eligibility
   - Set `waitingForBGAdvisor` flag and call `requestBGSpiritualAdvisor()`

3. **Created helper method `shouldAskBGSpiritualAdvisor()`** (line 750-762)
   - Checks if shipping faction is NOT Bene Gesserit
   - Checks if BG is in the game
   - Checks if BG has reserves available

4. **Updated `requestBGSpiritualAdvisor()`** (line 768-812)
   - Properly creates SEND_ADVISOR request for BG
   - Provides context about triggering shipment
   - Checks advanced rules (same territory option)

5. **Updated `processBGSpiritualAdvisorDecision()`** (line 797-835)
   - Processes BG's response (send or pass)
   - Clears tracking flags
   - Returns control flow to continue with movement phase

## Flow Diagram

```
Non-BG Faction Ships Forces
    ↓
processShipment() updates state
    ↓
shouldAskBGSpiritualAdvisor() → YES
    ↓
Set waitingForBGAdvisor = true
    ↓
requestBGSpiritualAdvisor()
    ↓
BG Agent receives SEND_ADVISOR request
    ↓
BG uses bg_send_spiritual_advisor tool OR passes
    ↓
processBGSpiritualAdvisorDecision()
    ↓
Clear waitingForBGAdvisor flag
    ↓
Continue to Movement Phase for shipping faction
```

## Key Design Points

1. **Side Quest Pattern**: BG advisor is a "side quest" that interrupts the normal flow but doesn't change whose turn it is
2. **Multiple Triggers**: Can trigger multiple times per phase (once per non-BG shipment)
3. **Free Action**: Costs BG 0 spice (handled by the tool)
4. **Options Available**:
   - Basic: Send 1 force to Polar Sink
   - Advanced (if enabled): Send 1 force to same territory as triggering shipment
   - Pass: Decline the opportunity

## Testing

Test file: `/src/lib/game/test-bg-spiritual-advisors.ts`

### Test Results
✅ BG is asked after Harkonnen ships forces
✅ BG is asked after Atreides ships forces
✅ Message displays: "🧘 BG SPIRITUAL ADVISORS: Another faction shipped to..."
✅ BG can use `bg_send_spiritual_advisor` tool
✅ Flow continues correctly to movement phase

### Example Output
```
✅ Shipped 3 forces to arrakeen (sector 9) for 3 spice

🧘 BG SPIRITUAL ADVISORS: Another faction shipped to arrakeen
   You may send 1 force for FREE to Polar Sink or same territory

  Bene Gesserit needs to decide:
    📋 SEND_ADVISOR
    Spiritual Advisors: Another faction just shipped to arrakeen (sector 9)...
```

## Related Files
- `/src/lib/game/phases/handlers/shipment-movement.ts` - Main fix
- `/src/lib/game/tools/actions/shipment.ts` - Contains `bg_send_spiritual_advisor` tool
- `/src/lib/game/test-bg-spiritual-advisors.ts` - Test file

## Verification Checklist
- [x] BG is asked when non-BG faction ships
- [x] BG can choose Polar Sink option
- [x] BG can choose same territory option (if advanced rules enabled)
- [x] BG can pass
- [x] Multiple triggers work (multiple shipments in same phase)
- [x] Game flow continues correctly after BG decision
- [x] No cost charged to BG (0 spice)
