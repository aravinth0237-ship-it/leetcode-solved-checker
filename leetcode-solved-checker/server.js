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
    return res.status(400).json({
      error: "Enter a valid LeetCode username or profile URL."
    });
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

        submissionCalendar
      }
    }
  `;

  try {
    const response = await fetch(
      "https://leetcode.com/graphql/",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Referer": `https://leetcode.com/u/${encodeURIComponent(username)}/`,
          "Origin": "https://leetcode.com"
        },

        body: JSON.stringify({
          query,
          variables: { username }
        })
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: `LeetCode returned HTTP ${response.status}.`
      });
    }

    const payload = await response.json();

    if (payload.errors?.length) {
      return res.status(502).json({
        error:
          payload.errors[0].message ||
          "LeetCode API error."
      });
    }

    const user = payload.data?.matchedUser;

    if (!user) {
      return res.status(404).json({
        error:
          "LeetCode profile not found or not public."
      });
    }

    /* -------------------------
       TOTAL SOLVED
    ------------------------- */

    const stats =
      user.submitStatsGlobal?.acSubmissionNum || [];

    const solved =
      Object.fromEntries(
        stats.map(x => [
          x.difficulty.toLowerCase(),
          x.count
        ])
      );

    /* -------------------------
       PAST 24 HOURS
    ------------------------- */

    let past24Hours = 0;

    try {

      const calendar =
        JSON.parse(
          user.submissionCalendar || "{}"
        );

      const now =
        Math.floor(Date.now() / 1000);

      const twentyFourHoursAgo =
        now - (24 * 60 * 60);

      /*
        LeetCode submissionCalendar stores
        submission counts by timestamp/day.

        We count the current and previous
        calendar periods that fall inside
        the last 24 hours.
      */

      for (const [timestamp, count] of Object.entries(calendar)) {

        const time = Number(timestamp);

        if (
          time >= twentyFourHoursAgo &&
          time <= now
        ) {
          past24Hours += Number(count) || 0;
        }
      }

    } catch (calendarError) {

      console.log(
        "Submission calendar unavailable:",
        calendarError.message
      );

      past24Hours = 0;
    }

    res.json({

      username: user.username,

      realName:
        user.profile?.realName || "",

      avatar:
        user.profile?.userAvatar || "",

      country:
        user.profile?.countryName || "",

      ranking:
        user.profile?.ranking ?? null,

      solved: {

        total:
          solved.all ?? 0,

        easy:
          solved.easy ?? 0,

        medium:
          solved.medium ?? 0,

        hard:
          solved.hard ?? 0
      },

      past24Hours,

      profileUrl:
        `https://leetcode.com/u/${encodeURIComponent(
          user.username
        )}/`,

      checkedAt:
        new Date().toISOString()
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Could not connect to LeetCode. Try again."
    });
  }
});

app.use((req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

app.listen(
  PORT,
  () =>
    console.log(
      `LeetCode checker running on http://localhost:${PORT}`
    )
);
