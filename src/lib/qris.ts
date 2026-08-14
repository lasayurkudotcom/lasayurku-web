/**
 * src/lib/qris.ts
 *
 * Menghasilkan QRIS dinamis (EMVCo / SNAP BI) dari payload QRIS statis LA.Sayurku.
 */

// Payload QRIS statis milik LA.Sayurku
export const STATIC_QRIS_PAYLOAD =
  '00020101021126570011ID.DANA.WWW011893600915303365365102090336536510303UMI51440014ID.CO.QRIS.WWW0215ID10265613750270303UMI5204549953033605802ID5910LA.Sayurku6012Kab. Bandung6105403946304CD7F';

interface TLVEntry {
  tag: string;   // 2-digit tag, mis. "00", "54"
  value: string; // nilai mentah (plain string)
}

/** Parse string QRIS flat menjadi array TLV entry */
function parseTLV(payload: string): TLVEntry[] {
  const entries: TLVEntry[] = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) break;
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (isNaN(len)) break;
    const value = payload.slice(i + 4, i + 4 + len);
    entries.push({ tag, value });
    i += 4 + len;
  }
  return entries;
}

/** Encode satu TLV entry menjadi string */
function encodeTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/** Susun kembali array TLV menjadi string flat QRIS */
function encodeTLVList(entries: TLVEntry[]): string {
  return entries.map((e) => encodeTLV(e.tag, e.value)).join('');
}

/** CRC16-CCITT (seed 0xFFFF, poly 0x1021) — standar EMVCo / DANA */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Public API - Meng-generate QRIS Dinamis
 */
export function generateDynamicQris(totalAmount: number): string {
  const amount = Math.round(totalAmount);
  if (!amount || amount <= 0) {
    throw new Error('generateDynamicQris: totalAmount harus berupa bilangan positif.');
  }

  // 1. Parse payload statis
  const entries = parseTLV(STATIC_QRIS_PAYLOAD);

  // 2. Ubah Tag "01" (Point of Initiation) → "12" (dinamis)
  const tag01 = entries.find((e) => e.tag === '01');
  if (tag01) {
    tag01.value = '12';
  } else {
    const idx00 = entries.findIndex((e) => e.tag === '00');
    entries.splice(idx00 + 1, 0, { tag: '01', value: '12' });
  }

  // 3. Sisipkan / perbarui Tag "54" (Transaction Amount)
  const amountStr = amount.toString();
  const existingTag54 = entries.find((e) => e.tag === '54');
  if (existingTag54) {
    existingTag54.value = amountStr;
  } else {
    let insertIdx = entries.findIndex((e) => e.tag === '58');
    if (insertIdx === -1) insertIdx = entries.length - 1;
    const crcIdx = entries.findIndex((e) => e.tag === '63');
    if (crcIdx !== -1 && insertIdx >= crcIdx) insertIdx = crcIdx;
    entries.splice(insertIdx, 0, { tag: '54', value: amountStr });
  }

  // 4. Hapus tag "63" (CRC lama)
  const filteredEntries = entries.filter((e) => e.tag !== '63');

  // 5. Susun payload tanpa CRC + tambahkan "6304" untuk hitung CRC
  const rawPayload = encodeTLVList(filteredEntries) + '6304';

  // 6. Hitung CRC16 asli dan return
  const checksum = crc16(rawPayload);
  return rawPayload + checksum;
}