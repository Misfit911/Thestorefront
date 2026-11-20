import { resolveImageSrc } from "@/lib/images";

export function MediaImage({
  src,
  alt,
  className,
  onLoad,
  ref,
}: {
  src: string;
  alt: string;
  className?: string;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  ref?: React.Ref<HTMLImageElement>;
}) {
  if (!src) return null;
  return <img ref={ref} src={resolveImageSrc(src)} alt={alt} className={className} onLoad={onLoad} />;
}
