/**
 * Normaliza texto para búsquedas: minúsculas, sin acentos/diacríticos y con
 * ñ→n (la tilde de la ñ es un diacrítico combinante que NFD separa y quitamos).
 * Así "Piña" y "pina", "Tomáte" y "tomate" se consideran iguales al buscar.
 */
export function foldText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
