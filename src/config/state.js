// src/config/automationState.js
let automationEnabled = true;

function getAutomation() {
  return automationEnabled;
}

function setAutomation(enabled) {
  automationEnabled = !!enabled;
  console.log(`[AutomationState] Automation set to: ${enabled ? "ON" : "OFF"}`);
}

module.exports = {
  getAutomation,
  setAutomation,
};
