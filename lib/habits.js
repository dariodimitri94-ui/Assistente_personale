// Logica condivisa sulle abitudini: cosa conta come "fatta" e come si
// calcola la percentuale del giorno. Un posto solo, usato da Operator
// (striscia) e dalla scheda Abitudini (Parte 5.3).

export function isHabitDone(habit, value) {
  if (habit.tipo === "contatore") {
    return typeof value === "number" && value >= (habit.obiettivo || 1);
  }
  return value === true;
}

export function completionPercent(habitList, logAbitudini = {}) {
  if (!habitList?.length) return 0;
  let sum = 0;
  for (const h of habitList) {
    const value = logAbitudini[h.id];
    if (h.tipo === "contatore") {
      const target = h.obiettivo || 1;
      sum += Math.min(1, (typeof value === "number" ? value : 0) / target);
    } else {
      sum += value === true ? 1 : 0;
    }
  }
  return Math.round((sum / habitList.length) * 100);
}

export function anyHabitDone(habitList, logAbitudini = {}) {
  return habitList.some((h) => isHabitDone(h, logAbitudini[h.id]));
}
