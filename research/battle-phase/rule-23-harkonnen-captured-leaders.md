# Rule 23: Harkonnen Captured Leaders - Implementation Verification

## Rule Reference
**Source**: `handwritten-rules/battle.md` lines 150-156

### Rule Text
```
CAPTURED LEADERS
After you win a battle and all effects have been resolved randomly select 1 Active Leader from the loser (including the leader used in the battle, if not killed, but excluding all leaders already used elsewhere that Turn), you may choose to activate either ability: ✷
KILL: Place the Leader Disc face down into the Tleilaxu Tanks to gain 2 spice from the Spice Bank.
CAPTURE: That leader is now in your Active Leader Pool. After it is used in a battle, if it wasn't killed during that battle, the leader is returned to the Active Leader Pool of the player who last had it.
PRISON BREAK: When all your own leaders have been killed, you must return all captured leaders immediately to the players who last had them as an Active Leader.
TYING UP LOOSE ENDS: Killed captured leaders are Placed in the Tleilaxu Tanks from which their factions can revive them (subject to the revival rules).
NO LOYALTY: A captured leader used in battle may be called traitor with the matching Traitor Card!
```

## Implementation Status Summary

| Rule Component | Status | Notes |
|----------------|--------|-------|
| Random selection after winning battle | ✅ **IMPLEMENTED** | Correctly selects from available leaders |
| KILL option (2 spice, face-down in tanks) | ✅ **IMPLEMENTED** | Works correctly |
| CAPTURE option (add to pool, return after use) | ✅ **IMPLEMENTED** | Returns to original owner correctly |
| PRISON BREAK (return all when all own leaders killed) | ✅ **IMPLEMENTED** | Triggers correctly |
| TYING UP LOOSE ENDS (killed captured leaders to original tanks) | ✅ **IMPLEMENTED** | Fixed: Now correctly goes to original faction tanks |
| NO LOYALTY (captured leaders can be called traitor) | ✅ **IMPLEMENTED** | Works correctly |

## Detailed Verification

### 1. CAPTURED LEADERS - Random Selection After Winning Battle

**Status**: ✅ **FULLY IMPLEMENTED**

**Implementation Location**: `src/lib/game/phases/handlers/battle.ts` lines 1178-1209

**Code Reference**:
```1178:1209:src/lib/game/phases/handlers/battle.ts
    // HARKONNEN CAPTURED LEADERS: Check if Harkonnen won and can capture a leader
    if (
      result.winner === Faction.HARKONNEN &&
      !result.lasgunjShieldExplosion &&
      state.factions.has(Faction.HARKONNEN)
    ) {
      const availableLeaders = getAvailableLeadersForCapture(
        newState,
        result.loser,
        battle.territoryId
      );

      if (availableLeaders.length > 0) {
        // Randomly select one leader from the available pool
        const captureTarget =
          availableLeaders[Math.floor(Math.random() * availableLeaders.length)];

        events.push({
          type: 'HARKONNEN_CAPTURE_OPPORTUNITY',
          data: {
            winner: result.winner,
            loser: result.loser,
            captureTarget: captureTarget.definitionId,
          },
          message: `Harkonnen can capture ${result.loser}'s leader!`,
        });

        // Move to capture sub-phase
        this.context.subPhase = BattleSubPhase.HARKONNEN_CAPTURE;
        return this.requestCaptureChoice(newState, events, captureTarget.definitionId, result.loser);
      }
    }
```

**Verification**:
- ✅ Triggers only when Harkonnen wins
- ✅ Excludes lasgun-shield explosions (both sides destroyed)
- ✅ Uses `getAvailableLeadersForCapture()` to filter eligible leaders
- ✅ Randomly selects from available pool using `Math.floor(Math.random() * availableLeaders.length)`

**Available Leaders Query**: `src/lib/game/state/queries.ts` lines 623-646
```623:646:src/lib/game/state/queries.ts
export function getAvailableLeadersForCapture(
  state: GameState,
  loser: Faction,
  battleTerritoryId: TerritoryId
): Leader[] {
  const loserState = getFactionState(state, loser);

  return loserState.leaders.filter((l) => {
    // Must be in leader pool or on board (not in tanks or captured)
    if (
      l.location !== LeaderLocation.LEADER_POOL &&
      l.location !== LeaderLocation.ON_BOARD
    ) {
      return false;
    }

    // If used this turn, must be in the same territory as the battle
    if (l.usedThisTurn && l.usedInTerritoryId !== battleTerritoryId) {
      return false;
    }

    return true;
  });
}
```

**Verification**:
- ✅ Includes leaders in `LEADER_POOL` (active leaders)
- ✅ Includes leaders `ON_BOARD` (leader used in battle, if not killed)
- ✅ Excludes leaders already used elsewhere this turn (checks `usedThisTurn` and `usedInTerritoryId`)
- ✅ Excludes leaders in tanks (implicitly, since only checks `LEADER_POOL` and `ON_BOARD`)

### 2. KILL Option - 2 Spice, Face-Down in Tanks

**Status**: ✅ **FULLY IMPLEMENTED**

**Implementation Location**: `src/lib/game/state/mutations.ts` lines 618-660

**Code Reference**:
```618:660:src/lib/game/state/mutations.ts
export function killCapturedLeader(
  state: GameState,
  captor: Faction,
  leaderId: string
): GameState {
  const captorState = getFactionState(state, captor);
  const leader = captorState.leaders.find((l) => l.definitionId === leaderId);

  if (!leader) {
    throw new Error(`Leader ${leaderId} not found in ${captor}'s leaders`);
  }

  if (!leader.capturedBy) {
    throw new Error(`Leader ${leaderId} is not captured`);
  }

  const originalFaction = leader.originalFaction;

  // Remove from captor's pool
  const captorLeaders = captorState.leaders.filter((l) => l.definitionId !== leaderId);
  let newState = updateFactionState(state, captor, { leaders: captorLeaders });

  // Add to original faction's tanks (face down per rules: "Place the Leader Disc face down")
  const originalState = getFactionState(newState, originalFaction);
  const originalLeaders = [
    ...originalState.leaders,
    {
      ...leader,
      faction: originalFaction, // Return to original faction
      location: LeaderLocation.TANKS_FACE_DOWN,
      capturedBy: null,
      hasBeenKilled: true,
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, originalFaction, { leaders: originalLeaders });

  // Grant 2 spice to captor
  newState = addSpice(newState, captor, 2);

  return newState;
}
```

**Verification**:
- ✅ Places leader face-down in tanks (`TANKS_FACE_DOWN`)
- ✅ Places leader in **original faction's tanks** (not Harkonnen's)
- ✅ Grants 2 spice to captor (`addSpice(newState, captor, 2)`)
- ✅ Sets `hasBeenKilled: true`
- ✅ Clears `capturedBy: null`

**Usage**: `src/lib/game/phases/handlers/battle.ts` lines 1661-1677
```1661:1677:src/lib/game/phases/handlers/battle.ts
      if (choice === 'kill') {
        // KILL: Place face-down in tanks, Harkonnen gains 2 spice
        // We need to temporarily give the leader to Harkonnen first so killCapturedLeader can find it
        newState = captureLeader(newState, Faction.HARKONNEN, victim, leaderId);
        newState = killCapturedLeader(newState, Faction.HARKONNEN, leaderId);

        events.push({
          type: 'LEADER_CAPTURED_AND_KILLED',
          data: {
            captor: Faction.HARKONNEN,
            victim,
            leaderId,
            leaderName,
            spiceGained: 2,
          },
          message: `Harkonnen kills captured leader ${leaderName} for 2 spice`,
        });
      }
```

### 3. CAPTURE Option - Add to Pool, Return After Use

**Status**: ✅ **FULLY IMPLEMENTED**

**Implementation Location**: 
- Capture: `src/lib/game/state/mutations.ts` lines 579-612
- Return after use: `src/lib/game/phases/handlers/battle.ts` lines 171-183

**Capture Function**:
```579:612:src/lib/game/state/mutations.ts
export function captureLeader(
  state: GameState,
  captor: Faction,
  victim: Faction,
  leaderId: string
): GameState {
  // Remove leader from victim's pool
  const victimState = getFactionState(state, victim);
  const victimLeaders = victimState.leaders.filter((l) => l.definitionId !== leaderId);
  let newState = updateFactionState(state, victim, { leaders: victimLeaders });

  // Find the leader being captured
  const capturedLeader = victimState.leaders.find((l) => l.definitionId === leaderId);
  if (!capturedLeader) {
    throw new Error(`Leader ${leaderId} not found in ${victim}'s leaders`);
  }

  // Add to captor's pool with capture metadata
  const captorState = getFactionState(newState, captor);
  const captorLeaders = [
    ...captorState.leaders,
    {
      ...capturedLeader,
      faction: captor, // Now controlled by captor
      location: LeaderLocation.LEADER_POOL,
      capturedBy: captor,
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, captor, { leaders: captorLeaders });

  return newState;
}
```

**Verification**:
- ✅ Transfers leader from victim to captor
- ✅ Sets `faction: captor` (current controller)
- ✅ Preserves `originalFaction` (from captured leader)
- ✅ Sets `capturedBy: captor`
- ✅ Places in `LEADER_POOL` (active leader pool)

**Return After Use**: `src/lib/game/phases/handlers/battle.ts` lines 171-183
```171:183:src/lib/game/phases/handlers/battle.ts
    // Return captured leaders that were used in battle this turn
    // Per rules: "After it is used in a battle, if it wasn't killed during that battle,
    // the leader is returned to the Active Leader Pool of the player who last had it."
    if (newState.factions.has(Faction.HARKONNEN)) {
      const harkonnenState = getFactionState(newState, Faction.HARKONNEN);
      const capturedLeadersUsed = harkonnenState.leaders.filter(
        (l) => l.capturedBy !== null && l.usedThisTurn && l.location !== LeaderLocation.TANKS_FACE_UP && l.location !== LeaderLocation.TANKS_FACE_DOWN
      );

      for (const leader of capturedLeadersUsed) {
        newState = returnCapturedLeader(newState, leader.definitionId);
      }
    }
```

**Return Function**: `src/lib/game/state/mutations.ts` lines 667-717
```667:717:src/lib/game/state/mutations.ts
export function returnCapturedLeader(state: GameState, leaderId: string): GameState {
  // Find which faction currently has this leader
  let currentHolder: Faction | null = null;
  let leader: Leader | null = null;

  for (const [faction, factionState] of state.factions) {
    const foundLeader = factionState.leaders.find((l) => l.definitionId === leaderId);
    if (foundLeader) {
      currentHolder = faction;
      leader = foundLeader;
      break;
    }
  }

  if (!currentHolder || !leader) {
    throw new Error(`Leader ${leaderId} not found in any faction's leaders`);
  }

  if (!leader.capturedBy) {
    // Not a captured leader, no action needed
    return state;
  }

  const originalFaction = leader.originalFaction;

  // Remove from current holder's pool
  const currentHolderState = getFactionState(state, currentHolder);
  const currentHolderLeaders = currentHolderState.leaders.filter(
    (l) => l.definitionId !== leaderId
  );
  let newState = updateFactionState(state, currentHolder, {
    leaders: currentHolderLeaders,
  });

  // Return to original faction's pool
  const originalState = getFactionState(newState, originalFaction);
  const originalLeaders = [
    ...originalState.leaders,
    {
      ...leader,
      faction: originalFaction, // Back to original faction
      location: LeaderLocation.LEADER_POOL,
      capturedBy: null, // No longer captured
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, originalFaction, { leaders: originalLeaders });

  return newState;
}
```

**Verification**:
- ✅ Only returns leaders that were used (`usedThisTurn: true`)
- ✅ Only returns leaders that survived (`location !== TANKS_FACE_UP/DOWN`)
- ✅ Returns to **original faction** (not current controller)
- ✅ Clears `capturedBy: null`
- ✅ Resets `usedThisTurn: false`

### 4. PRISON BREAK - Return All When All Own Leaders Killed

**Status**: ✅ **FULLY IMPLEMENTED**

**Implementation Location**: 
- Check: `src/lib/game/state/queries.ts` lines 661-680
- Trigger: `src/lib/game/phases/handlers/battle.ts` lines 185-192, 1580-1600

**Prison Break Check**:
```661:680:src/lib/game/state/queries.ts
export function shouldTriggerPrisonBreak(state: GameState, faction: Faction): boolean {
  const factionState = getFactionState(state, faction);

  // Find all own leaders (not captured ones)
  const ownLeaders = factionState.leaders.filter(
    (l) => l.originalFaction === faction
  );

  // Check if all own leaders are killed (in tanks)
  const allOwnLeadersKilled = ownLeaders.every(
    (l) =>
      l.location === LeaderLocation.TANKS_FACE_UP ||
      l.location === LeaderLocation.TANKS_FACE_DOWN
  );

  // Only trigger if we have captured leaders
  const hasCapturedLeaders = factionState.leaders.some((l) => l.capturedBy !== null);

  return allOwnLeadersKilled && hasCapturedLeaders;
}
```

**Verification**:
- ✅ Only checks **own leaders** (`originalFaction === faction`)
- ✅ Checks if all own leaders are in tanks (face-up or face-down)
- ✅ Only triggers if faction has captured leaders
- ✅ Correctly distinguishes between own leaders and captured leaders

**Return All Function**: `src/lib/game/state/mutations.ts` lines 724-736
```724:736:src/lib/game/state/mutations.ts
export function returnAllCapturedLeaders(state: GameState, captor: Faction): GameState {
  const captorState = getFactionState(state, captor);
  let newState = state;

  // Find all captured leaders
  const capturedLeaders = captorState.leaders.filter((l) => l.capturedBy !== null);

  for (const leader of capturedLeaders) {
    newState = returnCapturedLeader(newState, leader.definitionId);
  }

  return newState;
}
```

**Trigger Points**: 
1. After battle cleanup: `src/lib/game/phases/handlers/battle.ts` lines 185-192
2. After leader death: `src/lib/game/phases/handlers/battle.ts` lines 1580-1600

```185:192:src/lib/game/phases/handlers/battle.ts
    // Check for Prison Break
    // Per rules: "When all your own leaders have been killed, you must return all
    // captured leaders immediately to the players who last had them as an Active Leader."
    if (newState.factions.has(Faction.HARKONNEN)) {
      if (shouldTriggerPrisonBreak(newState, Faction.HARKONNEN)) {
        newState = returnAllCapturedLeaders(newState, Faction.HARKONNEN);
      }
    }
```

**Verification**:
- ✅ Checks after battle cleanup
- ✅ Checks after leader death (`checkPrisonBreak()` method)
- ✅ Returns all captured leaders to original owners
- ✅ Emits `PRISON_BREAK` event

### 5. TYING UP LOOSE ENDS - Killed Captured Leaders to Original Faction Tanks

**Status**: ✅ **FULLY IMPLEMENTED** (Fixed)

**Rule**: "Killed captured leaders are Placed in the Tleilaxu Tanks from which their factions can revive them (subject to the revival rules)."

**Implementation**:
- ✅ When killed via KILL option: Goes to original faction's tanks (see `killCapturedLeader()` above)
- ✅ When killed in battle: Now correctly goes to original faction's tanks

**Implementation Location**: `src/lib/game/phases/handlers/battle.ts` lines 1837-1856, 1858-1877, 1747-1764

**Code Reference** (Weapon Kills):
```1837:1856:src/lib/game/phases/handlers/battle.ts
    // Handle aggressor's leader death from weapons
    if (result.aggressorResult.leaderKilled && battle.aggressorPlan?.leaderId) {
      // TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks
      const aggressorState = getFactionState(newState, battle.aggressor);
      const aggressorLeader = aggressorState.leaders.find(
        (l) => l.definitionId === battle.aggressorPlan.leaderId
      );
      const targetFaction =
        aggressorLeader?.capturedBy !== null
          ? aggressorLeader.originalFaction
          : battle.aggressor;

      newState = killLeader(newState, targetFaction, battle.aggressorPlan.leaderId);
      events.push({
        type: "LEADER_KILLED",
        data: {
          faction: battle.aggressor,
          leaderId: battle.aggressorPlan.leaderId,
          killedBy: "weapon",
        },
        message: `${battle.aggressor}'s leader ${battle.aggressorPlan.leaderId} killed by weapon`,
      });

      // Check for Prison Break after leader death
      newState = this.checkPrisonBreak(newState, battle.aggressor, events);
    }
```

**Code Reference** (Lasgun-Shield Explosion):
```1747:1764:src/lib/game/phases/handlers/battle.ts
      // Kill both leaders
      // TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks
      if (battle.aggressorPlan?.leaderId) {
        const aggressorState = getFactionState(newState, battle.aggressor);
        const aggressorLeader = aggressorState.leaders.find(
          (l) => l.definitionId === battle.aggressorPlan.leaderId
        );
        const targetFaction =
          aggressorLeader?.capturedBy !== null
            ? aggressorLeader.originalFaction
            : battle.aggressor;

        newState = killLeader(newState, targetFaction, battle.aggressorPlan.leaderId);
        // Check for Prison Break after leader death
        newState = this.checkPrisonBreak(newState, battle.aggressor, events);
      }
```

**Verification**:
- ✅ Checks if leader is captured (`capturedBy !== null`)
- ✅ If captured, uses `originalFaction` for `killLeader()` call
- ✅ If not captured, uses current controller (normal behavior)
- ✅ Applies to both weapon kills and lasgun-shield explosion kills
- ✅ Killed captured leaders always go to original faction's tanks

### 6. NO LOYALTY - Captured Leaders Can Be Called Traitor

**Status**: ✅ **FULLY IMPLEMENTED**

**Implementation Location**: `src/lib/game/phases/handlers/battle.ts` lines 898-955

**How It Works**:
The traitor check uses the leader's `definitionId` (original identity), not the current `faction`. Since `definitionId` is preserved when a leader is captured, traitor cards can still match captured leaders.

**Code Reference**:
```918:920:src/lib/game/phases/handlers/battle.ts
        const hasTraitor =
          opponentLeader &&
          factionState.traitors.some((t) => t.leaderId === opponentLeader);
```

**Verification**:
- ✅ Traitor check uses `leaderId` from battle plan (which is `definitionId`)
- ✅ Traitor cards store `leaderId` (which is `definitionId`)
- ✅ `definitionId` is preserved when leader is captured
- ✅ Therefore, captured leaders can be called traitor

**Example Scenario**:
1. Harkonnen captures Stilgar from Fremen
2. Fremen holds traitor card for Stilgar (`leaderId: "stilgar"`)
3. Harkonnen uses captured Stilgar in battle
4. Battle plan has `leaderId: "stilgar"` (the `definitionId`)
5. Fremen's traitor check: `traitors.some((t) => t.leaderId === "stilgar")` → ✅ Match!
6. Fremen can call traitor on their own captured leader

**Documentation**: See `NO_LOYALTY_IMPLEMENTATION.md` for full details

## Data Structures

### Leader Interface
```21:31:src/lib/game/types/entities.ts
export interface Leader {
  definitionId: string;
  faction: Faction;
  strength: number;
  location: LeaderLocation;
  hasBeenKilled: boolean; // Has this leader ever been killed?
  usedThisTurn: boolean; // Has fought in a territory this turn?
  usedInTerritoryId: TerritoryId | null; // Where they fought this turn
  originalFaction: Faction; // Track original owner (for captured leaders)
  capturedBy: Faction | null; // Track captor (null if not captured)
}
```

**Key Fields**:
- `definitionId`: Original identity (preserved when captured)
- `faction`: Current controlling faction (changes when captured)
- `originalFaction`: Original owner (preserved when captured)
- `capturedBy`: Current captor (null if not captured)

## Summary

### ✅ Fully Implemented (6/6)
1. Random selection after winning battle
2. KILL option (2 spice, face-down in tanks)
3. CAPTURE option (add to pool, return after use)
4. PRISON BREAK (return all when all own leaders killed)
5. TYING UP LOOSE ENDS (killed captured leaders go to original faction tanks) - **FIXED**
6. NO LOYALTY (captured leaders can be called traitor)

All rules from `handwritten-rules/battle.md` lines 150-156 are now fully implemented and verified.

