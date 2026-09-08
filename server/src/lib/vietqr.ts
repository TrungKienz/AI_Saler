// Builds a VietQR quick-link image URL (img.vietqr.io) so customers can scan-to-pay
// a bank transfer with the amount and transfer content already pre-filled.
// No API key needed, this is VietQR's public image generation endpoint.
export function buildVietQrImageUrl(params: {
  bankId: string;
  accountNo: string;
  accountName: string;
  amountVnd: number;
  content: string;
}): string {
  const { bankId, accountNo, accountName, amountVnd, content } = params;
  const url = new URL(`https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png`);
  url.searchParams.set("amount", String(Math.round(amountVnd)));
  url.searchParams.set("addInfo", content);
  url.searchParams.set("accountName", accountName);
  return url.toString();
}
