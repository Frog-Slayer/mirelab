import { Link } from 'react-router'
import { WorkStatus } from '@/types'

export type BookcaseFilter = 'ALL' | WorkStatus

export interface BookcaseItem {
  id: string
  title: string
  author: string
  status: WorkStatus
  href: string
}

const statusLabel: Record<WorkStatus, string> = {
  [WorkStatus.CANDIDATE]: '후보',
  [WorkStatus.READING]: '읽는 중',
  [WorkStatus.DONE]: '완료',
}

const filterOptions: { value: BookcaseFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: WorkStatus.CANDIDATE, label: '후보' },
  { value: WorkStatus.READING, label: '읽는 중' },
  { value: WorkStatus.DONE, label: '완료' },
]

const spineColors = [
  { background: '#36594d', color: '#f4f7f5' },
  { background: '#9d594f', color: '#fff8f5' },
  { background: '#4d6380', color: '#f5f7fb' },
  { background: '#c59d43', color: '#302710' },
  { background: '#665272', color: '#faf6fc' },
  { background: '#d7d1c5', color: '#393630' },
  { background: '#34434e', color: '#f3f6f7' },
]

export function BookcaseStatusFilters({
  value,
  items,
  onChange,
}: {
  value: BookcaseFilter
  items: Pick<BookcaseItem, 'status'>[]
  onChange: (value: BookcaseFilter) => void
}) {
  const count = (filter: BookcaseFilter) =>
    filter === 'ALL' ? items.length : items.filter((item) => item.status === filter).length

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="작품 상태 필터">
      {filterOptions.map((option) => {
        const selected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
              selected
                ? 'border-neutral-800 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
            }`}
          >
            {option.value !== 'ALL' && <StatusGlyph status={option.value} inverted={selected} />}
            <span>{option.label}</span>
            <span className={selected ? 'text-neutral-300' : 'text-neutral-400'}>
              {count(option.value)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Bookcase({
  items,
  onActivate,
}: {
  items: BookcaseItem[]
  onActivate?: (id: string) => void
}) {
  return (
    <section
      aria-label="책장"
      className="overflow-hidden rounded-xl border-8 border-[#71543d] bg-[#ddd7ce] shadow-[inset_0_0_20px_rgba(56,40,27,0.18),0_8px_22px_rgba(38,31,24,0.1)]"
    >
      {chunk(items, 7).map((row, rowIndex) => (
        <div key={rowIndex}>
          <ol className="flex min-h-52 items-end gap-1.5 overflow-x-auto px-5 pt-6 pb-1">
            {row.map((item) => (
              <BookSpine key={item.id} item={item} onActivate={onActivate} />
            ))}
          </ol>
          <div className="h-4 border-y border-[#5e4432] bg-[#856346] shadow-[0_6px_10px_rgba(42,29,19,0.25)]" />
          {rowIndex < Math.ceil(items.length / 7) - 1 && (
            <div className="h-3 bg-[#6f5139]" aria-hidden />
          )}
        </div>
      ))}
    </section>
  )
}

export function StatusGlyph({
  status,
  inverted = false,
}: {
  status: WorkStatus
  inverted?: boolean
}) {
  if (status === WorkStatus.READING) {
    return (
      <span
        className="h-4 w-2.5 shrink-0 bg-emerald-400 [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)]"
        aria-hidden
      />
    )
  }

  if (status === WorkStatus.DONE) {
    return (
      <span
        className={`grid size-4 shrink-0 place-items-center rounded-full text-[11px] leading-none font-bold ${
          inverted ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-white'
        }`}
        aria-hidden
      >
        ✓
      </span>
    )
  }

  return (
    <span
      className={`size-3.5 shrink-0 rounded-full border-2 ${inverted ? 'border-white' : 'border-neutral-400'}`}
      aria-hidden
    />
  )
}

function BookSpine({
  item,
  onActivate,
}: {
  item: BookcaseItem
  onActivate?: (id: string) => void
}) {
  const hash = hashTitle(item.title)
  const palette = spineColors[hash % spineColors.length]
  const height = 142 + (hash % 44)
  const width = 38 + (hash % 12)
  const lean = hash % 5 === 0 ? '-rotate-2' : hash % 7 === 0 ? 'rotate-2' : ''
  const titleSize = item.title.length > 18 ? 11 : item.title.length > 12 ? 12 : 14

  return (
    <li>
      <Link
        to={item.href}
        onMouseEnter={() => onActivate?.(item.id)}
        onFocus={() => onActivate?.(item.id)}
        onTouchStart={() => onActivate?.(item.id)}
        title={`${item.title} — ${item.author}`}
        aria-label={`${item.title}, ${item.author}, ${statusLabel[item.status]}`}
        className={`group relative flex origin-bottom flex-col items-center justify-between overflow-hidden rounded-t-[3px] border border-black/15 px-1.5 py-2.5 shadow-[inset_-4px_0_7px_rgba(0,0,0,0.14),2px_2px_4px_rgba(0,0,0,0.18)] transition duration-200 hover:z-[1] hover:-translate-y-2 hover:rotate-0 hover:shadow-[inset_-4px_0_7px_rgba(0,0,0,0.1),4px_7px_10px_rgba(0,0,0,0.2)] focus-visible:z-[1] focus-visible:-translate-y-2 focus-visible:rotate-0 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${lean}`}
        style={{ height, width, backgroundColor: palette.background, color: palette.color }}
      >
        <span className="flex h-4 items-start justify-center">
          <StatusGlyph status={item.status} inverted={item.status === WorkStatus.CANDIDATE} />
        </span>
        <span
          className="max-h-[76%] overflow-hidden leading-tight font-semibold whitespace-nowrap [text-orientation:mixed] [writing-mode:vertical-rl]"
          style={{ fontSize: titleSize }}
        >
          {item.title}
        </span>
        <span className="size-1.5 rounded-full bg-current opacity-45" aria-hidden />
      </Link>
    </li>
  )
}

function hashTitle(title: string) {
  return [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  )
}
