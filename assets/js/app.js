"use strict";

/* ------------------------------------------------------------------
 * MediTrust – client-side demo portal for patients and doctors.
 * All data is mocked and persisted in localStorage only.
 * ------------------------------------------------------------------ */

const loginPage = document.getElementById("loginPage");
const appShell = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const chatWindow = document.getElementById("chatWindow");
const chatToggle = document.getElementById("chatToggle");

function setChat(open) {
  chatWindow.classList.toggle("open", open);
  chatToggle.setAttribute("aria-expanded", String(open));
  chatToggle.classList.toggle("is-open", open);
  if (open) document.getElementById("chatText").focus();
}
const loginError = document.getElementById("loginError");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const roleButtons = document.querySelectorAll("[data-login-role]");
let selectedRole = "patient";
let currentRole = null;
let currentDoctorId = "levi";
const doctorLoginMap = {
  doctor: "levi",
  levi: "levi",
  cohen: "cohen",
  friedman: "friedman"
};

const panels = document.querySelectorAll("[data-panel]");
const navButtons = document.querySelectorAll("[data-view]");
const toast = document.getElementById("toast");
const notificationPanel = document.getElementById("notificationPanel");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let toastTimer = null;

/** Escape user-provided text before injecting it into HTML templates. */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

/** YYYY-MM-DD in the user's local timezone (toISOString() is UTC and can shift the day). */
function toLocalIso(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / blocked) – keep working in memory */
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function renderGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const part = hour < 5 ? "לילה טוב" : hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : hour < 21 ? "ערב טוב" : "לילה טוב";
  const dateText = now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  const pill = document.getElementById("greetingPill");
  if (pill) pill.textContent = `${part}, דניאל · ${dateText}`;
}

function celebrate() {
  if (prefersReducedMotion.matches) return;
  const colors = ["#0f8b8d", "#1da36f", "#d98a16", "#2477bd", "#e45f45"];
  for (let i = 0; i < 22; i += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti";
    piece.style.right = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 180}ms`;
    document.body.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1200);
  }
}

function configureRoleNavigation(role) {
  document.querySelectorAll("[data-role-nav]").forEach((button) => {
    button.classList.toggle("hidden", button.dataset.roleNav !== role);
  });
  document.querySelector(".sidebar-footer .status-row strong").textContent = role === "doctor" ? "רופא" : "מטופל";
}

function showView(view) {
  if (currentRole === "patient" && view === "doctor") return;
  if (currentRole === "doctor" && view !== "doctor") return;

  const patientSectionMap = {
    patient: "home",
    patientHealth: "health"
  };
  const panelView = patientSectionMap[view] ? "patient" : view;
  appShell.dataset.patientSection = patientSectionMap[view] || "";

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === panelView || panel.dataset.panel === view);
  });
  document.querySelectorAll(".nav button").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
}

function unlockApp(role) {
  currentRole = role;
  loginPage.classList.add("hidden");
  appShell.classList.remove("locked");
  configureRoleNavigation(role);
  showView(role === "doctor" ? "doctor" : "patient");
  if (role === "doctor") renderDoctorDashboard();
  document.getElementById("searchInput").placeholder = role === "doctor"
    ? "חיפוש מטופל או סיבת ביקור בלו״ז…"
    : "חיפוש רופא, התמחות, תור או מדד…";
  const doctorName = doctorSchedules[currentDoctorId]?.name || "ד״ר לוי";
  showToast(role === "doctor" ? `ברוך הבא, ${doctorName}` : "ברוך הבא, דניאל");
}

roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRole = button.dataset.loginRole;
    roleButtons.forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    usernameInput.value = selectedRole;
    passwordInput.value = "1234";
    loginError.classList.remove("show");
  });
});

document.querySelectorAll("[data-demo-user]").forEach((button) => {
  button.addEventListener("click", () => {
    const user = button.dataset.demoUser;
    selectedRole = user === "patient" ? "patient" : "doctor";
    usernameInput.value = user;
    passwordInput.value = "1234";
    roleButtons.forEach((item) => {
      item.classList.toggle("active", item.dataset.loginRole === selectedRole);
      item.setAttribute("aria-pressed", String(item.dataset.loginRole === selectedRole));
    });
    loginError.classList.remove("show");
  });
});

document.getElementById("togglePassword").addEventListener("click", (event) => {
  const visible = passwordInput.type === "text";
  passwordInput.type = visible ? "password" : "text";
  event.currentTarget.textContent = visible ? "הצגה" : "הסתרה";
  event.currentTarget.setAttribute("aria-label", visible ? "הצגת סיסמה" : "הסתרת סיסמה");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();
  const validPatient = selectedRole === "patient" && username === "patient" && password === "1234";
  const validDoctor = selectedRole === "doctor" && Boolean(doctorLoginMap[username]) && password === "1234";

  if (!validPatient && !validDoctor) {
    loginError.classList.add("show");
    return;
  }

  loginError.classList.remove("show");
  if (validDoctor) currentDoctorId = doctorLoginMap[username];
  unlockApp(selectedRole);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  currentRole = null;
  appShell.classList.add("locked");
  loginPage.classList.remove("hidden");
  loginError.classList.remove("show");
  setChat(false);
  showToast("התנתקת בהצלחה");
  window.scrollTo({ top: 0 });
});

const themeToggle = document.getElementById("themeToggle");
const themeStorageKey = "meditrustTheme";

function applyTheme(dark, { announce = false, persist = false } = {}) {
  document.body.classList.toggle("dark-mode", dark);
  document.documentElement.classList.remove("dark-mode-pending");
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.querySelector("span").textContent = dark ? "מצב בהיר" : "מצב כהה";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0f1720" : "#0f8b8d");
  if (persist) {
    try { localStorage.setItem(themeStorageKey, dark ? "dark" : "light"); } catch { /* ignore */ }
  }
  if (announce) showToast(dark ? "מצב כהה הופעל" : "מצב בהיר הופעל");
}

applyTheme(document.documentElement.classList.contains("dark-mode-pending"));

themeToggle.addEventListener("click", () => {
  applyTheme(!document.body.classList.contains("dark-mode"), { announce: true, persist: true });
});

const notificationBtn = document.getElementById("notificationBtn");

function setNotifications(open) {
  notificationPanel.classList.toggle("open", open);
  notificationBtn.setAttribute("aria-expanded", String(open));
}

notificationBtn.addEventListener("click", () => {
  setNotifications(!notificationPanel.classList.contains("open"));
});

document.addEventListener("click", (event) => {
  const isNotification = event.target.closest("#notificationBtn") || event.target.closest("#notificationPanel");
  if (!isNotification) setNotifications(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setNotifications(false);
    setChat(false);
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
  if (event.key === "/" && !typing && currentRole) {
    event.preventDefault();
    document.getElementById("searchInput").focus();
  }
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll(".category-card button").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".category-card");
    document.querySelectorAll(".category-card").forEach((item) => {
      if (item !== card) item.classList.remove("expanded");
    });
    card.classList.toggle("expanded");
    syncCategoryAria();
  });
});

function syncCategoryAria() {
  document.querySelectorAll(".category-card").forEach((item) => {
    item.querySelector("button").setAttribute("aria-expanded", String(item.classList.contains("expanded")));
  });
}
syncCategoryAria();

const slots = document.getElementById("slots");
const lockStatus = document.getElementById("lockStatus");
const doctorSelect = document.getElementById("doctorSelect");
const doctorPicker = document.getElementById("doctorPicker");
const doctorAvailabilitySummary = document.getElementById("doctorAvailabilitySummary");
const datePicker = document.getElementById("datePicker");
const futureAppointments = document.getElementById("futureAppointments");
const specialtySelect = document.getElementById("specialty");
const doctorSchedules = {
  levi: { name: "ד״ר מיכל לוי", specialty: "רפואת משפחה", defaultSlots: ["09:00", "09:30", "10:00", "10:30", "11:00", "12:15"], takenByDate: {} },
  cohen: { name: "ד״ר אמיר כהן", specialty: "קרדיולוגיה", defaultSlots: ["08:30", "09:15", "11:30", "13:00", "14:30"], takenByDate: {} },
  friedman: { name: "ד״ר נועה פרידמן", specialty: "רפואת ילדים", defaultSlots: ["10:00", "10:20", "10:40", "12:00", "15:30"], takenByDate: {} }
};
const scheduleDates = Array.from({ length: 5 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index);
  const iso = toLocalIso(date);
  const weekday = date.toLocaleDateString("he-IL", { weekday: "short" });
  const label = index === 0 ? "היום" : index === 1 ? "מחר" : weekday;
  const sub = date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
  return { iso, label, sub };
});
doctorSchedules.levi.takenByDate[scheduleDates[0].iso] = ["09:30", "10:00"];
doctorSchedules.cohen.takenByDate[scheduleDates[0].iso] = ["11:30"];
doctorSchedules.friedman.takenByDate[scheduleDates[0].iso] = ["10:20", "15:30"];
let selectedDate = scheduleDates[0].iso;
const baseDoctorAppointments = {
  levi: [
    { date: scheduleDates[0].iso, slot: "09:30", patientName: "דניאל בן דוד", reason: "מעקב לחץ דם וסיכום בדיקות", urgency: "medium", source: "system" },
    { date: scheduleDates[0].iso, slot: "10:00", patientName: "ליאת צור", reason: "חידוש מרשם ובדיקת תופעות לוואי", urgency: "low", source: "system" }
  ],
  cohen: [
    { date: scheduleDates[0].iso, slot: "11:30", patientName: "רות כהן", reason: "כאבים בחזה ודופק גבוה", urgency: "high", source: "system" }
  ],
  friedman: [
    { date: scheduleDates[0].iso, slot: "10:20", patientName: "אורי ישראלי", reason: "חום ושיעול", urgency: "medium", source: "system" },
    { date: scheduleDates[0].iso, slot: "15:30", patientName: "מאיה לוי", reason: "חיסון ומעקב התפתחות", urgency: "low", source: "system" }
  ]
};
const appointmentsStorageKey = "meditrustBookedAppointments";
let selectedSlot = null;

function getBookedAppointments() {
  const stored = storageGet(appointmentsStorageKey, []);
  return (Array.isArray(stored) ? stored : []).map((appointment) => ({
    ...appointment,
    date: appointment.date || scheduleDates[0].iso
  }));
}

function saveBookedAppointments(appointments) {
  storageSet(appointmentsStorageKey, appointments);
}

function isSlotTaken(doctorId, date, slot) {
  const booked = getBookedAppointments();
  const systemTaken = doctorSchedules[doctorId].takenByDate[date] || [];
  return systemTaken.includes(slot) || booked.some((appointment) => appointment.doctorId === doctorId && appointment.date === date && appointment.slot === slot);
}

function getDoctorSlotStats(doctorId, date = selectedDate) {
  const doctor = doctorSchedules[doctorId];
  const open = doctor.defaultSlots.filter((slot) => !isSlotTaken(doctorId, date, slot));
  const taken = doctor.defaultSlots.filter((slot) => isSlotTaken(doctorId, date, slot));
  return { open, taken, nextOpen: open[0] || null };
}

function renderDatePicker() {
  datePicker.innerHTML = "";
  scheduleDates.forEach((date) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `date-option${selectedDate === date.iso ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(selectedDate === date.iso));
    button.innerHTML = `<strong>${date.label}</strong><span>${date.sub}</span>`;
    button.addEventListener("click", () => {
      selectedDate = date.iso;
      renderSlots();
    });
    datePicker.appendChild(button);
  });
}

function renderDoctorPicker() {
  doctorPicker.innerHTML = "";
  const specialty = specialtySelect.value;
  Object.entries(doctorSchedules).forEach(([doctorId, doctor]) => {
    if (specialty && doctor.specialty !== specialty) return;
    const stats = getDoctorSlotStats(doctorId, selectedDate);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `doctor-option${doctorSelect.value === doctorId ? " selected" : ""}`;
    button.dataset.doctorId = doctorId;
    button.innerHTML = `
      <div class="doctor-option-top">
        <div class="doctor-option-avatar">ד״ר</div>
        <div>
          <strong>${doctor.name}</strong>
          <small>${doctor.specialty}</small>
        </div>
      </div>
      <small>${stats.open.length} שעות פנויות · ${stats.taken.length} תפוסות</small>
      <span class="status-pill">${stats.nextOpen ? `הקרוב: ${stats.nextOpen}` : "אין זמינות"}</span>
    `;
    button.addEventListener("click", () => {
      doctorSelect.value = doctorId;
      renderSlots();
    });
    doctorPicker.appendChild(button);
  });
}

function renderSlots() {
  const doctorId = doctorSelect.value;
  const doctor = doctorSchedules[doctorId];
  const stats = getDoctorSlotStats(doctorId, selectedDate);
  selectedSlot = null;
  lockStatus.textContent = "ללא נעילה";
  slots.innerHTML = "";
  doctor.defaultSlots.forEach((time) => {
    const button = document.createElement("button");
    const taken = isSlotTaken(doctorId, selectedDate, time);
    button.className = `slot${taken ? " locked" : ""}`;
    button.type = "button";
    button.textContent = time;
    button.disabled = taken;
    button.setAttribute("aria-pressed", "false");
    button.title = taken ? "השעה תפוסה אצל הרופא בתאריך הזה" : "השעה פנויה לבחירה בתאריך הזה";
    slots.appendChild(button);
  });
  const dateLabel = scheduleDates.find((date) => date.iso === selectedDate)?.label || selectedDate;
  doctorAvailabilitySummary.textContent = `${doctor.name} · ${doctor.specialty} · ${dateLabel}: ${stats.open.length} שעות פנויות (${stats.open.join(", ") || "אין"}) · ${stats.taken.length} שעות תפוסות.`;
  renderDatePicker();
  renderDoctorPicker();
}

function renderBookedAppointments() {
  const booked = getBookedAppointments();
  futureAppointments.querySelectorAll("[data-booked-row]").forEach((row) => row.remove());
  booked.forEach((appointment) => {
    const dateLabel = scheduleDates.find((date) => date.iso === appointment.date)?.label || appointment.date || "נקבע";
    const row = document.createElement("article");
    row.className = "appointment-row";
    row.dataset.bookedRow = "true";
    row.innerHTML = `
      <div class="date-chip">${escapeHtml(dateLabel)}<br>${escapeHtml(appointment.slot)}</div>
      <div>
        <strong>${escapeHtml(appointment.doctorName)} · ${escapeHtml(appointment.specialty)}</strong>
        <div class="row-sub">${escapeHtml(appointment.reason || "תור חדש")} · נשמר במערכת התורים</div>
      </div>
      <span class="status-pill">מאושר</span>
    `;
    futureAppointments.appendChild(row);
  });
}

function getDoctorAppointments(doctorId) {
  const booked = getBookedAppointments()
    .filter((appointment) => appointment.doctorId === doctorId)
    .map((appointment) => ({
      ...appointment,
      patientName: appointment.patientName || "דניאל בן דוד",
      urgency: appointment.urgency || "medium",
      source: "patient"
    }));
  return [...(baseDoctorAppointments[doctorId] || []), ...booked]
    .sort((a, b) => `${a.date || ""} ${a.slot}`.localeCompare(`${b.date || ""} ${b.slot}`));
}

function urgencyMeta(urgency) {
  if (urgency === "high") return { label: "גבוה", className: "high" };
  if (urgency === "medium") return { label: "בינוני", className: "medium" };
  return { label: "נמוך", className: "low" };
}

function selectDoctorAppointment(appointment) {
  const dateLabel = scheduleDates.find((date) => date.iso === appointment.date)?.label || appointment.date || "היום";
  document.getElementById("doctorPatientPanel").innerHTML = `
    <div class="history-item"><strong>${escapeHtml(appointment.patientName)}</strong><br><span>${escapeHtml(appointment.reason || "תור ללא סיבה מפורטת")}</span></div>
    <div class="history-item"><strong>תאריך ושעה</strong><br><span>${escapeHtml(dateLabel)} · ${escapeHtml(appointment.slot)} · ${appointment.source === "patient" ? "נקבע על ידי המטופל" : "תור קיים במערכת"}</span></div>
    <div class="history-item"><strong>מדדים אחרונים</strong><br><span>8,420 צעדים, 7.4 שעות שינה, דופק 68, לחץ דם 118/76</span></div>
    <div class="history-item"><strong>הכנה לביקור</strong><br><span>לבדוק מגמת לחץ דם, תרופות קבועות וסיכום בדיקות אחרון.</span></div>
  `;
}

function renderDoctorDashboard() {
  if (!document.getElementById("doctorScheduleList")) return;
  const doctor = doctorSchedules[currentDoctorId] || doctorSchedules.levi;
  const appointments = getDoctorAppointments(currentDoctorId);
  const openSlots = scheduleDates.reduce((sum, date) => sum + getDoctorSlotStats(currentDoctorId, date.iso).open.length, 0);
  const urgentCount = appointments.filter((appointment) => appointment.urgency === "high").length;

  document.getElementById("doctorSpecialtyLabel").textContent = doctor.specialty;
  document.getElementById("doctorWelcomeTitle").textContent = `${doctor.name} · לו״ז לפי תאריכים`;
  document.getElementById("doctorWelcomeText").textContent = `כל התורים שמופיעים כאן שייכים ל-${doctor.name}. תורים חדשים נכנסים עם תאריך ושעה, כך ששעה שנתפסה ביום אחד נשארת פנויה ביום אחר.`;
  document.getElementById("doctorTodayCount").textContent = appointments.length;
  document.getElementById("doctorUrgentCount").textContent = urgentCount;
  document.getElementById("doctorOpenSlots").textContent = openSlots;

  const scheduleList = document.getElementById("doctorScheduleList");
  scheduleList.innerHTML = "";
  if (!appointments.length) {
    scheduleList.innerHTML = `<div class="insight">אין תורים לרופא הזה היום. השעות הפנויות פתוחות למטופלים.</div>`;
    return;
  }

  appointments.forEach((appointment, index) => {
    const meta = urgencyMeta(appointment.urgency);
    const dateLabel = scheduleDates.find((date) => date.iso === appointment.date)?.label || appointment.date || "היום";
    const row = document.createElement("article");
    row.className = "appointment-row doctor-schedule-row";
    row.innerHTML = `
      <div class="date-chip">${escapeHtml(dateLabel)}<br>${escapeHtml(appointment.slot)}</div>
      <div>
        <strong>${escapeHtml(appointment.patientName)}</strong>
        <div class="row-sub">${escapeHtml(appointment.reason || "תור ללא סיבה מפורטת")}</div>
      </div>
      <span class="severity ${meta.className}">${meta.label}</span>
    `;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    const select = () => {
      scheduleList.querySelectorAll(".doctor-schedule-row").forEach((item) => item.classList.remove("selected"));
      row.classList.add("selected");
      selectDoctorAppointment(appointment);
    };
    row.addEventListener("click", select);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
    scheduleList.appendChild(row);
    if (index === 0) select();
  });
}

slots.addEventListener("click", (event) => {
  const slot = event.target.closest(".slot");
  if (!slot || slot.classList.contains("locked")) return;
  document.querySelectorAll(".slot").forEach((item) => {
    item.classList.remove("selected");
    item.setAttribute("aria-pressed", "false");
  });
  slot.classList.add("selected");
  slot.setAttribute("aria-pressed", "true");
  selectedSlot = slot.textContent.trim();
  lockStatus.textContent = `נעול זמנית: ${selectedSlot}`;
  showToast(`השעה ${selectedSlot} ננעלה זמנית למטופל הנוכחי`);
});

document.getElementById("bookBtn").addEventListener("click", () => {
  if (!selectedSlot) {
    showToast("בחרו שעה זמינה לפני אישור התור");
    return;
  }
  const doctorId = doctorSelect.value;
  if (isSlotTaken(doctorId, selectedDate, selectedSlot)) {
    showToast("השעה הזו כבר נתפסה אצל הרופא. בחרו שעה אחרת.");
    renderSlots();
    return;
  }
  const booked = getBookedAppointments();
  const doctor = doctorSchedules[doctorId];
  booked.unshift({
    doctorId,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    patientName: "דניאל בן דוד",
    date: selectedDate,
    slot: selectedSlot,
    reason: document.getElementById("visitReason").value.trim(),
    urgency: "medium",
    createdAt: new Date().toISOString()
  });
  saveBookedAppointments(booked);
  renderSlots();
  renderBookedAppointments();
  renderDoctorDashboard();
  showToast(`התור בשעה ${selectedSlot} אושר. נשלח מייל אישור.`);
  document.getElementById("visitReason").value = "";
  lockStatus.textContent = "ללא נעילה";
  selectedSlot = null;
  celebrate();
});

specialtySelect.addEventListener("change", () => {
  const specialty = specialtySelect.value;
  Array.from(doctorSelect.options).forEach((option) => {
    option.hidden = Boolean(specialty) && doctorSchedules[option.value].specialty !== specialty;
  });
  if (doctorSelect.selectedOptions[0]?.hidden) {
    doctorSelect.value = Array.from(doctorSelect.options).find((option) => !option.hidden)?.value || "levi";
  }
  renderSlots();
});

doctorSelect.addEventListener("change", () => {
  const doctor = doctorSchedules[doctorSelect.value];
  if (specialtySelect.value && doctor.specialty !== specialtySelect.value) {
    specialtySelect.value = "";
    Array.from(doctorSelect.options).forEach((option) => { option.hidden = false; });
  }
  renderSlots();
});
renderSlots();
renderBookedAppointments();
renderDoctorDashboard();

document.getElementById("connectWearable").addEventListener("click", () => {
  showToast("חיבור Apple Watch הודגם בהצלחה");
  const score = document.getElementById("healthScore");
  score.textContent = "84";
  document.getElementById("scoreRing").setAttribute("stroke-dashoffset", "94");
  celebrate();
});

document.getElementById("quickVitals").addEventListener("click", () => {
  const heartRate = 64 + Math.floor(Math.random() * 9);
  const steps = 8420 + Math.floor(Math.random() * 900);
  const sleep = (7.1 + Math.random() * 0.8).toFixed(1);
  const score = 82 + Math.floor(Math.random() * 7);
  document.getElementById("heartRateValue").textContent = `${heartRate} bpm`;
  document.getElementById("stepsValue").textContent = steps.toLocaleString("he-IL");
  document.getElementById("sleepValue").textContent = `${sleep} שעות`;
  document.getElementById("manualHeartRate").value = heartRate;
  document.getElementById("manualSteps").value = steps;
  document.getElementById("manualSleep").value = sleep;
  document.getElementById("healthScore").textContent = score;
  document.getElementById("scoreRing").setAttribute("stroke-dashoffset", String(590 - (score / 100) * 590));
  showToast("המדדים עודכנו מהשעון החכם");
});

document.getElementById("openChatQuick").addEventListener("click", () => setChat(true));

document.getElementById("quickSummary").addEventListener("click", () => {
  showToast("סיכום הביקור האחרון: המשך מעקב ושיפור פעילות");
});

document.querySelectorAll(".med-done").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".med-item");
    item.classList.add("done");
    button.textContent = "נרשם";
    button.disabled = true;
    showToast("מעולה, הפעולה נרשמה ביומן הטיפול");
    celebrate();
  });
});

document.querySelectorAll("[data-mood]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-mood]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    showToast(`צ׳ק־אין יומי נשמר: ${button.dataset.mood}/5`);
  });
});

const metricsForm = document.getElementById("metricsForm");
const metricsHistoryEl = document.getElementById("metricsHistory");
const readinessScoreEl = document.getElementById("readinessScore");
const readinessMeter = document.getElementById("readinessMeter");
const readinessPanel = document.getElementById("readinessPanel");
const readinessCaption = document.getElementById("readinessCaption");
const readinessInsights = document.getElementById("readinessInsights");
const metricsStorageKey = "meditrustMetricsHistory";

function getMetricsHistory() {
  const stored = storageGet(metricsStorageKey, []);
  return Array.isArray(stored) ? stored : [];
}

function saveMetricsHistory(history) {
  storageSet(metricsStorageKey, history.slice(0, 14));
}

function average(history, key, fallback) {
  if (!history.length) return fallback;
  const total = history.reduce((sum, item) => sum + Number(item[key] || 0), 0);
  return total / history.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateReadiness(entry, history) {
  const previous = history.slice(1);
  const avgSleep = average(previous, "sleep", 7.2);
  const avgHeartRate = average(previous, "heartRate", 68);
  const avgSteps = average(previous, "steps", 7800);
  const avgCalories = average(previous, "calories", 2100);

  let readiness = 68;
  readiness += clamp((entry.sleep - avgSleep) * 8, -18, 18);
  readiness += clamp((avgHeartRate - entry.heartRate) * 1.6, -18, 18);
  readiness += clamp((entry.steps - avgSteps) / 420, -12, 14);
  readiness += clamp((entry.calories - avgCalories) / 180, -8, 8);

  if (entry.sleep < 6) readiness -= 16;
  if (entry.heartRate > avgHeartRate + 8) readiness -= 14;
  if (entry.calories < 1600) readiness -= 8;

  readiness = Math.round(clamp(readiness, 12, 98));
  const fatigue = Math.round(clamp(100 - readiness + Math.max(0, entry.heartRate - avgHeartRate) * 1.8, 5, 95));

  let workout = "אימון בינוני של 35-45 דקות או הליכה מהירה.";
  if (readiness >= 82) workout = "מוכנות גבוהה: אפשר לבצע אימון כוח או אירובי עצים, עם חימום מסודר.";
  if (readiness < 62) workout = "מומלץ אימון קל: הליכה, מתיחות או התאוששות פעילה.";
  if (readiness < 42) workout = "היום עדיף מנוחה, שתייה, שינה טובה ומעקב אחר התחושה.";

  const reasons = [];
  reasons.push(`רמת עייפות משוערת: ${fatigue}/100.`);
  reasons.push(`בהשוואה להיסטוריה שלך: שינה ${entry.sleep >= avgSleep ? "מעל" : "מתחת"} לממוצע, דופק ${entry.heartRate <= avgHeartRate ? "רגוע" : "גבוה"} ביחס לממוצע.`);
  if (entry.food) reasons.push(`תזונה שנרשמה היום: ${entry.food}.`);

  return { readiness, fatigue, workout, reasons };
}

function renderMetricsHistory(history) {
  metricsHistoryEl.innerHTML = "";
  if (!history.length) {
    metricsHistoryEl.innerHTML = `<div class="insight">עדיין אין היסטוריה. אחרי כמה ימים החישוב יהיה אישי ומדויק יותר.</div>`;
    return;
  }

  history.slice(0, 5).forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `
      <strong>${escapeHtml(item.dateLabel)}</strong>
      <span>${Number(item.steps).toLocaleString("he-IL")} צעדים</span>
      <span>${Number(item.heartRate)} bpm</span>
      <span>${Number(item.sleep)} שעות</span>
      <span>${Number(item.readiness)}% מוכנות</span>
    `;
    metricsHistoryEl.appendChild(row);
  });
}

function applyReadinessResult(entry, history) {
  const result = calculateReadiness(entry, history);
  const readinessState = result.readiness >= 82 ? "high" : result.readiness >= 55 ? "medium" : "low";
  const readinessColor = readinessState === "high" ? "var(--green)" : readinessState === "medium" ? "var(--amber)" : "var(--accent)";
  const captions = {
    high: "מוכנות גבוהה: הגוף נראה מוכן לאימון משמעותי.",
    medium: "מוכנות בינונית: עדיף הליכה, אימון קל או מנוחה פעילה.",
    low: "מוכנות נמוכה: היום כדאי להוריד עומס ולתת לגוף לישון ולהתאושש."
  };
  entry.readiness = result.readiness;
  readinessScoreEl.textContent = result.readiness;
  readinessMeter.style.setProperty("--ready", result.readiness);
  readinessMeter.style.setProperty("--ready-color", readinessColor);
  readinessPanel.classList.remove("ready-high", "ready-medium", "ready-low");
  readinessPanel.classList.add(`ready-${readinessState}`);
  readinessCaption.textContent = captions[readinessState];
  document.getElementById("healthScore").textContent = result.readiness;
  document.getElementById("scoreRing").setAttribute("stroke-dashoffset", String(590 - (result.readiness / 100) * 590));
  document.getElementById("heartRateValue").textContent = `${entry.heartRate} bpm`;
  document.getElementById("stepsValue").textContent = entry.steps.toLocaleString("he-IL");
  document.getElementById("sleepValue").textContent = `${entry.sleep} שעות`;

  readinessInsights.innerHTML = "";
  [...result.reasons, `אימון מומלץ: ${result.workout}`].forEach((text) => {
    const insight = document.createElement("div");
    insight.className = "insight";
    insight.textContent = text;
    readinessInsights.appendChild(insight);
  });
}

metricsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const history = getMetricsHistory();
  const entry = {
    date: new Date().toISOString(),
    dateLabel: new Date().toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
    steps: Number(document.getElementById("manualSteps").value || 0),
    heartRate: Number(document.getElementById("manualHeartRate").value || 0),
    sleep: Number(document.getElementById("manualSleep").value || 0),
    calories: Number(document.getElementById("manualCalories").value || 0),
    food: document.getElementById("manualFood").value.trim()
  };

  const nextHistory = [entry, ...history];
  applyReadinessResult(entry, nextHistory);
  saveMetricsHistory(nextHistory);
  renderMetricsHistory(nextHistory);
  showToast("המדדים נשמרו והמוכנות חושבה לפי ההיסטוריה שלך");
});

const existingMetrics = getMetricsHistory();
if (existingMetrics.length) {
  applyReadinessResult(existingMetrics[0], existingMetrics);
}
renderMetricsHistory(existingMetrics);

document.getElementById("sendSummary").addEventListener("click", () => {
  showToast("סיכום הביקור נשמר ונשלח למטופל");
});

chatToggle.addEventListener("click", () => setChat(!chatWindow.classList.contains("open")));
document.getElementById("closeChat").addEventListener("click", () => setChat(false));

const chatReplies = [
  { keys: ["דחוף", "חירום", "כאב בחזה", "כאבים בחזה", "קוצר נשימה"], text: "נשמע דחוף. במקרה של סכנה מיידית חייגו 101 (מד״א). לפניות שאינן מסכנות חיים אפשר לפנות לקטגוריית רפואה דחופה." },
  { keys: ["תור", "לקבוע", "זמינות"], text: "אפשר לקבוע תור במסך \"התורים שלי\": בוחרים רופא, תאריך ושעה פנויה, והשעה ננעלת עבורכם.", view: "patientAppointments" },
  { keys: ["לחץ", "דופק", "שינה", "צעדים", "מדד", "אימון", "בריאות"], text: "את כל המדדים, המגמות ומחשבון המוכנות תמצאו במסך \"הבריאות שלי\".", view: "patientHealth" },
  { keys: ["ילד", "ילדים", "חיסון"], text: "לרפואת ילדים וחיסונים – ד״ר נועה פרידמן זמינה השבוע. אפשר לבחור אותה במסך התורים.", view: "patientAppointments" },
  { keys: ["סיכום", "מרשם"], text: "סיכומי ביקור ומרשמים נשלחים אליכם מהרופא לאחר הביקור ומופיעים בהתראות." },
  { keys: ["שלום", "היי", "הי", "בוקר"], text: "שלום! איך אפשר לעזור? אפשר לשאול על תורים, מדדים או בחירת שירות רפואי." }
];

function botReply(text) {
  const match = chatReplies.find((reply) => reply.keys.some((key) => text.includes(key)));
  return match || { text: "אפשר להתחיל מבחירת קטגוריה רפואית, לקבוע תור לפי זמינות הרופא או לבדוק את המדדים שלך." };
}

document.getElementById("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("chatText");
  const text = input.value.trim();
  if (!text) return;

  const messages = document.getElementById("chatMessages");
  const user = document.createElement("div");
  user.className = "msg user";
  user.textContent = text;
  messages.appendChild(user);

  input.value = "";

  const typing = document.createElement("div");
  typing.className = "msg typing";
  typing.setAttribute("aria-label", "העוזר מקליד");
  typing.innerHTML = "<i></i><i></i><i></i>";
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;

  window.setTimeout(() => {
    const answer = botReply(text);
    typing.remove();
    const reply = document.createElement("div");
    reply.className = "msg";
    reply.textContent = answer.text;
    if (answer.view && currentRole === "patient") {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "msg-action";
      link.textContent = "מעבר למסך ←";
      link.addEventListener("click", () => showView(answer.view));
      reply.append(document.createElement("br"), link);
    }
    messages.appendChild(reply);
    messages.scrollTop = messages.scrollHeight;
  }, 650);
});

/* ---------------- Global search ---------------- */
const searchIndex = [
  { keys: ["לוי", "משפחה"], view: "patientAppointments", doctor: "levi", label: "ד״ר מיכל לוי" },
  { keys: ["כהן", "קרדיו", "לב"], view: "patientAppointments", doctor: "cohen", label: "ד״ר אמיר כהן" },
  { keys: ["פרידמן", "ילד", "חיסון"], view: "patientAppointments", doctor: "friedman", label: "ד״ר נועה פרידמן" },
  { keys: ["תור", "לקבוע", "זמינות", "שעה", "רופא"], view: "patientAppointments", label: "התורים שלי" },
  { keys: ["בריאות", "מדד", "דופק", "שינה", "צעדים", "לחץ", "מוכנות", "אימון", "יעד", "תרופה", "ויטמין"], view: "patientHealth", label: "הבריאות שלי" },
  { keys: ["בית", "ראשי", "שירות", "קטגור", "דחוף"], view: "patient", label: "דף הבית" }
];

document.getElementById("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("searchInput");
  const query = input.value.trim();
  if (!query) return;
  if (currentRole === "doctor") {
    const rows = [...document.querySelectorAll("#doctorScheduleList .doctor-schedule-row")];
    const hit = rows.find((row) => row.textContent.includes(query));
    if (hit) {
      hit.click();
      hit.scrollIntoView({ block: "center", behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
      showToast("נמצא תור תואם בלו״ז");
    } else {
      showToast("לא נמצאו מטופלים תואמים בלו״ז");
    }
    return;
  }
  const match = searchIndex.find((entry) => entry.keys.some((key) => query.includes(key) || (query.length > 1 && key.includes(query))));
  if (!match) {
    showToast(`לא נמצאו תוצאות עבור "${query}"`);
    return;
  }
  showView(match.view);
  if (match.doctor) {
    specialtySelect.value = "";
    Array.from(doctorSelect.options).forEach((option) => { option.hidden = false; });
    doctorSelect.value = match.doctor;
    renderSlots();
  }
  showToast(`מעבר אל: ${match.label}`);
  input.value = "";
  input.blur();
});

document.getElementById("fullReportBtn").addEventListener("click", () => {
  showToast("הדוח המלא יישלח אליך למייל כקובץ PDF");
});

renderGreeting();
