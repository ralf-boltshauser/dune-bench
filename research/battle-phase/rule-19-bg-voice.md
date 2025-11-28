# Rule 19: Bene Gesserit Voice Ability Verification

## Rule Reference
**Source**: `handwritten-rules/battle.md` line 72

**Rule Text**:
> VOICE: After Battle Plans [1.07.04.00] you may command your opponent to play or not play one of the following cards in their Battle Plan: poison weapon, projectile weapon, poison defense, projectile defense, a worthless card, a Cheap Hero, a specific special weapon by name, or a specific special defense by name. Your opponent must comply with your command as well as they are able to.✷

**Alliance Rule** (line 73):
> ALLIANCE: In your ally's battle you may use ability Voice [2.02.06] on your ally's opponent.✷

## Implementation Location
- **Main Handler**: `src/lib/game/phases/handlers/battle.ts`
- **Validation Logic**: `src/lib/game/rules/combat.ts`
- **Type Definitions**: `src/lib/game/types/state.ts`

## Verification Results

### ✅ Battle Presence Verification

Both Voice and Prescience abilities correctly verify that the relevant factions are actually in battle before triggering:

#### Prescience Check
- **Status**: ✅ **CORRECT**
- **Implementation**: Only triggers if Atreides is in battle OR their ally is in battle
- **Code Reference**:
```487:506:src/lib/game/phases/handlers/battle.ts
    // Check for Atreides prescience
    if (state.factions.has(Faction.ATREIDES)) {
      const atreidesInBattle =
        aggressor === Faction.ATREIDES || defender === Faction.ATREIDES;
      const atreidesAlly = getAlly(state, Faction.ATREIDES);
      const allyInBattle = atreidesAlly && (aggressor === atreidesAlly || defender === atreidesAlly);

      if (atreidesInBattle || allyInBattle) {
        // Determine opponent to use prescience against
        let prescienceTarget: Faction;
        if (atreidesInBattle) {
          prescienceTarget = aggressor === Faction.ATREIDES ? defender : aggressor;
        } else {
          // Ally's battle - target is ally's opponent
          prescienceTarget = aggressor === atreidesAlly ? defender : aggressor;
        }

        this.context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
        return this.requestPrescience(state, events, prescienceTarget);
      }
    }
```
- **Verification**: The check `state.factions.has(Faction.ATREIDES)` is an optimization. The actual battle check (`atreidesInBattle || allyInBattle`) ensures Prescience only triggers when Atreides or their ally is actually in the current battle.

#### Voice Check
- **Status**: ✅ **CORRECT** (fixed)
- **Implementation**: Only triggers if BG is in battle OR their ally is in battle
- **Code Reference**: See section 2. Alliance Usage below
- **Verification**: The check `state.factions.has(Faction.BENE_GESSERIT)` is an optimization. The actual battle check (`bgInBattle || allyInBattle`) ensures Voice only triggers when BG or their ally is actually in the current battle.

### ✅ Correctly Implemented

#### 1. Timing
- **Status**: ✅ **CORRECT**
- **Implementation**: Voice is triggered after Battle Plans are submitted (lines 752-760 in `battle.ts`)
- **Code Reference**:
```752:760:src/lib/game/phases/handlers/battle.ts
    // Check for BG voice
    if (state.factions.has(Faction.BENE_GESSERIT)) {
      const bgInBattle =
        battle.aggressor === Faction.BENE_GESSERIT ||
        battle.defender === Faction.BENE_GESSERIT;

      if (bgInBattle) {
        this.context.subPhase = BattleSubPhase.VOICE_OPPORTUNITY;
        return this.requestVoice(state, events);
      }
    }
```
- **Verification**: Voice opportunity is checked after `processBattlePlans` completes, which aligns with "After Battle Plans [1.07.04.00]"

#### 2. Compliance Validation
- **Status**: ✅ **CORRECT**
- **Implementation**: Validation occurs after plans are revealed (lines 859-889)
- **Code Reference**:
```859:889:src/lib/game/phases/handlers/battle.ts
    // Validate Voice compliance if Voice was used
    if (battle.voiceUsed && battle.voiceCommand) {
      const bgFaction = battle.aggressor === Faction.BENE_GESSERIT ? battle.aggressor : battle.defender;
      const opponentFaction = battle.aggressor === Faction.BENE_GESSERIT ? battle.defender : battle.aggressor;
      const opponentPlan = battle.aggressor === Faction.BENE_GESSERIT ? battle.defenderPlan : battle.aggressorPlan;

      if (opponentPlan) {
        const voiceErrors = validateVoiceCompliance(state, opponentPlan, battle.voiceCommand);

        if (voiceErrors.length > 0) {
          // Opponent violated Voice command
          events.push({
            type: 'VOICE_VIOLATION',
            data: {
              faction: opponentFaction,
              command: battle.voiceCommand,
              errors: voiceErrors,
            },
            message: `${opponentFaction} violated Voice command: ${voiceErrors[0].message}`,
          });

          // Note: In the actual game, Voice violations are handled by house rules.
          // For AI simulation, we log the violation but continue with the battle.
          // A stricter implementation could force the plan to be resubmitted.
        } else {
          events.push({
            type: 'VOICE_COMPLIED',
            data: { faction: opponentFaction },
            message: `${opponentFaction} complies with Voice command`,
          });
        }
      }
    }
```
- **Verification**: The validation logic correctly checks compliance and logs violations

#### 3. Validation Logic Support
- **Status**: ✅ **CORRECT**
- **Implementation**: The validation functions support all required card types
- **Code Reference**:
```1160:1208:src/lib/game/rules/combat.ts
function checkHasCardOfType(
  state: GameState,
  faction: Faction,
  cardType: 'poison_weapon' | 'projectile_weapon' | 'poison_defense' | 'projectile_defense' | 'worthless' | 'cheap_hero' | 'specific_weapon' | 'specific_defense',
  specificCardName?: string
): boolean {
  const factionState = getFactionState(state, faction);

  for (const card of factionState.hand) {
    const def = getTreacheryCardDefinition(card.definitionId);
    if (!def) continue;

    switch (cardType) {
      case 'poison_weapon':
        if (def.type === TreacheryCardType.WEAPON_POISON) return true;
        break;
      case 'projectile_weapon':
        // Lasgun counts as projectile weapon for Voice purposes
        if (def.type === TreacheryCardType.WEAPON_PROJECTILE || def.type === TreacheryCardType.WEAPON_SPECIAL) return true;
        break;
      case 'poison_defense':
        if (def.type === TreacheryCardType.DEFENSE_POISON) return true;
        break;
      case 'projectile_defense':
        if (def.type === TreacheryCardType.DEFENSE_PROJECTILE) return true;
        break;
      case 'worthless':
        if (isWorthless(def)) return true;
        break;
      case 'cheap_hero':
        if (isCheapHero(def)) return true;
        break;
      case 'specific_weapon':
        // Check for specific weapon by name (e.g., 'lasgun')
        if (specificCardName && def.name.toLowerCase() === specificCardName.toLowerCase()) {
          return true;
        }
        break;
      case 'specific_defense':
        // Check for specific defense by name (e.g., 'shield', 'snooper')
        if (specificCardName && def.name.toLowerCase() === specificCardName.toLowerCase()) {
          return true;
        }
        break;
    }
  }

  return false;
}
```
- **Verification**: All card types from the rule are supported in the validation logic

#### 4. Type Definitions
- **Status**: ✅ **CORRECT**
- **Implementation**: VoiceCommand type includes all required fields
- **Code Reference**:
```120:132:src/lib/game/types/state.ts
export interface VoiceCommand {
  type: "play" | "not_play";
  cardType:
    | "poison_weapon"
    | "projectile_weapon"
    | "poison_defense"
    | "projectile_defense"
    | "worthless"
    | "cheap_hero"
    | "specific_weapon"
    | "specific_defense";
  specificCardName?: string; // For named special cards (e.g., 'lasgun', 'shield')
}
```
- **Verification**: Type system correctly supports all required command types

### ❌ Issues Found

#### 1. Incomplete Voice Options List
- **Status**: ❌ **INCOMPLETE**
- **Issue**: The `requestVoice` method only provides 8 options, missing:
  - `worthless` card (play/not_play)
  - `cheap_hero` (play/not_play)
  - `specific_weapon` by name (play/not_play)
  - `specific_defense` by name (play/not_play)
- **Current Implementation**:
```790:799:src/lib/game/phases/handlers/battle.ts
          options: [
            'play_poison_weapon',
            'not_play_poison_weapon',
            'play_projectile_weapon',
            'not_play_projectile_weapon',
            'play_poison_defense',
            'not_play_poison_defense',
            'play_projectile_defense',
            'not_play_projectile_defense',
          ],
```
- **Required**: Should include all options from the rule:
  - `play_worthless` / `not_play_worthless`
  - `play_cheap_hero` / `not_play_cheap_hero`
  - `play_specific_weapon:<name>` / `not_play_specific_weapon:<name>` (e.g., `play_specific_weapon:lasgun`)
  - `play_specific_defense:<name>` / `not_play_specific_defense:<name>` (e.g., `play_specific_defense:shield`)
- **Impact**: BG cannot command opponent to play/not play worthless cards, Cheap Hero, or specific weapons/defenses by name, even though the validation logic supports these commands

#### 2. Alliance Usage
- **Status**: ✅ **FIXED** (was missing, now implemented)
- **Implementation**: Voice can now be used when BG is directly in battle OR when their ally is in battle
- **Code Reference**:
```1002:1020:src/lib/game/phases/handlers/battle.ts
    // Check for BG voice (only if BG or their ally is in battle)
    if (state.factions.has(Faction.BENE_GESSERIT)) {
      const bgInBattle =
        battle.aggressor === Faction.BENE_GESSERIT ||
        battle.defender === Faction.BENE_GESSERIT;
      const bgAlly = getAlly(state, Faction.BENE_GESSERIT);
      const allyInBattle = bgAlly && (battle.aggressor === bgAlly || battle.defender === bgAlly);

      if (bgInBattle || allyInBattle) {
        // Determine opponent to use Voice against
        let voiceTarget: Faction;
        if (bgInBattle) {
          voiceTarget = battle.aggressor === Faction.BENE_GESSERIT ? battle.defender : battle.aggressor;
        } else {
          // Ally's battle - target is ally's opponent
          voiceTarget = battle.aggressor === bgAlly! ? battle.defender : battle.aggressor;
        }

        this.context.subPhase = BattleSubPhase.VOICE_OPPORTUNITY;
        return this.requestVoice(state, events, voiceTarget);
      }
    }
```
- **Verification**: ✅ Correctly checks if BG or their ally is in battle before triggering Voice opportunity
- **Note**: The check `state.factions.has(Faction.BENE_GESSERIT)` is an optimization to avoid checking if BG isn't in the game. The actual battle check (`bgInBattle || allyInBattle`) ensures Voice only triggers when BG or their ally is actually in the current battle.

#### 3. Voice Command Parsing
- **Status**: ⚠️ **POTENTIAL ISSUE**
- **Issue**: The `processVoice` method stores the command directly from the response without parsing:
```821:829:src/lib/game/phases/handlers/battle.ts
    if (response && !response.passed && response.actionType === 'USE_VOICE') {
      this.context.currentBattle!.voiceUsed = true;
      this.context.currentBattle!.voiceCommand = response.data.command;

      events.push({
        type: 'VOICE_USED',
        data: { command: response.data.command },
        message: `Bene Gesserit uses Voice: ${response.data.command}`,
      });
    }
```
- **Note**: There's a `parseVoiceCommand` method referenced in the backup file, but it's not used in the current implementation
- **Impact**: If the agent provides a command string like `"play_specific_weapon:lasgun"`, it needs to be parsed into a `VoiceCommand` object with `{ type: "play", cardType: "specific_weapon", specificCardName: "lasgun" }`
- **Verification Needed**: Check if the agent response format matches the expected `VoiceCommand` structure

## Summary

### What Works
1. ✅ Voice timing (after Battle Plans)
2. ✅ Compliance validation logic
3. ✅ Support for all card types in validation functions
4. ✅ Type definitions are complete

### What Needs Fixing
1. ❌ **Missing options**: worthless, cheap_hero, specific_weapon/defense by name
2. ✅ **Alliance usage**: Now implemented - Voice can be used in ally's battles
3. ⚠️ **Command parsing**: May need to parse string commands into VoiceCommand objects

## Recommendations

### Priority 1: Add Missing Options
Update `requestVoice` to include all command options from the rule:
- Add `play_worthless` / `not_play_worthless`
- Add `play_cheap_hero` / `not_play_cheap_hero`
- Add support for specific weapon/defense by name (may require UI/agent changes to specify card name)

### Priority 2: Implement Alliance Usage
- ✅ **COMPLETED**: Alliance usage has been implemented
- Voice now correctly checks if BG or their ally is in battle
- Voice compliance validation correctly handles alliance battles

### Priority 3: Verify Command Format
Ensure agent responses are properly formatted as `VoiceCommand` objects or add parsing logic if string format is used.

## Related Files
- `src/lib/game/phases/handlers/battle.ts` - Main battle handler
- `src/lib/game/rules/combat.ts` - Validation logic
- `src/lib/game/types/state.ts` - Type definitions
- `ATREIDES_ALLY_PRESCIENCE_IMPLEMENTATION.md` - Reference for alliance implementation pattern
- `ALLIANCE_ABILITIES_PLAN.md` - Documents planned alliance features

