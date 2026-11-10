export default function Switch({
    checked,
    onChange,
    label,
    disabled = false,
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`ui-switch ${checked ? "ui-switch--checked" : ""}`}
        >
            <span
                aria-hidden="true"
                className={`ui-switch__thumb ${checked ? "ui-switch__thumb--checked" : ""}`}
            />
        </button>
    );
}
