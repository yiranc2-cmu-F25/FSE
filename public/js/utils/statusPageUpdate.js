const STATUS_STYLES = {
  OK: {
    color: "bg-green-100",
    textColor: "text-green-700",
    icon: "/images/icons/status/ok-status-icon.svg",
  },
  HELP: {
    color: "bg-yellow-100",
    textColor: "text-yellow-700",
    icon: "/images/icons/status/help-status-icon.svg",
  },
  EMERGENCY: {
    color: "bg-red-100",
    textColor: "text-red-700",
    icon: "/images/icons/status/emergency-status-icon.svg",
  },
  UNDEFINED: {
    color: "bg-gray-200",
    textColor: "text-gray-800",
    icon: "/images/icons/status/undefined-status-icon-black.svg",
  },
};


//status-color , status-icon
export function statusUpdate(status) {
  const style = STATUS_STYLES[status] || STATUS_STYLES["UNDEFINED"];
  document.querySelectorAll("#status-color, #partial-status-color").forEach((el) => {
    el.classList.add(style.color, style.textColor);
  });

  document.querySelectorAll("#status-icon, #partial-status-icon").forEach((el) => {
    el.src = style.icon;
  });
}