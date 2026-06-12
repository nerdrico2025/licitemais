/** Remove tudo que não for dígito. */
export function unformatCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

/** Aplica a máscara 00.000.000/0000-00 enquanto o usuário digita. */
export function formatCnpj(value: string): string {
  const digits = unformatCnpj(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function calcCheckDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Valida um CNPJ (algoritmo de dígitos verificadores). */
export function isValidCnpj(value: string): boolean {
  const digits = unformatCnpj(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const firstCheck = calcCheckDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (firstCheck !== Number(digits[12])) return false;

  const secondCheck = calcCheckDigit(
    digits,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  if (secondCheck !== Number(digits[13])) return false;

  return true;
}
