export function CertiChainShield({ size = 28, className, invert }: { size?: number; className?: string; invert?: boolean }) {
  return (
    <img
      src="/certichain-shield.svg"
      alt="CertiChain"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", ...(invert ? { filter: "brightness(0) invert(1)" } : {}) }}
    />
  );
}
