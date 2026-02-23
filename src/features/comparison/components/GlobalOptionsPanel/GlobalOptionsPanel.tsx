import { useState, useEffect } from 'react'
import { useComparisonStore } from '../../store/comparisonStore'
import type { ComparisonOptions } from '@/shared/types'
import './GlobalOptionsPanel.css'

export const GlobalOptionsPanel = () => {
    const [isOpen, setIsOpen] = useState(false)
    const { globalOptions, updateGlobalOptions } = useComparisonStore()

    // Local state for the modal, initialized when opened
    const [localOptions, setLocalOptions] = useState<ComparisonOptions>(globalOptions)

    useEffect(() => {
        if (isOpen) {
            setLocalOptions(globalOptions)
        }
    }, [isOpen, globalOptions])

    const handleCustomPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const paths = e.target.value
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)

        setLocalOptions(prev => ({ ...prev, customIgnorePaths: paths }))
    }

    const handleSave = () => {
        updateGlobalOptions(localOptions)
        setIsOpen(false)
    }

    const handleCancel = () => {
        setIsOpen(false)
    }

    return (
        <>
            <button
                className="config-btn config-btn-settings"
                onClick={() => setIsOpen(true)}
                title="Comparison Settings"
            >
                <span className="config-btn-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                </span>
                Settings
            </button>

            {isOpen && (
                <div className="global-options-modal-overlay">
                    <div className="global-options-modal">
                        <div className="global-options-header">
                            <h3>Comparison Settings</h3>
                            <p className="global-options-desc">These settings apply to all cURL comparisons globally.</p>
                        </div>

                        <div className="global-options-list">
                            <label className="global-option-item">
                                <input
                                    type="checkbox"
                                    checked={localOptions.ignoreTimestamps}
                                    onChange={(e) => setLocalOptions({ ...localOptions, ignoreTimestamps: e.target.checked })}
                                />
                                <div className="global-option-text">
                                    <span className="global-option-label">Ignore Timestamps</span>
                                    <span className="global-option-hint">Ignores changes to common timestamp fields (e.g. updatedAt)</span>
                                </div>
                            </label>

                            <label className="global-option-item">
                                <input
                                    type="checkbox"
                                    checked={localOptions.ignoreIds}
                                    onChange={(e) => setLocalOptions({ ...localOptions, ignoreIds: e.target.checked })}
                                />
                                <div className="global-option-text">
                                    <span className="global-option-label">Ignore IDs</span>
                                    <span className="global-option-hint">Ignores changes to automatically generated ID fields</span>
                                </div>
                            </label>

                            <label className="global-option-item">
                                <input
                                    type="checkbox"
                                    checked={localOptions.ignoreWhitespace}
                                    onChange={(e) => setLocalOptions({ ...localOptions, ignoreWhitespace: e.target.checked })}
                                />
                                <div className="global-option-text">
                                    <span className="global-option-label">Ignore Whitespace</span>
                                    <span className="global-option-hint">Ignores differences in formatting & whitespace</span>
                                </div>
                            </label>

                            <label className="global-option-item">
                                <input
                                    type="checkbox"
                                    checked={localOptions.caseInsensitive}
                                    onChange={(e) => setLocalOptions({ ...localOptions, caseInsensitive: e.target.checked })}
                                />
                                <div className="global-option-text">
                                    <span className="global-option-label">Case Insensitive</span>
                                    <span className="global-option-hint">Ignores differences in text casing</span>
                                </div>
                            </label>

                            <label className="global-option-item">
                                <input
                                    type="checkbox"
                                    checked={localOptions.ignoreArrayOrder}
                                    onChange={(e) => setLocalOptions({ ...localOptions, ignoreArrayOrder: e.target.checked })}
                                />
                                <div className="global-option-text">
                                    <span className="global-option-label">Ignore Array Order</span>
                                    <span className="global-option-hint">Treats arrays as sets (order doesn't matter)</span>
                                </div>
                            </label>

                            <div className="global-option-input-group">
                                <label htmlFor="custom-ignore-paths" className="global-option-label">Custom Ignore Paths</label>
                                <input
                                    id="custom-ignore-paths"
                                    type="text"
                                    placeholder="e.g. $.metadata.version, $.traceId"
                                    defaultValue={localOptions.customIgnorePaths?.join(', ')}
                                    onBlur={handleCustomPathChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCustomPathChange(e as any)
                                            e.currentTarget.blur()
                                        }
                                    }}
                                />
                                <span className="global-option-hint">Provide JSONPath expressions separated by commas.</span>
                            </div>
                        </div>

                        <div className="global-options-actions">
                            <button className="global-options-btn-cancel" onClick={handleCancel}>Cancel</button>
                            <button className="global-options-btn-ok" onClick={handleSave}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
