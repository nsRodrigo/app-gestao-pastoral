import QRCode from "qrcode";

/** Gera o SVG do QR Code da carteirinha digital (seção 6) no servidor. */
export async function generateQrCodeSvg(token: string): Promise<string> {
  return QRCode.toString(token, {
    type: "svg",
    margin: 1,
    color: { dark: "#1E3A5F", light: "#00000000" },
  });
}
