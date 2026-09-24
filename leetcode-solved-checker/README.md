# LeetCode Solved Checker

A small website that accepts a LeetCode profile URL or username and displays total solved problems plus Easy/Medium/Hard counts.

## Run locally
1. Install Node.js 18+.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000

The server requests public profile data from LeetCode's GraphQL endpoint so the browser does not depend on CORS access directly.
