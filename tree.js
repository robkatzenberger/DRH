const treeControl = document.querySelector("#tree-control");
const reactionTime = document.querySelector("#reaction-time");
const statusMessage = document.querySelector("#tree-status");
const modeInputs = [...document.querySelectorAll('input[name="tree-mode"]')];

let phase = "idle";
let greenAt = null;
let scheduledGreenAt = null;
let timers = [];
let activePointerId = null;
let spaceHeld = false;

const stageDelay = 250;

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

  ["prestage", "stage", "amber-1", "amber-2", "amber-3", "green", "red"].forEach((name) =>
    setLamp(name, false),
  );
  reactionTime.value = "Ready";
  reactionTime.classList.remove("red-light");
  statusMessage.textContent = "Choose a mode, then press and hold.";
  treeControl.textContent = "Press and hold";
  treeControl.classList.remove("is-held");
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
  statusMessage.textContent = "Green! Release now.";
}

function finishRun() {
  clearTimers();
  phase = "finished";
  treeControl.textContent = "Hold to go again";
  treeControl.classList.remove("is-held");
  modeInputs.forEach((input) => {
    input.disabled = false;
  });
}

function launch() {
  if (phase !== "running") {
    return;
  }

  const launchedAt = performance.now();
  setLamp("prestage", false);
  setLamp("stage", false);

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
  if (phase !== "staged") {
    return;
  }

  phase = "running";

  const mode = document.querySelector('input[name="tree-mode"]:checked').value;
  const randomDelay = 700 + Math.random() * 1100;
  const amberDuration = mode === "pro" ? 400 : 1500;
  scheduledGreenAt = performance.now() + randomDelay + amberDuration;
  statusMessage.textContent = "Staged. Hold steady.";

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
      statusMessage.textContent = `Amber ${index + 1}.`;
    }, randomDelay + index * 500);
  });
  schedule(showGreen, randomDelay + amberDuration);
}

function stageTree() {
  if (phase !== "idle" && phase !== "finished") {
    return;
  }

  resetTree();
  phase = "staged";
  setLamp("prestage", true);
  setLamp("stage", true);
  treeControl.textContent = "Release to launch";
  treeControl.classList.add("is-held");
  statusMessage.textContent = "Staged. Keep holding.";
  modeInputs.forEach((input) => {
    input.disabled = true;
  });
  schedule(startRun, stageDelay);
}

function releaseTree() {
  if (phase === "staged") {
    resetTree();
    return;
  }

  if (phase === "running") {
    launch();
  }
}

treeControl.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
    return;
  }

  event.preventDefault();
  activePointerId = event.pointerId;
  treeControl.setPointerCapture(event.pointerId);
  stageTree();
});

treeControl.addEventListener("pointerup", (event) => {
  if (event.pointerId !== activePointerId) {
    return;
  }

  event.preventDefault();
  activePointerId = null;
  releaseTree();
});

treeControl.addEventListener("pointercancel", (event) => {
  if (event.pointerId !== activePointerId) {
    return;
  }

  activePointerId = null;
  resetTree();
});

treeControl.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.addEventListener("keydown", (event) => {
  if (
    event.code !== "Space" ||
    event.repeat ||
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  event.preventDefault();
  spaceHeld = true;
  stageTree();
});

document.addEventListener("keyup", (event) => {
  if (event.code !== "Space" || !spaceHeld) {
    return;
  }

  event.preventDefault();
  spaceHeld = false;
  releaseTree();
});

resetTree();
