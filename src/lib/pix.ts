const onlyAscii = (value: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();

const field = (id: string, value: string) => {
  const v = value || "";
  return `${id}${String(v.length).padStart(2, "0")}${v}`;
};

const crc16 = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export function buildPixPayload({
  pixKey,
  amount,
  merchantName,
  merchantCity,
  txid,
}: {
  pixKey: string;
  amount?: number;
  merchantName?: string;
  merchantCity?: string;
  txid?: string;
}) {
  const key = onlyAscii(pixKey);
  if (!key) throw new Error("Chave PIX não configurada.");

  const gui = field("00", "BR.GOV.BCB.PIX");
  const keyField = field("01", key);
  const merchantAccount = field("26", gui + keyField);
  const name = onlyAscii(merchantName || "SUA LOJA").slice(0, 25) || "SUA LOJA";
  const city = onlyAscii(merchantCity || "CIUDAD DEL ESTE").slice(0, 15) || "CIUDAD DEL ESTE";
  const safeTxid = onlyAscii(txid || "***").slice(0, 25) || "***";
  const additional = field("62", field("05", safeTxid));

  let payload = "";
  payload += field("00", "01");
  payload += field("01", "12");
  payload += merchantAccount;
  payload += field("52", "0000");
  payload += field("53", "986");
  if (amount && amount > 0) payload += field("54", amount.toFixed(2));
  payload += field("58", "BR");
  payload += field("59", name);
  payload += field("60", city);
  payload += additional;
  payload += "6304";
  return payload + crc16(payload);
}
