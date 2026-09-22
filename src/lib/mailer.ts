export async function sendPasswordResetEmail(
  email: string,
  url: string,
): Promise<{ delivered: boolean; devLink?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const devLink = process.env.NODE_ENV !== "production" ? url : undefined;

  if (!apiKey) {
    console.log(`[LifeOS] Password reset link for ${email}: ${url}`);
    return { delivered: false, devLink };
  }

  const from = process.env.EMAIL_FROM || "LifeOS <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Reset your LifeOS password",
        html: `<p>Tap to set a new password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 30 minutes. If you didn't request this, ignore it.</p>`,
      }),
    });
    if (!res.ok) {
      console.error("[LifeOS] Resend send failed:", await res.text());
      console.log(`[LifeOS] Password reset link for ${email}: ${url}`);
      return { delivered: false, devLink };
    }
    return { delivered: true };
  } catch (err) {
    console.error("[LifeOS] Resend request threw:", err);
    console.log(`[LifeOS] Password reset link for ${email}: ${url}`);
    return { delivered: false, devLink };
  }
}
