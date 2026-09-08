// Builds a VietQR image URL via SePay's VA proxy (vietqr.app/img) so customers can
// scan-to-pay a bank transfer with the amount and transfer content pre-filled.
// SePay requires this exact "des" content format (SEVQR + TKP<va number> + our own
// deposit code) to auto-detect the transaction against the shop's virtual sub-account
// and fire the confirmation webhook. See https://qr.sepay.vn.
export function buildVietQrImageUrl(params: {
  bankName: string;
  accountNo: string;
  amountVnd: number;
  content: string;
}): string {
  const url = new URL("https://vietqr.app/img");
  url.searchParams.set("acc", params.accountNo.trim());
  url.searchParams.set("bank", params.bankName.trim());
  url.searchParams.set("amount", String(Math.round(params.amountVnd)));
  url.searchParams.set("des", params.content);
  return url.toString();
}
