import { firebaseConfig } from "./firebase-config.js?v=20260923-4";

const scoreEntry = document.querySelector("#score-entry");
const scoreSummary = document.querySelector("#score-summary");
const scoreForm = document.querySelector("#score-form");
const scoreName = document.querySelector("#score-name");
const scoreFeedback = document.querySelector("#score-feedback");
const skipScore = document.querySelector("#skip-score");
const leaderboardState = document.querySelector("#leaderboard-state");
const leaderboardList = document.querySelector("#leaderboard-list");

const scoreLimits = {
  nameLength: 20,
  minimumMs: 1,
  maximumMs: 10000,
};

let addScore = null;
let currentRun = null;
let isSubmitting = false;

function isConfigured(config) {
  const requiredValues = [config.apiKey, config.authDomain, config.projectId, config.appId];

  return requiredValues.every(
    (value) =>
      typeof value === "string" &&
      value.length > 0 &&
      !value.startsWith("REPLACE_WITH_"),
  );
}

function setBoardState(message) {
  leaderboardState.hidden = false;
  leaderboardState.textContent = message;
  leaderboardList.hidden = true;
}

function modeLabel(mode) {
  return mode === "sportsman" ? "Sportsman" : "Pro";
}

function formatRelativeDate(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Just now";
  }

  const elapsedSeconds = Math.round((timestamp.toDate().getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(elapsedSeconds) < 60) {
    return formatter.format(elapsedSeconds, "second");
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (Math.abs(elapsedMinutes) < 60) {
    return formatter.format(elapsedMinutes, "minute");
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (Math.abs(elapsedHours) < 24) {
    return formatter.format(elapsedHours, "hour");
  }

  const elapsedDays = Math.round(elapsedHours / 24);
  if (Math.abs(elapsedDays) < 30) {
    return formatter.format(elapsedDays, "day");
  }

  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function createEntry(score, index) {
  const item = document.createElement("li");
  item.className = "leaderboard-entry";

  const rank = document.createElement("span");
  rank.className = "leaderboard-rank";
  rank.textContent = String(index + 1).padStart(2, "0");

  const name = document.createElement("span");
  name.className = "leaderboard-name";
  name.textContent = score.name;

  const meta = document.createElement("span");
  meta.className = "leaderboard-meta";
  meta.textContent = `${modeLabel(score.mode)} · ${formatRelativeDate(score.createdAt)}`;

  const time = document.createElement("span");
  time.className = "leaderboard-time";
  time.textContent = (score.reactionMs / 1000).toFixed(3);

  item.append(rank, name, meta, time);
  return item;
}

function renderScores(snapshot) {
  const entries = snapshot.docs
    .map((documentSnapshot) => documentSnapshot.data())
    .filter(
      (score) =>
        typeof score.name === "string" &&
        Number.isInteger(score.reactionMs) &&
        (score.mode === "pro" || score.mode === "sportsman"),
    );

  leaderboardList.replaceChildren(...entries.map(createEntry));

  if (entries.length === 0) {
    setBoardState("No times yet. Be the first racer on the board.");
    return;
  }

  leaderboardState.hidden = true;
  leaderboardList.hidden = false;
}

function savedName() {
  try {
    return window.localStorage.getItem("drhLeaderboardName") || "";
  } catch {
    return "";
  }
}

function rememberName(name) {
  try {
    window.localStorage.setItem("drhLeaderboardName", name);
  } catch {
    // A blocked local store should not prevent score submission.
  }
}

function showScorePrompt(run) {
  currentRun = run;
  scoreSummary.textContent = `${(run.reactionMs / 1000).toFixed(3)} seconds · ${modeLabel(run.mode)}`;
  scoreName.value = savedName();
  scoreFeedback.textContent = "";
  scoreFeedback.classList.remove("is-error");
  scoreEntry.hidden = false;
}

function hideScorePrompt() {
  currentRun = null;
  scoreEntry.hidden = true;
  scoreFeedback.textContent = "";
  scoreFeedback.classList.remove("is-error");
}

function setSubmitting(submitting) {
  isSubmitting = submitting;
  [...scoreForm.elements].forEach((element) => {
    element.disabled = submitting;
  });
}

async function initializeLeaderboard() {
  if (!isConfigured(firebaseConfig)) {
    setBoardState("Leaderboard connects after Firebase is configured.");
    return;
  }

  try {
    const firebaseVersion = "12.19.0";
    const [{ initializeApp }, firestore] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-firestore.js`),
    ]);
    const app = initializeApp(firebaseConfig);
    const database = firestore.getFirestore(app);
    const scores = firestore.collection(database, "practiceTreeScores");
    const fastestScores = firestore.query(
      scores,
      firestore.orderBy("reactionMs", "asc"),
      firestore.limit(20),
    );

    addScore = (score) =>
      firestore.addDoc(scores, {
        ...score,
        createdAt: firestore.serverTimestamp(),
      });

    firestore.onSnapshot(fastestScores, renderScores, () => {
      setBoardState("Leaderboard is unavailable right now. Try again later.");
    });
  } catch {
    setBoardState("Leaderboard is unavailable right now. Try again later.");
  }
}

document.addEventListener("practice-tree:clean-run", (event) => {
  if (!addScore || isSubmitting) {
    return;
  }

  showScorePrompt(event.detail);
});

scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentRun || !addScore || isSubmitting) {
    return;
  }

  const name = scoreName.value.trim();

  if (name.length < 1 || name.length > scoreLimits.nameLength) {
    scoreFeedback.textContent = `Enter a name using ${scoreLimits.nameLength} characters or fewer.`;
    scoreFeedback.classList.add("is-error");
    return;
  }

  if (
    currentRun.reactionMs < scoreLimits.minimumMs ||
    currentRun.reactionMs > scoreLimits.maximumMs
  ) {
    scoreFeedback.textContent = "This reaction time is outside the leaderboard range.";
    scoreFeedback.classList.add("is-error");
    return;
  }

  setSubmitting(true);
  scoreFeedback.textContent = "Submitting score.";
  scoreFeedback.classList.remove("is-error");

  try {
    await addScore({
      name,
      reactionMs: currentRun.reactionMs,
      mode: currentRun.mode,
    });
    rememberName(name);
    hideScorePrompt();
  } catch {
    scoreFeedback.textContent = "Score could not be submitted. Please try again.";
    scoreFeedback.classList.add("is-error");
  } finally {
    setSubmitting(false);
  }
});

skipScore.addEventListener("click", () => {
  if (!isSubmitting) {
    hideScorePrompt();
  }
});

initializeLeaderboard();
