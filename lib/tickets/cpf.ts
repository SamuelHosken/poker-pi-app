export function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Valida CPF pelos dígitos verificadores. Rejeita sequências repetidas. */
export function isValidCpf(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcCheck = (slice: string, factorStart: number): number => {
    let sum = 0;
    let factor = factorStart;
    for (const ch of slice) sum += parseInt(ch, 10) * factor--;
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calcCheck(cpf.slice(0, 9), 10);
  const d2 = calcCheck(cpf.slice(0, 10), 11);
  return (
    d1 === parseInt(cpf.charAt(9), 10) && d2 === parseInt(cpf.charAt(10), 10)
  );
}
