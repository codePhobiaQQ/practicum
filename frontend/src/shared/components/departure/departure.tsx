import cn from "classnames"

export const Departure = (
  { title, description, children: content, id, isHeader: isHeader = true }:
    { title: string, description?: string, children?: React.ReactNode, id?: string | number, isHeader?: boolean }) => {
  return (
    <section id={id?.toString()}>
      <div className={cn("flex flex-col justify-between bg-white shadow-sm", isHeader ? "border-b border-light-border px-6 py-6" : "py-3")}>
        <h2 className="text-2xl font-semibold text-light-text">{title}</h2>
        {description && <p className="mt-1 text-sm text-light-text-secondary">
          {description}
        </p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="gap-6 p-6 text-light-text">{content}</div>
      </div>
    </section>
  )
}