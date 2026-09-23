const startButton = document.querySelector("#start-tree");
const launchButton = document.querySelector("#launch");
const resetButton = document.querySelector("#reset-tree");
const reactionTime = document.querySelector("#reaction-time");
const statusMessage = document.querySelector("#tree-status");
const modeInputs = [...document.querySelectorAll('input[name="tree-mode"]')];

let phase = "idle";
let greenAt = null;
let scheduledGreenAt = null;
let timers = [];

function lamps(name) {
  return document.querySelectorAll(`[data-lamp="${name}"]`);
}

function setLamp(name, isOn) {
  lamps(name).forEach((lamp) => lamp.classList.toggle("is-on", isOn));
}

function clearTimers() {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
}

function schedule(callback, delay) {
  timers.push(window.setTimeout(callback, delay));
}

function resetTree() {
  clearTimers();
  phase = "idle";
  greenAt = null;
  scheduledGreenAt = null;

  ["amber-1", "amber-2", "amber-3", "green", "red"].forEach((name) => setLamp(name, false));
  reactionTime.value = "Ready";
  reactionTime.classList.remove("red-light");
  statusMessage.textContent = "Choose a mode and start the tree.";
  startButton.disabled = false;
  startButton.textContent = "Start tree";
  launchButton.disabled = true;
  modeInputs.forEach((input) => {
    input.disabled = false;
  });
}

function showGreen() {
  if (phase !== "running") {
    return;
  }

  ["amber-1", "amber-2", "amber-3"].forEach((name) => setLamp(name, false));
  setLamp("green", true);
  greenAt = performance.now();
  statusMessage.textContent = "Green! Launch now.";
}

function finishRun() {
  clearTimers();
  phase = "finished";
  launchButton.disabled = true;
  startButton.disabled = false;
  startButton.textContent = "Go again";
  modeInputs.forEach((input) => {
    input.disabled = false;
  });
}

function launch() {
  if (phase !== "running") {
    return;
  }

  const launchedAt = performance.now();

  if (greenAt === null) {
    const earlyBy = Math.max(0, scheduledGreenAt - launchedAt);
    setLamp("red", true);
    reactionTime.value = `-${(earlyBy / 1000).toFixed(4)}`;
    reactionTime.classList.add("red-light");
    statusMessage.textContent = `Red light. You left ${(earlyBy / 1000).toFixed(3)} seconds early.`;
  } else {
    const elapsed = (launchedAt - greenAt) / 1000;
    reactionTime.value = elapsed.toFixed(4);
    statusMessage.textContent = `Your reaction time is ${elapsed.toFixed(3)} seconds.`;
  }

  finishRun();
}

function startRun() {
  resetTree();
  phase = "running";
  startButton.disabled = true;
  launchButton.disabled = false;
  modeInputs.forEach((input) => {
    input.disabled = true;
  });

  const mode = document.querySelector('input[name="tree-mode"]:checked').value;
  const randomDelay = 700 + Math.random() * 1100;
  const amberDuration = mode === "pro" ? 400 : 1500;
  scheduledGreenAt = performance.now() + randomDelay + amberDuration;
  statusMessage.textContent = "Staged. Hold steady…";

  if (mode === "pro") {
    schedule(() => {
      if (phase !== "running") return;
      ["amber-1", "amber-2", "amber-3"].forEach((name) => setLamp(name, true));
      statusMessage.textContent = "Ambers!";
    }, randomDelay);
    schedule(showGreen, randomDelay + amberDuration);
    return;
  }

  ["amber-1", "amber-2", "amber-3"].forEach((name, index) => {
    schedule(() => {
      if (phase !== "running") return;
      setLamp(name, true);
      statusMessage.textContent = `Amber ${index + 1}…`;
    }, randomDelay + index * 500);
  });
  schedule(showGreen, randomDelay + amberDuration);
}

startButton.addEventListener("click", startRun);
launchButton.addEventListener("click", launch);
resetButton.addEventListener("click", resetTree);

document.addEventListener("keydown", (event) => {
  if (
    event.code !== "Space" ||
    event.repeat ||
    event.target instanceof HTMLButtonElement ||
    event.target instanceof HTMLInputElement
  ) {
    return;
  }

  if (phase === "running") {
    event.preventDefault();
    launch();
  }
});

resetTree();
