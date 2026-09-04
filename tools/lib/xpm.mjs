export function renderXpm(name, rows, colors) {
  const width = rows[0].length;
  if (rows.some((row) => row.length !== width)) {
    throw new Error(`renderXpm: rows must be of equal length (${name})`);
  }
  for (const row of rows) {
    for (const key of row) {
      if (!(key in colors)) {
        throw new Error(`renderXpm: no colour entry for "${key}" (${name})`);
      }
    }
  }

  const keys = Object.keys(colors);
  const header = `"${width} ${rows.length} ${keys.length} 1",`;
  const palette = keys.map((key) => `"${key}\tc ${colors[key]}",`);
  const pixels = rows.map(
    (row, i) => `"${row}"${i === rows.length - 1 ? "};" : ","}`,
  );

  return [
    "/* XPM */",
    `static char * ${name}_xpm[] = {`,
    header,
    ...palette,
    ...pixels,
    "",
  ].join("\n");
}
