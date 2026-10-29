import { createHash } from 'node:crypto';
// PDFs sintéticos sin documentos del usuario; xref y offsets reales.
export function pdfFixture(blank = false, protectedFile = false, outline = false) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    '',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const first = blank || protectedFile ? '' : 'BT /F1 20 Tf 72 700 Td (Hello world) Tj 0 -40 Td (Good morning) Tj 0 -40 Td (Keep reading without leaving the page.) Tj ET';
  const second = blank || protectedFile ? '' : 'BT /F1 20 Tf 72 700 Td (Hello again on the second page.) Tj ET';
  objects[3] = `<< /Length ${first.length} >>\nstream\n${first}\nendstream`;
  objects[5] = `<< /Length ${second.length} >>\nstream\n${second}\nendstream`;
  if (outline && !protectedFile) {
    objects[0] = '<< /Type /Catalog /Pages 2 0 R /Outlines 8 0 R /Names << /Dests << /Names [(practice) [5 0 R /XYZ null null null]] >> >> >>';
    objects.push(
      '<< /Type /Outlines /First 9 0 R /Last 30 0 R /Count 22 >>',
      '<< /Title (I. Foundations) /Parent 8 0 R /Next 12 0 R /First 10 0 R /Last 10 0 R /Count 2 >>',
      '<< /Title (1. Introduction) /Parent 9 0 R /Dest [3 0 R /XYZ null null null] /First 11 0 R /Last 11 0 R /Count 1 >>',
      '<< /Title (1.1 Getting started) /Parent 10 0 R /Dest (practice) >>',
    );
    for (let id = 12; id <= 30; id++) {
      const title = id === 12 ? '2. Practice' : id === 30 ? 'Appendix: final notes' : `Chapter ${id - 9}: Reading and understanding long documents with Simi`;
      objects.push(`<< /Title (${title}) /Parent 8 0 R /Prev ${id === 12 ? 9 : id - 1} 0 R${id < 30 ? ` /Next ${id + 1} 0 R` : ''} /Dest (practice) >>`);
    }
  }
  let protection = '';
  if (protectedFile) {
    // Standard Security Handler R=2 (RC4 40 bits), solo para el fixture de contraseña.
    const padding = Buffer.from('28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a', 'hex');
    const pad = text => Buffer.concat([Buffer.from(text), padding]).subarray(0, 32);
    const md5 = bytes => createHash('md5').update(bytes).digest();
    const rc4 = (key, bytes) => {
      const state = Array.from({ length: 256 }, (_, i) => i); let j = 0;
      for (let i = 0; i < 256; i++) { j = (j + state[i] + key[i % key.length]) & 255; [state[i], state[j]] = [state[j], state[i]]; }
      let i = 0; j = 0;
      return Buffer.from([...bytes].map(byte => { i = (i + 1) & 255; j = (j + state[i]) & 255; [state[i], state[j]] = [state[j], state[i]]; return byte ^ state[(state[i] + state[j]) & 255]; }));
    };
    const id = Buffer.alloc(16, 1), permissions = Buffer.alloc(4); permissions.writeInt32LE(-4);
    const owner = rc4(md5(pad('owner')).subarray(0, 5), pad('secret'));
    const key = md5(Buffer.concat([pad('secret'), owner, permissions, id])).subarray(0, 5);
    const user = rc4(key, padding);
    objects.push(`<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${owner.toString('hex')}> /U <${user.toString('hex')}> /P -4 >>`);
    protection = ` /Encrypt 8 0 R /ID [<${id.toString('hex')}> <${id.toString('hex')}>]`;
  }
  let content = '%PDF-1.7\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(content)); content += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(content);
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) content += `${String(offset).padStart(10, '0')} 00000 n \n`;
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${protection} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(content);
}
