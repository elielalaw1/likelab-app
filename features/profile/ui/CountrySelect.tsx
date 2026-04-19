import { useMemo } from 'react'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'
import { findCountryByValue, getCountryOptions } from '@/features/profile/location-data'

type Props = {
  value: string
  onSelect: (countryName: string, countryCode: string) => void
}

export function CountrySelect({ value, onSelect }: Props) {
  const options = useMemo(
    () =>
      getCountryOptions().map((item) => ({
        value: item.code,
        label: `${item.flag} ${item.label}`,
      })),
    []
  )

  const currentCode = useMemo(() => {
    return findCountryByValue(value)?.code || ''
  }, [options, value])

  return (
    <SelectPopover
      label="Country"
      value={currentCode}
      placeholder="Select country"
      searchable
      options={options}
      onSelect={(code) => {
        const selected = options.find((item) => item.value === code)
        const cleanedName = selected ? selected.label.split(' ').slice(1).join(' ') : value
        onSelect(cleanedName, code)
      }}
    />
  )
}
