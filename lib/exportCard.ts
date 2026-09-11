import { toPng } from 'html-to-image';
import { CardProfile } from './types';

/**
 * Downloads a DOM element as a high-resolution PNG image
 */
export async function downloadCardAsPng(elementId: string, filename = 'solocard.png'): Promise<boolean> {
  const node = document.getElementById(elementId);
  if (!node) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  try {
    const dataUrl = await toPng(node, {
      quality: 0.98,
      pixelRatio: 2.5, // High resolution for retina/social media
      cacheBust: true,
      filter: (childNode) => {
        // Exclude buttons or control toggles during export
        if (childNode instanceof HTMLElement) {
          if (childNode.classList.contains('no-export')) {
            return false;
          }
        }
        return true;
      },
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to export card as PNG:', err);
    return false;
  }
}

/**
 * Generates and downloads a standard .vcf (vCard 3.0) file
 * Compatible with Apple Contacts, Google Contacts, Outlook, Android
 */
export function downloadVCard(profile: CardProfile): void {
  const nameParts = (profile.name || 'SoloCard User').trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const firstName = nameParts[0] || '';

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${profile.name || 'SoloCard User'}`,
    profile.role ? `TITLE:${profile.role}` : '',
    profile.bio ? `NOTE:${profile.bio.replace(/\n/g, ' ')}` : '',
    profile.links.website ? `URL:${profile.links.website}` : '',
    profile.showcase?.email ? `EMAIL;TYPE=INTERNET:${profile.showcase.email}` : '',
    profile.location ? `ADR;TYPE=WORK:;;;${profile.location};;;` : '',
    profile.links.github ? `X-SOCIALPROFILE;type=github:${profile.links.github}` : '',
    profile.links.x ? `X-SOCIALPROFILE;type=twitter:${profile.links.x}` : '',
    profile.links.linkedin ? `X-SOCIALPROFILE;type=linkedin:${profile.links.linkedin}` : '',
    'END:VCARD',
  ].filter(Boolean);

  const vcardBlob = new Blob([vcardLines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(vcardBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(profile.username || profile.name || 'contact').toLowerCase().replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
