# Spawn Phase Test Agents

Use these URLs to spawn agents for each phase. Each agent will:
1. Read `.agents-communication/phase-test-creation-guide.md`
2. Investigate their assigned phase
3. Create comprehensive test suite with log files

## Agent URLs

### Storm Phase
https://cursor.com/link/prompt?text=Read+.agents-communication/phase-test-creation-guide.md+and+handwritten-rules/1_storm.md.+Create+comprehensive+tests+for+the+STORM+phase.+Investigate+storm+movement%2C+player+positioning%2C+and+any+special+abilities.+Create+test+scenarios+that+force+difficult+situations+to+play+out.+Write+log+files+for+manual+review.

### Bidding Phase
https://cursor.com/link/prompt?text=Read+.agents-communication/phase-test-creation-guide.md+and+handwritten-rules/4_bidding.md.+Create+comprehensive+tests+for+the+BIDDING+phase.+Focus+on+Karama+cards+to+buy+treachery+cards+at+any+time%2C+multiple+factions+bidding%2C+and+faction+abilities.+Create+test+scenarios+that+force+difficult+situations+to+play+out.+Write+log+files+for+manual+review.

### Spice Blow Phase
https://cursor.com/link/prompt?text=Read+.agents-communication/phase-test-creation-guide.md+and+handwritten-rules/2_spice-blow.md.+Create+comprehensive+tests+for+the+SPICE_BLOW+phase.+Investigate+spice+blow+mechanics%2C+collection%2C+and+any+special+abilities.+Create+test+scenarios+that+force+difficult+situations+to+play+out.+Write+log+files+for+manual+review.

### Shipment Movement Phase
https://cursor.com/link/prompt?text=Read+.agents-communication/phase-test-creation-guide.md+and+handwritten-rules/6_shipment-movement.md.+Create+comprehensive+tests+for+the+SHIPMENT_MOVEMENT+phase.+Focus+on+extra+movement+cards%2C+Fremen+abilities%2C+and+complex+movement+scenarios.+Create+test+scenarios+that+force+difficult+situations+to+play+out.+Write+log+files+for+manual+review.

### Spice Collection Phase
https://cursor.com/link/prompt?text=Read+.agents-communication/phase-test-creation-guide.md+and+handwritten-rules/8_spice-collection.md.+Create+comprehensive+tests+for+the+SPICE_COLLECTION+phase.+Investigate+spice+collection+mechanics%2C+territory+spice%2C+and+any+special+abilities.+Create+test+scenarios+that+force+difficult+situations+to+play+out.+Write+log+files+for+manual+review.

### Revival Phase
https://cursor.com/link/prompt?text=Read+.agents-communication/phase-test-creation-guide.md+and+handwritten-rules/5_revival.md.+Create+comprehensive+tests+for+the+REVIVAL+phase.+Focus+on+leader+revival%2C+force+revival%2C+Fremen+Fedaykin%2C+and+special+abilities.+Create+test+scenarios+that+force+difficult+situations+to+play+out.+Write+log+files+for+manual+review.

### CHOAM Charity Phase
https://cursor.com/link/prompt?text=Read+.agents-communication/phase-test-creation-guide.md+and+handwritten-rules/3_choam.md.+Create+comprehensive+tests+for+the+CHOAM_CHARITY+phase.+Investigate+charity+mechanics%2C+spice+distribution%2C+and+any+special+abilities.+Create+test+scenarios+that+force+difficult+situations+to+play+out.+Write+log+files+for+manual+review.

### Mentat Pause Phase
https://cursor.com/link/prompt?text=Read+.agents-communication/phase-test-creation-guide.md+and+handwritten-rules/9_mentat-pause.md.+Create+comprehensive+tests+for+the+MENTAT_PAUSE+phase.+Investigate+mentat+pause+mechanics+and+any+special+abilities.+Create+test+scenarios+that+force+difficult+situations+to+play+out.+Write+log+files+for+manual+review.

## Instructions for User

1. Open each URL in your browser to spawn an agent
2. Each agent will work independently
3. Agents will create:
   - Investigation documents in `research/{phase}/`
   - Test infrastructure in `src/lib/game/phase-tests/{phase}/`
   - Log files in `test-logs/{phase}/`
   - Completion report in `research/{phase}/completion-report.md`
4. Review the log files manually to validate correctness
5. Check completion reports to see what each agent accomplished

## What Agents Will Report

Each agent will create a `research/{phase}/completion-report.md` file that includes:
- Status (Complete/Partial/Blocked)
- What was created
- Test scenarios implemented
- Issues encountered
- Questions or help needed
- Validation notes

This allows you to see at a glance what each agent accomplished and what might need follow-up.

