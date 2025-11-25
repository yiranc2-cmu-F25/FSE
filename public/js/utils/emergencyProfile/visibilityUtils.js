export function getVisibilitySetting(isChecked) {
  return isChecked ? "helpOrOk" : "emergencyOnly";
}

export function isVisibilityOkOrHelp(visibility) {
  return visibility === "helpOrOk" || visibility === "okOrHelp" || visibility === "OK_OR_HELP";
}

