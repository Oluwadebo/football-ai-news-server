// src/config/automationState.js
let automationEnabled = true;

function getAutomation() {
  return automationEnabled;
}

function setAutomation(enabled) {
  const newState = !!enabled;
  if (newState !== automationEnabled) {
    automationEnabled = newState;
    console.log(
      `[AutomationState] Automation changed to: ${newState ? "ENABLED" : "DISABLED"}`,
    );
  }
}

module.exports = {
  getAutomation,
  setAutomation,
};
