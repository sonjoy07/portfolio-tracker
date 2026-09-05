/** Subtle "No data" pill used in place of blank cells or bare dashes. */
export function NoData() {
  return (
    <span
      className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-400 dark:bg-slate-800 dark:text-slate-500"
      title="No data available"
    >
      No data
    </span>
  )
}
