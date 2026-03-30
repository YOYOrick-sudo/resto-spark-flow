// ============================================
// Shared Premium Email Layout Builder
// Fine dining restaurant style — no emoji, pure typography
// ============================================

export interface EmailLayoutParams {
  logoUrl: string | null;
  restaurantName: string;
  brandColor: string;
  footerText: string;
  heading: string;
  intro: string;
  details: Array<{ label: string; value: string }>;
  ctaUrl?: string;
  ctaLabel?: string;
  secondaryLink?: { url: string; label: string };
  note?: string;
}

export function buildEmailHtml(params: EmailLayoutParams): string {
  const {
    logoUrl, restaurantName, brandColor, footerText,
    heading, intro, details, ctaUrl, ctaLabel, secondaryLink, note,
  } = params;

  const fontFamily = "Georgia, 'Times New Roman', Times, serif";

  const logoBlock = logoUrl
    ? `<tr><td style="padding:40px 40px 0;text-align:center"><img src="${logoUrl}" alt="${restaurantName}" style="max-height:72px;max-width:240px"></td></tr>
       <tr><td style="height:32px"></td></tr>`
    : `<tr><td style="height:40px"></td></tr>`;

  const detailRows = details
    .map((d, i) => {
      const borderBottom = i < details.length - 1
        ? 'border-bottom:1px solid #eee;'
        : '';
      return `<tr>
        <td style="padding:12px 0;${borderBottom}font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-family:${fontFamily};width:120px;vertical-align:top">${d.label}</td>
        <td style="padding:12px 0;${borderBottom}font-size:15px;color:#222;font-weight:600;font-family:${fontFamily};text-align:right">${d.value}</td>
      </tr>`;
    })
    .join('');

  const detailsBlock = details.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">${detailRows}</table>`
    : '';

  const noteBlock = note
    ? `<p style="font-size:13px;color:#888;margin:0 0 24px;font-family:${fontFamily};line-height:1.5">${note}</p>`
    : '';

  const ctaBlock = ctaUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px">
        <tr><td align="center">
          <a href="${ctaUrl}" style="display:inline-block;background:${brandColor};color:#fff;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;text-decoration:none;font-family:${fontFamily}">${ctaLabel || 'Bekijken'}</a>
        </td></tr>
      </table>`
    : '';

  const secondaryBlock = secondaryLink
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0">
        <tr><td align="center">
          <a href="${secondaryLink.url}" style="font-size:13px;color:${brandColor};text-decoration:none;font-family:${fontFamily}">${secondaryLink.label}</a>
        </td></tr>
      </table>`
    : '';

  const footerBlock = footerText
    ? `<tr><td style="padding:20px 40px;border-top:1px solid #eee;text-align:center">
        <p style="margin:0;font-size:12px;color:#aaa;font-family:${fontFamily};line-height:1.5">${footerText}</p>
      </td></tr>`
    : `<tr><td style="padding:20px 40px;border-top:1px solid #eee;text-align:center">
        <p style="margin:0;font-size:12px;color:#aaa;font-family:${fontFamily}">${restaurantName}</p>
      </td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f8">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden" cellpadding="0" cellspacing="0">
  ${logoBlock}
  <tr><td style="padding:0 40px 40px">
    <h1 style="margin:0 0 8px;font-size:20px;color:#222;font-family:${fontFamily};font-weight:600;line-height:1.3">${heading}</h1>
    <p style="margin:0 0 4px;font-size:14px;color:#666;font-family:${fontFamily};line-height:1.6">${intro}</p>
    ${detailsBlock}
    ${noteBlock}
    ${ctaBlock}
    ${secondaryBlock}
  </td></tr>
  ${footerBlock}
</table>
</td></tr></table>
</body></html>`;
}

// ============================================
// Shared date formatting helper (Dutch)
// ============================================

export function formatDateNL(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-');
  const dateObj = new Date(Number(y), Number(mo) - 1, Number(d));
  const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${dayNames[dateObj.getDay()]} ${Number(d)} ${monthNames[Number(mo) - 1]} ${y}`;
}
