import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'

interface PinInputProps {
  length?: number
  onComplete: (pin: string) => void
  disabled?: boolean
  error?: boolean
}

export function PinInput({
  length = 4,
  onComplete,
  disabled = false,
  error = false,
}: PinInputProps): JSX.Element {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Clear on error
  useEffect(() => {
    if (error) {
      setValues(Array(length).fill(''))
      inputRefs.current[0]?.focus()
    }
  }, [error, length])

  const handleChange = (index: number, value: string): void => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newValues = [...values]
    newValues[index] = value
    setValues(newValues)

    // Move to next input or complete
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    } else if (value && index === length - 1) {
      const pin = newValues.join('')
      if (pin.length === length) {
        onComplete(pin)
      }
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, length)

    if (!/^\d+$/.test(pastedData)) return

    const newValues = [...values]
    for (let i = 0; i < pastedData.length; i++) {
      newValues[i] = pastedData[i] ?? ''
    }
    setValues(newValues)

    if (pastedData.length === length) {
      onComplete(pastedData)
    } else {
      inputRefs.current[pastedData.length]?.focus()
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`
            w-14 h-16 text-center text-2xl font-bold
            bg-slate-800 border-2 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500
            transition-colors
            ${error ? 'border-red-500 animate-shake' : 'border-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={`PIN digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
