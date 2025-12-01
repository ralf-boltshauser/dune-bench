/**
 * Faction-Specific Agent Prompts
 *
 * Each faction has unique abilities, victory conditions, and strategic considerations.
 * These prompts help the AI agent understand how to play each faction effectively.
 */

import { Faction } from '../types';

// =============================================================================
// FACTION PROMPTS
// =============================================================================

const ATREIDES_PROMPT = `## Playing House Atreides

### Your Advantages
- **Prescience**: You can look at each Treachery Card before it is bid on
- **Battle Prediction**: You can ask your opponent one of these questions before battle:
  - What number will they dial?
  - What leader will they use?
  - What weapon or defense will they use?
- **Starting Position**: You start with 10 forces in Arrakeen (a stronghold with ornithopters)

### Strategic Priorities
1. **Use Prescience Wisely**: Know which cards are worth bidding on
2. **Control Arrakeen**: Your ornithopter access gives mobility advantage
3. **Gather Information**: Your prescience makes you valuable to allies
4. **Protect Your Leaders**: Your leaders (like Paul, Jessica) are valuable targets

### Victory Path
- Standard victory: Control 3 strongholds (or 4 with an ally)
- Your information advantage helps you know when to attack and when to defend
- Consider allying with Emperor (for spice) or Guild (for movement)`;

const BENE_GESSERIT_PROMPT = `## Playing the Bene Gesserit

### Your Advantages
- **Prediction**: At game start, you secretly predict which faction will win and on which turn
- **Voice**: In battle, you can force your opponent to play or not play a certain type of card
- **Spiritual Advisors**: You can coexist in strongholds with one other faction
- **Worthless Cards**: Some "worthless" cards are actually Karama cards for you

### Strategic Priorities
1. **Protect Your Prediction**: Manipulate the game to make your prediction come true
2. **Use Advisors**: Place advisors to gather information and position for flipping to fighters
3. **Voice in Battle**: Force opponents to waste weapons or leave themselves undefended
4. **Remain Subtle**: Don't appear threatening - you win by prediction, not conquest

### Victory Path
- **Prediction Victory**: If your predicted faction wins on your predicted turn, YOU win instead
- **Standard Victory**: Control 3 strongholds (difficult but possible)
- You play the long game - manipulate others toward your prediction`;

const EMPEROR_PROMPT = `## Playing the Padishah Emperor

### Your Advantages
- **Wealth**: You have the most spice (10 to start) and receive payment for all Treachery cards sold
- **Sardaukar**: Your elite forces (5 Sardaukar) are worth 2 normal troops in battle
- **Income**: Every card bought at auction gives you spice from other players

### Strategic Priorities
1. **Control the Economy**: You get richer as others buy cards
2. **Deploy Sardaukar Wisely**: They're expensive to revive - don't waste them
3. **Bribe and Deal**: Use your wealth to influence other players
4. **Maintain Presence**: Ship forces strategically to threaten multiple strongholds

### Victory Path
- Standard victory with your wealth advantage
- Consider early alliance with Guild (they ship for half price, you have money to spend)
- Your Sardaukar make you formidable in battle - pick fights you can win`;

const FREMEN_PROMPT = `## Playing the Fremen

### Your Advantages
- **Free Placement (Shipment)**: You CANNOT use normal shipment. Instead, use 'fremen_send_forces' to send forces from reserves to The Great Flat or any territory within 2 territories of it - COMPLETELY FREE (no spice cost)
- **Desert Power**: You can move 2 territories without ornithopters
- **Worm Riding**: When a sandworm appears, you can ride it to any sand territory
- **Storm Migration**: You can send forces into storm sectors with only half losses (rounded up)
- **Storm Immunity**: Your forces in the desert take reduced storm casualties (half)
- **Free Revival**: You revive 3 forces for free instead of 2
- **Battle Hardened**: Your forces ALWAYS count at full strength in battle, even without paying spice (in advanced rules)
- **Special Victory**: You can win if Guild isn't in the game and certain conditions are met

### Strategic Priorities
1. **Control the Desert**: The sand is your domain - dominate spice collection
2. **Use Free Placement**: Your 'fremen_send_forces' ability lets you deploy anywhere near Great Flat for FREE
3. **Use Sandworms**: Worm events are opportunities for you to strike anywhere
4. **Fedaykin Are Elite**: Your Fedaykin fight like Sardaukar - use them in key battles

### Shipment Phase Strategy
- **NEVER use 'ship_forces'** - that tool will fail for Fremen
- **ALWAYS use 'fremen_send_forces'** - it's completely free!
- Valid destinations: The Great Flat, Funeral Plain, The Greater Flat, Habbanya Erg, False Wall West, and territories within 2 of Great Flat
- You can use Storm Migration to send into storm sectors (half losses)

### Victory Path
- Standard victory: Your mobility lets you threaten multiple strongholds
- Special victory: If no Guild, you can win by controlling strongholds with Fremen characters
- Consider allying with Atreides (lore-accurate) or staying independent`;

const HARKONNEN_PROMPT = `## Playing House Harkonnen

### Your Advantages
- **Treachery**: You can hold up to 8 Treachery cards (double normal limit)
- **Traitors**: You start with ALL your traitor cards (others discard down to 1)
- **Capture**: When you kill a leader in battle, you can capture them for ransom
- **Starting Position**: 10 forces in Carthag (ornithopter access)

### Strategic Priorities
1. **Hoard Cards**: Accumulate treachery cards - knowledge is power
2. **Use Traitors**: With multiple traitors, you can devastate unprepared opponents
3. **Capture Leaders**: Holding enemy leaders gives you leverage and denies them strength
4. **Control Carthag**: Your ornithopter base - protect it

### Victory Path
- Standard victory through military dominance
- Your traitors can swing crucial battles - save them for when they matter most
- Your card advantage means you should have weapons/defenses when others don't
- Alliance with Emperor gives you spice for more cards`;

const SPACING_GUILD_PROMPT = `## Playing the Spacing Guild

### Your Advantages
- **Shipping Control**: You receive half the cost of all shipments to Dune
- **Half-Price Shipping**: Your own shipments cost half price
- **Intrusion**: You can place forces in any unoccupied stronghold without shipping
- **Special Victory**: If the game goes to turn 15, you win automatically

### Strategic Priorities
1. **Encourage Shipments**: More shipments = more income for you
2. **Use Intrusion**: Grab undefended strongholds at critical moments
3. **Don't Rush**: Time is on your side - a stalemate means you win
4. **Ship Forces Cheaply**: Your half-price shipping is a major advantage

### Victory Path
- **Default Victory**: If no one wins by strongholds after turn 15, Guild wins
- Standard victory is possible with your economic and shipping advantages
- Consider making the game last longer - chaos benefits you
- Alliance with Emperor creates an economic powerhouse`;

// =============================================================================
// PROMPT RETRIEVAL
// =============================================================================

const FACTION_PROMPTS: Record<Faction, string> = {
  [Faction.ATREIDES]: ATREIDES_PROMPT,
  [Faction.BENE_GESSERIT]: BENE_GESSERIT_PROMPT,
  [Faction.EMPEROR]: EMPEROR_PROMPT,
  [Faction.FREMEN]: FREMEN_PROMPT,
  [Faction.HARKONNEN]: HARKONNEN_PROMPT,
  [Faction.SPACING_GUILD]: SPACING_GUILD_PROMPT,
};

/**
 * Get the strategic prompt for a faction.
 */
export function getFactionPrompt(faction: Faction): string {
  return FACTION_PROMPTS[faction];
}

/**
 * Get all faction prompts (for debugging/reference).
 */
export function getAllFactionPrompts(): Record<Faction, string> {
  return { ...FACTION_PROMPTS };
}
