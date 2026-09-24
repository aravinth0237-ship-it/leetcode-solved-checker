const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

function cleanUsername(input) {
  const value = String(input || "").trim();
  const match = value.match(/leetcode\.com\/u\/([^/?#]+)/i);
  return (match ? match[1] : value).replace(/^@/, "").trim();
}

app.get("/api/profile", async (req, res) => {
  const username = cleanUsername(req.query.username);

  if (!username || !/^[A-Za-z0-9_-]{1,50}$/.test(username)) {
    return res.status(400).json({ error: "Enter a valid LeetCode username or profile URL." });
  }

  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          countryName
          ranking
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": `https://leetcode.com/u/${encodeURIComponent(username)}/`,
        "Origin": "https://leetcode.com"
      },
      body: JSON.stringify({ query, variables: { username } })
    });

    if (!response.ok) {
      return res.status(502).json({ error: `LeetCode returned HTTP ${response.status}.` });
    }

    const payload = await response.json();

    if (payload.errors?.length) {
      return res.status(502).json({ error: payload.errors[0].message || "LeetCode API error." });
    }

    const user = payload.data?.matchedUser;
    if (!user) {
      return res.status(404).json({ error: "LeetCode profile not found or not public." });
    }

    const stats = user.submitStatsGlobal?.acSubmissionNum || [];
    const solved = Object.fromEntries(stats.map(x => [x.difficulty.toLowerCase(), x.count]));

    res.json({
      username: user.username,
      realName: user.profile?.realName || "",
      avatar: user.profile?.userAvatar || "",
      country: user.profile?.countryName || "",
      ranking: user.profile?.ranking ?? null,
      solved: {
        total: solved.all ?? 0,
        easy: solved.easy ?? 0,
        medium: solved.medium ?? 0,
        hard: solved.hard ?? 0
      },
      profileUrl: `https://leetcode.com/u/${encodeURIComponent(user.username)}/`,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not connect to LeetCode. Try again." });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`LeetCode checker running on http://localhost:${PORT}`));
