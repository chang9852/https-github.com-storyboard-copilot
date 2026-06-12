type NodePriceBadgeProps = {
  label: string;
  title?: string;
};

export function NodePriceBadge({ label, title }: NodePriceBadgeProps) {
  return (
    <span
      title={title}
      className="mr-2 shrink-0 text-[12px] leading-none font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100/50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700/30"
    >
      {label}
    </span>
  );
}
