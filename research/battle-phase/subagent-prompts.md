# Battle Phase Rule Verification - Subagent Prompts

Use these URLs to spawn subagents that will verify each battle rule implementation.

## Core Battle Rules

### Rule 1: Battle Determination
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Battle+Determination+rule+from+handwritten-rules%2Fbattle.md+lines+3-6.+Check+if+the+codebase+correctly+identifies+territories+with+multiple+factions+and+ensures+battles+occur+between+them.+Also+verify+storm+separation+logic+and+Polar+Sink+neutral+zone.+Write+your+findings+to+research%2Fbattle-phase%2Frule-01-battle-determination.md
```

### Rule 2: Aggressor Order
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+the+Aggressor+rule+from+handwritten-rules%2Fbattle.md+lines+7-8.+Check+if+the+First+Player+is+named+Aggressor+and+chooses+battle+order%2C+then+players+in+Storm+Order+become+Aggressor.+Also+verify+multiple+battles+handling+when+three+or+more+players+are+in+the+same+territory.+Write+your+findings+to+research%2Fbattle-phase%2Frule-02-aggressor.md
```

### Rule 3: Battle Plan
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Battle+Plan+requirements+from+handwritten-rules%2Fbattle.md+lines+9-10.+Check+if+battle+plans+are+secretly+formulated%2C+must+include+forces+dialed%2C+must+include+leader+or+Cheap+Hero+when+possible%2C+and+may+include+Treachery+Cards.+Write+your+findings+to+research%2Fbattle-phase%2Frule-03-battle-plan.md
```

### Rule 4: Battle Wheel
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Battle+Wheel+mechanics+from+handwritten-rules%2Fbattle.md+line+11.+Check+if+players+secretly+dial+a+number+from+zero+to+their+forces+in+the+territory%2C+and+if+both+players+lose+the+number+of+forces+dialed.+Write+your+findings+to+research%2Fbattle-phase%2Frule-04-battle-wheel.md
```

### Rule 5: Leaders
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Leader+rules+from+handwritten-rules%2Fbattle.md+lines+12-15.+Check+if+one+Leader+Disc+is+selected%2C+Cheap+Hero+may+be+played+in+lieu%2C+Dedicated+Leader+rule+allows+leaders+to+fight+multiple+times+in+same+territory+but+not+multiple+territories%2C+and+Leader+Announcement+requirement.+Also+verify+NO+TREACHERY+rule+when+no+leader+available.+Write+your+findings+to+research%2Fbattle-phase%2Frule-05-leaders.md
```

### Rule 6: Treachery Cards
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Treachery+Cards+in+battle+from+handwritten-rules%2Fbattle.md+line+16.+Check+if+players+with+leader+or+Cheap+Hero+may+play+Weapon%2C+Defense%2C+or+both%2C+and+may+choose+not+to+play+them.+Write+your+findings+to+research%2Fbattle-phase%2Frule-06-treachery-cards.md
```

### Rule 7: Revealing Wheels
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Revealing+Wheels+from+handwritten-rules%2Fbattle.md+line+17.+Check+if+Battle+Plans+are+revealed+simultaneously+when+both+players+are+ready.+Write+your+findings+to+research%2Fbattle-phase%2Frule-07-revealing-wheels.md
```

### Rule 8: Battle Resolution
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Battle+Resolution+from+handwritten-rules%2Fbattle.md+lines+18-19.+Check+if+winner+is+determined+by+higher+total+of+forces+dialed+plus+leader+strength%2C+and+if+Aggressor+wins+ties.+Write+your+findings+to+research%2Fbattle-phase%2Frule-08-battle-resolution.md
```

### Rule 9: Weapons
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Weapon+and+Defense+interaction+from+handwritten-rules%2Fbattle.md+lines+20-21.+Check+if+weapons+kill+leaders+unless+proper+defense+is+played%2C+if+leader+strength+is+not+added+when+leader+is+killed+or+affected+by+weapon%2C+and+if+some+weapons+make+leader+strength+nonapplicable+without+killing.+Write+your+findings+to+research%2Fbattle-phase%2Frule-09-weapons.md
```

### Rule 10: Killed Leaders
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Killed+Leaders+from+handwritten-rules%2Fbattle.md+line+22.+Check+if+killed+leaders+are+placed+face+up+in+Tleilaxu+Tanks+and+if+winner+receives+their+value+in+spice+from+Spice+Bank+including+their+own+leader+if+killed.+Write+your+findings+to+research%2Fbattle-phase%2Frule-10-killed-leaders.md
```

### Rule 11: Surviving Leaders
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Surviving+Leaders+from+handwritten-rules%2Fbattle.md+line+23.+Check+if+surviving+leaders+remain+in+the+Territory+where+they+were+used%2C+are+not+part+of+Leader+Pool+until+Leader+Return%2C+and+are+not+killed+by+game+effects+while+there.+Write+your+findings+to+research%2Fbattle-phase%2Frule-11-surviving-leaders.md
```

### Rule 12: Losing
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Losing+consequences+from+handwritten-rules%2Fbattle.md+line+24.+Check+if+losing+player+loses+all+Forces+in+Territory+to+Tleilaxu+Tanks%2C+must+discard+every+Treachery+Card+used%2C+and+does+NOT+lose+their+leader+as+result+of+losing.+Write+your+findings+to+research%2Fbattle-phase%2Frule-12-losing.md
```

### Rule 13: Winning
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Winning+consequences+from+handwritten-rules%2Fbattle.md+line+25.+Check+if+winning+player+loses+only+the+number+of+Forces+dialed+on+Battle+Wheel+to+Tleilaxu+Tanks%2C+may+discard+any+cards+played%2C+and+may+keep+cards+that+do+not+say+Discard+after+use.+Write+your+findings+to+research%2Fbattle-phase%2Frule-13-winning.md
```

### Rule 14: Traitors
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Traitor+mechanics+from+handwritten-rules%2Fbattle.md+lines+26-29.+Check+if+traitor+can+be+called+against+any+Active+Leader%2C+if+revealer+wins+battle+immediately+and+loses+nothing%2C+if+leader+returns+to+pool%2C+if+traitorous+leader+goes+to+Tanks+and+spice+is+paid%2C+if+one-time+abilities+are+not+used%2C+if+loser+loses+all+Forces+and+discards+cards%2C+and+if+TWO+TRAITORS+scenario+is+handled+correctly.+Write+your+findings+to+research%2Fbattle-phase%2Frule-14-traitors.md
```

### Rule 15: Leader Return
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Leader+Return+from+handwritten-rules%2Fbattle.md+line+30.+Check+if+after+all+battles+players+collect+leaders+used+in+battle+still+in+Territories+and+add+them+to+Leader+Pool.+Write+your+findings+to+research%2Fbattle-phase%2Frule-15-leader-return.md
```

## Advanced Game Rules

### Rule 16: Spice Dialing
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Spice+Dialing+from+handwritten-rules%2Fbattle.md+lines+40-46.+Check+if+forces+are+valued+at+full+strength+if+1+spice+is+paid%2C+half+strength+if+not+spiced%2C+if+spice+is+added+to+Battle+Wheel%2C+if+all+spice+is+placed+in+Spice+Bank%2C+and+if+winner+keeps+spice+when+traitor+is+played.+Write+your+findings+to+research%2Fbattle-phase%2Frule-16-spice-dialing.md
```

## Faction Battle Abilities

### Rule 17: Atreides Prescience
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Atreides+Prescience+ability+from+handwritten-rules%2Fbattle.md+line+57.+Check+if+before+Battle+Wheel+before+any+elements+are+determined%2C+Atreides+may+force+opponent+to+reveal+leader%2C+weapon%2C+defense%2C+or+number+dialed.+If+asking+about+weapon%2Fdefense+and+opponent+says+not+playing%2C+cannot+ask+different+element.+Also+verify+alliance+usage.+Write+your+findings+to+research%2Fbattle-phase%2Frule-17-atreides-prescience.md
```

### Rule 18: Atreides Kwisatz Haderach
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Atreides+Kwisatz+Haderach+from+handwritten-rules%2Fbattle.md+lines+59-64.+Check+if+KH+starts+inactive%2C+becomes+active+after+7+or+more+Force+losses+in+battle%2C+adds+%2B2+to+leader+strength+once+per+turn%2C+does+not+add+if+leader+killed%2C+prevents+traitor+when+accompanying+leader%2C+can+only+be+killed+by+lasgun%2Fshield+explosion%2C+must+be+revived+when+killed%2C+and+does+not+prevent+leader+revival.+Write+your+findings+to+research%2Fbattle-phase%2Frule-18-atreides-kh.md
```

### Rule 19: Bene Gesserit Voice
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Bene+Gesserit+Voice+ability+from+handwritten-rules%2Fbattle.md+line+72.+Check+if+after+Battle+Plans+BG+may+command+opponent+to+play+or+not+play+poison+weapon%2C+projectile+weapon%2C+poison+defense%2C+projectile+defense%2C+worthless+card%2C+Cheap+Hero%2C+or+specific+special+weapon%2Fdefense+by+name.+Opponent+must+comply.+Also+verify+alliance+usage.+Write+your+findings+to+research%2Fbattle-phase%2Frule-19-bg-voice.md
```

### Rule 20: Emperor Sardaukar
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Emperor+Sardaukar+elite+forces+from+handwritten-rules%2Fbattle.md+lines+109-112.+Check+if+starred+Forces+are+worth+two+normal+Forces+in+battle+and+losses+against+all+opponents+except+Fremen%2C+worth+just+one+Force+against+Fremen%2C+treated+as+one+Force+in+revival%2C+and+only+one+Sardaukar+can+be+revived+per+Turn.+Write+your+findings+to+research%2Fbattle-phase%2Frule-20-emperor-sardaukar.md
```

### Rule 21: Fremen Fedaykin
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Fremen+Fedaykin+elite+forces+from+handwritten-rules%2Fbattle.md+lines+135-137.+Check+if+starred+Forces+are+worth+two+normal+Forces+in+battle+and+losses%2C+treated+as+one+Force+in+revival%2C+and+only+one+Fedaykin+can+be+revived+per+Turn.+Write+your+findings+to+research%2Fbattle-phase%2Frule-21-fremen-fedaykin.md
```

### Rule 22: Fremen Battle Hardened
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Fremen+Battle+Hardened+ability+from+handwritten-rules%2Fbattle.md+line+138.+Check+if+Fremen+Forces+do+not+require+spice+to+count+at+full+strength+in+battles.+Write+your+findings+to+research%2Fbattle-phase%2Frule-22-fremen-battle-hardened.md
```

### Rule 23: Harkonnen Captured Leaders
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Harkonnen+Captured+Leaders+from+handwritten-rules%2Fbattle.md+lines+150-156.+Check+if+after+winning+battle+Harkonnen+randomly+selects+1+Active+Leader+from+loser+and+may+KILL+or+CAPTURE.+KILL+places+leader+face+down+in+Tanks+for+2+spice.+CAPTURE+adds+leader+to+Harkonnen+Active+Leader+Pool%2C+returns+to+original+owner+after+use+if+not+killed.+PRISON+BREAK+returns+all+captured+leaders+when+all+Harkonnen+leaders+killed.+Killed+captured+leaders+go+to+original+faction+Tanks.+Captured+leaders+can+be+called+traitor.+Write+your+findings+to+research%2Fbattle-phase%2Frule-23-harkonnen-captured-leaders.md
```

## Special Cases

### Rule 24: Storm Separation
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Storm+Separation+from+handwritten-rules%2Fbattle.md+line+4.+Check+if+players+cannot+battle+if+their+Forces+are+separated+by+a+Sector+in+storm%2C+but+can+remain+in+same+Territory+at+end+of+Phase.+Write+your+findings+to+research%2Fbattle-phase%2Frule-24-storm-separation.md
```

### Rule 25: Polar Sink Neutral Zone
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Polar+Sink+Neutral+Zone+from+handwritten-rules%2Fbattle.md+line+6.+Check+if+players+cannot+battle+in+the+Polar+Sink+as+it+is+a+safe+haven+for+everyone.+Write+your+findings+to+research%2Fbattle-phase%2Frule-25-polar-sink.md
```

### Rule 26: Battling Blind
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Battling+Blind+from+handwritten-rules%2Fbattle.md+line+5.+Check+if+whenever+two+or+more+players+Forces+are+in+same+Territory+and+same+Sector+under+storm%2C+players+still+battle.+Write+your+findings+to+research%2Fbattle-phase%2Frule-26-battling-blind.md
```

### Rule 27: Multiple Battles
```
https://cursor.com/link/prompt?text=Verify+the+implementation+of+Multiple+Battles+from+handwritten-rules%2Fbattle.md+line+8.+Check+if+when+three+or+more+players+are+in+same+Territory%2C+the+Aggressor+picks+who+they+will+battle+first%2C+second%2C+etc.+for+as+long+as+they+have+Forces+in+that+Territory.+Write+your+findings+to+research%2Fbattle-phase%2Frule-27-multiple-battles.md
```

