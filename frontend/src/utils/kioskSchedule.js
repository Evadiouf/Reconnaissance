/**
 * Plages horaires pointage kiosque — entreprise (défaut) + overrides par département.
 */

export function normalizeDepartmentKey(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Slots applicables à un employé (override équipe si activé et non vide, sinon défaut entreprise) */
export function getKioskSlotsForEmployee(kioskAttendance, employeeDepartment) {
  if (!kioskAttendance?.enabled) return null;
  const dept = normalizeDepartmentKey(employeeDepartment);
  const overrides = Array.isArray(kioskAttendance.teamOverrides)
    ? kioskAttendance.teamOverrides
    : [];
  for (const t of overrides) {
    if (!t?.enabled) continue;
    const key = normalizeDepartmentKey(t.departmentKey);
    if (key && key === dept && Array.isArray(t.slots) && t.slots.length > 0) {
      return t.slots;
    }
  }
  const def = kioskAttendance.defaultSlots;
  if (Array.isArray(def) && def.length > 0) return def;
  return null;
}

export function timeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const parts = hhmm.trim().split(':');
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Inclus start et end (même minute) */
export function isNowInSlot(start, end, date = new Date()) {
  const nowM = date.getHours() * 60 + date.getMinutes();
  const a = timeToMinutes(start);
  const b = timeToMinutes(end);
  if (a == null || b == null) return false;
  if (a <= b) return nowM >= a && nowM <= b;
  return nowM >= a || nowM <= b;
}

/** Premier créneau contenant l’heure actuelle (ordre du tableau) */
export function pickKioskActionForNow(slots, date = new Date()) {
  if (!Array.isArray(slots)) return null;
  for (const slot of slots) {
    if (!slot?.start || !slot?.end || !slot?.action) continue;
    if (isNowInSlot(slot.start, slot.end, date)) return slot.action;
  }
  return null;
}

export function hasKioskScheduleConfig(kioskAttendance) {
  if (!kioskAttendance?.enabled) return false;
  const def = Array.isArray(kioskAttendance.defaultSlots) && kioskAttendance.defaultSlots.length > 0;
  const team = (kioskAttendance.teamOverrides || []).some(
    (t) => t?.enabled && Array.isArray(t.slots) && t.slots.length > 0,
  );
  return def || team;
}

/** Y a-t-il au moins un créneau (défaut ou équipe) actif à cette heure ? Sert à afficher « hors plage » sur le kiosque. */
export function isAnyKioskSlotActiveNow(kioskAttendance, date = new Date()) {
  if (!kioskAttendance?.enabled || !hasKioskScheduleConfig(kioskAttendance)) {
    return true;
  }
  const slots = [];
  if (Array.isArray(kioskAttendance.defaultSlots)) {
    slots.push(...kioskAttendance.defaultSlots);
  }
  for (const t of kioskAttendance.teamOverrides || []) {
    if (t?.enabled && Array.isArray(t.slots)) {
      slots.push(...t.slots);
    }
  }
  for (const s of slots) {
    if (s?.start && s?.end && isNowInSlot(s.start, s.end, date)) {
      return true;
    }
  }
  return false;
}
