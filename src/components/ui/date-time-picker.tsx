import * as React from "react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
}

export function DateTimePicker({
  date,
  onSelect,
  placeholder = "Selecteer datum & tijd",
  disabled,
  className,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [hours, setHours] = React.useState(date ? format(date, "HH") : "09")
  const [minutes, setMinutes] = React.useState(date ? format(date, "mm") : "00")
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      setHours(format(date, "HH"))
      setMinutes(format(date, "mm"))
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const updatedDate = new Date(newDate)
      updatedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      setSelectedDate(updatedDate)
    } else {
      setSelectedDate(undefined)
    }
  }

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    if (selectedDate) {
      const updatedDate = new Date(selectedDate)
      updatedDate.setHours(parseInt(newHours), parseInt(newMinutes), 0, 0)
      setSelectedDate(updatedDate)
    }
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)
    const numValue = parseInt(value) || 0
    const clampedValue = Math.min(23, Math.max(0, numValue))
    const formattedValue = clampedValue.toString().padStart(2, "0")
    setHours(formattedValue)
    handleTimeChange(formattedValue, minutes)
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2)
    const numValue = parseInt(value) || 0
    const clampedValue = Math.min(59, Math.max(0, numValue))
    const formattedValue = clampedValue.toString().padStart(2, "0")
    setMinutes(formattedValue)
    handleTimeChange(hours, formattedValue)
  }

  const handleApply = () => {
    if (selectedDate) {
      const finalDate = new Date(selectedDate)
      finalDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      onSelect?.(finalDate)
    } else {
      onSelect?.(undefined)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "PPP 'om' HH:mm", { locale: nl })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="pointer-events-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={disabled}
            initialFocus
            locale={nl}
            className="p-3"
          />
          <div className="border-t p-3 space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tijd selecteren
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor="hours" className="text-xs text-muted-foreground">
                  Uren
                </Label>
                <Input
                  id="hours"
                  type="text"
                  value={hours}
                  onChange={handleHoursChange}
                  className="text-center"
                  placeholder="00"
                  maxLength={2}
                />
              </div>
              <span className="text-2xl font-bold pb-5">:</span>
              <div className="flex-1">
                <Label htmlFor="minutes" className="text-xs text-muted-foreground">
                  Minuten
                </Label>
                <Input
                  id="minutes"
                  type="text"
                  value={minutes}
                  onChange={handleMinutesChange}
                  className="text-center"
                  placeholder="00"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setHours("09")
                  setMinutes("00")
                  handleTimeChange("09", "00")
                }}
              >
                09:00
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setHours("12")
                  setMinutes("00")
                  handleTimeChange("12", "00")
                }}
              >
                12:00
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setHours("18")
                  setMinutes("00")
                  handleTimeChange("18", "00")
                }}
              >
                18:00
              </Button>
            </div>
            <Button onClick={handleApply} className="w-full">
              Toepassen
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
