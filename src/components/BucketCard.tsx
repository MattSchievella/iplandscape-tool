import type { Bucket, LegendConfig, BrandingConfig } from '../types';

interface BucketCardProps {
  bucket: Bucket;
  legend: LegendConfig;
  branding: BrandingConfig;
  onClick: () => void;
  width: number;
  height: number;
  titleFontSize: number;
  valueFontSize: number;
}

export function BucketCard({ bucket, legend, branding, onClick, width, height, titleFontSize, valueFontSize }: BucketCardProps) {
  const formatValues = () => {
    if (legend.format === '3-value') {
      return `${bucket.values[0]} : ${bucket.values[1]} : ${bucket.values[2] ?? 0}`;
    }
    return `${bucket.values[0]} : ${bucket.values[1]}`;
  };

  return (
    <div
      className="cursor-pointer hover:brightness-110 transition-all overflow-hidden"
      style={{
        width,
        height,
        backgroundColor: branding.secondaryColor,
        opacity: (branding.bucketOpacity ?? 100) / 100,
        color: branding.textColor,
        fontFamily: branding.fontFamily,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        boxSizing: 'border-box',
      }}
      onClick={onClick}
      title="Click to edit"
    >
      <div
        style={{
          fontSize: titleFontSize,
          fontWeight: 800,
          textTransform: 'uppercase',
          lineHeight: 1.2,
          textAlign: 'center',
          marginBottom: 2,
          maxWidth: '100%',
          overflow: 'hidden',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          hyphens: 'auto' as const,
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical' as const,
          WebkitLineClamp: Math.max(1, Math.floor((height * 0.55) / (titleFontSize * 1.2))),
        }}
      >
        {bucket.title}
      </div>
      <div
        style={{
          fontSize: valueFontSize,
          fontWeight: 800,
          letterSpacing: '0.02em',
          textAlign: 'center',
          lineHeight: 1.2,
          color: branding.valueColor || branding.textColor,
        }}
      >
        {formatValues()}
      </div>
    </div>
  );
}
