// La relazione tra calorie e macro non cambia mai: 4 kcal/g proteine e
// carboidrati, 9 kcal/g grassi. Dove esiste una formula, la formula vince
// sul modello — è istantanea, gratuita e non sbaglia mai (Parte 5.5).
export function calorieDaMacro({ proteine = 0, carboidrati = 0, grassi = 0 }) {
  return Math.round(proteine * 4 + carboidrati * 4 + grassi * 9);
}
