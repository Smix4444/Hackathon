import { SegmentedControl } from '../ui/SegmentedControl'

export type DayKey = 'vandaag' | 'morgen'

export function DayTabs({ value, onChange }: { value: DayKey; onChange: (value: DayKey) => void }) {
  return (
    <SegmentedControl<DayKey>
      label="Dag"
      value={value}
      onChange={onChange}
      segments={[
        { value: 'vandaag', label: 'Vandaag' },
        { value: 'morgen', label: 'Morgen' },
      ]}
    />
  )
}
