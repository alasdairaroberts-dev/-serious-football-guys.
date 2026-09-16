# The Serious Football Guys Fantasy Football League

## Run locally
1. Install Node.js 18+
2. Open a terminal in this folder
3. Run: `npm start`
4. Visit: `http://localhost:3000`

## Automatic scoring
The server resolves roster names against Sleeper's NFL player directory and requests weekly player stats, then calculates each team's score.

The PDF explicitly says: no PPR and 4 points per passing TD. It does **not** specify every other classic-fantasy scoring value. Those unspecified values are centralized in `server.js` under `scoring` so the commissioner can confirm/change them.

Current provisional defaults:
- 1 point / 25 passing yards
- 4 / passing TD
- -2 / interception
- 1 / 10 rushing yards
- 6 / rushing TD
- 0 PPR
- 1 / 10 receiving yards
- 6 / receiving TD
- -2 / fumble lost

## Deployment
This is a small Node app and can be deployed to a Node-capable host. Set `SEASON=2026` if needed (2026 is already the default).

## Roster correction
The Wrecking Crew roster has been corrected to: QB Joe Burrow, WR Jaxon Smith-Njigba, TE Trey McBride, RB De'Von Achane.
