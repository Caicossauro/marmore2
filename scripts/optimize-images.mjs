import sharp from 'sharp';
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, parse } from 'node:path';

const STYLES_DIR = new URL('../src/styles/', import.meta.url).pathname.replace(/^\//, '');
const MAX_DIM = 1280;
const QUALITY = 80;
const TARGET_EXTS = new Set(['.jpg', '.jpeg', '.png']);

const fmtSize = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const arquivos = await readdir(STYLES_DIR);
const alvos = arquivos.filter((nome) => TARGET_EXTS.has(parse(nome).ext.toLowerCase()));

if (alvos.length === 0) {
  console.log('Nenhuma imagem a otimizar.');
  process.exit(0);
}

let totalAntes = 0;
let totalDepois = 0;

for (const nome of alvos) {
  const entrada = join(STYLES_DIR, nome);
  const { name } = parse(nome);
  const saida = join(STYLES_DIR, `${name}.webp`);

  const tamAntes = (await stat(entrada)).size;
  totalAntes += tamAntes;

  await sharp(entrada)
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(saida);

  const tamDepois = (await stat(saida)).size;
  totalDepois += tamDepois;

  const reducao = ((1 - tamDepois / tamAntes) * 100).toFixed(0);
  console.log(`${nome.padEnd(15)} ${fmtSize(tamAntes).padStart(10)} → ${fmtSize(tamDepois).padStart(10)} (-${reducao}%)`);

  await unlink(entrada);
}

const totalReducao = ((1 - totalDepois / totalAntes) * 100).toFixed(0);
console.log('─'.repeat(50));
console.log(`Total: ${fmtSize(totalAntes)} → ${fmtSize(totalDepois)} (-${totalReducao}%)`);
