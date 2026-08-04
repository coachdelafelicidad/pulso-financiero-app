const FROM = "Tu Pulso · Okomos <hola@okomosfinanzas.com>";

export async function sendPasswordResetOtpEmail(to: string, otp: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[resend] RESEND_API_KEY missing");
    return false;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://app.okomosfinanzas.com";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: "Tu código para restablecer contraseña — Tu Pulso · Okomos",
      text: `Tu código de verificación es: ${otp}

Ingresa este código en ${appUrl}/reset-password junto con tu correo y tu nueva contraseña.

El código expira en 15 minutos. Si no solicitaste este cambio, ignora este correo.

— Tu Pulso · Okomos by Okomos Finanzas`,
    }),
  });

  if (!res.ok) {
    console.error("[resend] send failed", res.status, await res.text());
    return false;
  }

  return true;
}
