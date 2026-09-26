import Link from 'next/link';

type BrandLogoProps = {
  href: string;
  inverse?: boolean;
  className?: string;
};

export function BrandLogo({ href, inverse = false, className = '' }: BrandLogoProps) {
  const classes = ['brand', className].filter(Boolean).join(' ');
  const src = inverse
    ? '/brand/premium-lumber-georgia-white.svg'
    : '/brand/premium-lumber-georgia.svg';

  return (
    <Link className={classes} href={href} aria-label="PREMIUM LUMBER GEORGIA">
      <img src={src} alt="PREMIUM LUMBER GEORGIA" className="brand-logo" />
    </Link>
  );
}
