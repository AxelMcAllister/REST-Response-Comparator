import { useRef, useCallback } from 'react'

interface LineNumberedTextareaProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

/**
 * A textarea with a non-intrusive line-number gutter on the left.
 * The gutter scrolls in sync with the textarea.
 */
export default function LineNumberedTextarea({
    value,
    onChange,
    placeholder,
    className = '',
}: Readonly<LineNumberedTextareaProps>) {
    const gutterRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const lineCount = value ? value.split('\n').length : 1

    // Keep the gutter scroll in sync with the textarea scroll
    const handleScroll = useCallback(() => {
        if (gutterRef.current && textareaRef.current) {
            gutterRef.current.scrollTop = textareaRef.current.scrollTop
        }
    }, [])

    return (
        <div className={`lnt-wrapper ${className}`}>
            {/* Line number gutter */}
            <div className="lnt-gutter" ref={gutterRef} aria-hidden="true">
                {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} className="lnt-line-number">
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* The actual textarea */}
            <textarea
                ref={textareaRef}
                className="lnt-textarea"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false}
            />
        </div>
    )
}
