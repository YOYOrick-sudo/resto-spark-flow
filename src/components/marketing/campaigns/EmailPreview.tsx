import { cn } from '@/lib/utils';
import type { EmailBlockData } from './EmailBlock';

interface EmailPreviewProps {
  blocks: EmailBlockData[];
  brandColor?: string;
  logoUrl?: string | null;
  locationName?: string;
  mobile?: boolean;
}

export function EmailPreview({ blocks, brandColor = '#1d979e', logoUrl, locationName = 'Restaurant', mobile }: EmailPreviewProps) {
  const renderBlock = (block: EmailBlockData) => {
    switch (block.type) {
      case 'header':
        return (
          <div key={block.id} style={{ backgroundColor: brandColor, padding: '24px', textAlign: 'center' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxHeight: '48px', margin: '0 auto' }} />
            ) : (
              <div style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>{locationName}</div>
            )}
          </div>
        );
      case 'text':
        return (
          <div key={block.id} style={{ padding: '16px 24px', fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
            {block.content.text || <span style={{ color: '#999' }}>Tekst blok...</span>}
          </div>
        );
      case 'image':
        return (
          <div key={block.id} style={{ padding: '8px 24px', textAlign: 'center' }}>
            <div style={{ backgroundColor: '#f3f4f6', height: '120px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
              Afbeelding
            </div>
          </div>
        );
      case 'button':
        return (
          <div key={block.id} style={{ padding: '12px 24px', textAlign: 'center' }}>
            <a
              href={block.content.buttonUrl || '#'}
              style={{
                display: 'inline-block',
                backgroundColor: brandColor,
                color: '#fff',
                padding: '12px 28px',
                borderRadius: '16px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {block.content.buttonText || 'Klik hier'}
            </a>
          </div>
        );
      case 'divider':
        return (
          <div key={block.id} style={{ padding: '8px 24px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb' }} />
          </div>
        );
      case 'footer':
        return (
          <div key={block.id} style={{ padding: '16px 24px', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>
            <p>{locationName}</p>
            <p style={{ marginTop: '4px' }}>
              <a href="#" style={{ color: '#9ca3af', textDecoration: 'underline' }}>Uitschrijven</a>
            </p>
          </div>
        );
      case 'menu_item':
        return (
          <div key={block.id} style={{ padding: '12px 24px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f9fafb', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px' }}>
                {block.content.menuItemImageUrl ? <img src={block.content.menuItemImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Foto'}
              </div>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>{block.content.menuItemName || 'Gerecht'}</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: brandColor }}>{block.content.menuItemPrice || '€—'}</span>
                </div>
                {block.content.menuItemDescription && (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{block.content.menuItemDescription}</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'reserve_button':
        return (
          <div key={block.id} style={{ padding: '16px 24px', textAlign: 'center' }}>
            <a
              href="#"
              style={{
                display: 'inline-block',
                backgroundColor: brandColor,
                color: '#fff',
                padding: '14px 36px',
                borderRadius: '16px',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 700,
              }}
            >
              Reserveer nu
            </a>
          </div>
        );
      case 'review_quote':
        return (
          <div key={block.id} style={{ padding: '12px 24px' }}>
            <div style={{ backgroundColor: '#faf5ff', borderRadius: '12px', padding: '16px', borderLeft: `3px solid ${brandColor}` }}>
              <div style={{ fontSize: '14px', color: '#f59e0b' }}>
                {'★'.repeat(block.content.reviewRating ?? 5)}
              </div>
              <p style={{ fontSize: '13px', color: '#333', fontStyle: 'italic', margin: '8px 0 6px' }}>
                "{block.content.reviewText || 'Review tekst...'}"
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                — {block.content.reviewAuthor || 'Gast'}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-muted/30 rounded-card p-4">
      <div
        className={cn(
          'mx-auto bg-white rounded-lg shadow-sm overflow-hidden border border-border/30',
          mobile ? 'w-[320px]' : 'w-full max-w-[600px]'
        )}
      >
        {blocks.map(renderBlock)}
      </div>
    </div>
  );
}
