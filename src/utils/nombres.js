// Comparación de nombres de personas, sin tildes ni mayúsculas.

function palabras(nombre) {
  return String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean);
}

// "Ana Pérez" y "Pérez, Ana María" son compatibles: todas las palabras del nombre más
// corto aparecen en el más largo. Se usa solo para avisar, nunca para bloquear.
export function nombresCompatibles(a, b) {
  const pa = palabras(a);
  const pb = palabras(b);
  if (pa.length === 0 || pb.length === 0) return false;

  const [corto, largo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  return corto.every((palabra) => largo.includes(palabra));
}
