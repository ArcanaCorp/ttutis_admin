import React, { useState } from 'react';
import { Eye, EyeOff, X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];

const variants = [
    'default',
    'filled',
    'flushed',
    'outline',
    'underline',
];

const states = ['default', 'success', 'warning', 'error', 'info'];

const roundedSizes = [
    'none',
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    '2xl',
    '3xl',
    'full',
];

const statusIcons = {
    success: CheckCircle2,
    warning: AlertCircle,
    error: AlertCircle,
    info: Info,
};

const Input = ({
    // Basic
    name,
    id,
    label,
    placeholder,
    type = 'text',
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,

    // Appearance
    size = 'md',
    variant = 'default',
    rounded = 'md',
    fullWidth = false,

    // Icons
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    leftIconColor,
    rightIconColor,
    iconSize,
    iconStrokeWidth = 2,
    onLeftIconClick,
    onRightIconClick,

    // States
    state = 'default',
    error,
    success,
    warning,
    helperText,
    disabled = false,
    readOnly = false,
    loading = false,

    // Features
    clearable = false,
    showPasswordToggle = false,
    autoFocus = false,

    // Native input props
    required = false,
    autoComplete,
    autoCapitalize,
    autoCorrect,
    maxLength,
    minLength,
    min,
    max,
    step,
    pattern,
    inputMode,
    name: inputName,
    form,
    tabIndex,

    // Customization
    className = '',
    inputClassName = '',
    style,
    inputStyle,
    labelClassName = '',
    helperClassName = '',

    // Events
    onClear,
    onKeyDown,
    onKeyUp,
    onKeyPress,

    ...rest
}) => {

    const [internalValue, setInternalValue] = useState(
        defaultValue ?? ''
    );

    const [focused, setFocused] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const hasValue =
        currentValue !== undefined &&
        currentValue !== null &&
        String(currentValue).length > 0;

    const resolvedState = error
        ? 'error'
        : success
        ? 'success'
        : warning
            ? 'warning'
            : state;

    const message =
        error || success || warning || helperText;

    const messageType = error
        ? 'error'
        : success
        ? 'success'
        : warning
            ? 'warning'
            : state !== 'default'
            ? state
            : 'default';

    const isPassword = type === 'password';
    const actualType =
        isPassword && passwordVisible ? 'text' : type;

    const canClear =
        clearable &&
        hasValue &&
        !disabled &&
        !readOnly;

    const actualIconSize =
        iconSize || (size === 'xs' ? 14 : size === 'sm' ? 16 : 18);

    const StatusIcon = statusIcons[resolvedState];

    const handleChange = (event) => {
        const nextValue = event.target.value;

        if (!isControlled) {
        setInternalValue(nextValue);
        }

        onChange?.(event);
    };

    const handleClear = () => {
        if (!isControlled) {
        setInternalValue('');
        }

        onClear?.();

        if (isControlled) {
        onChange?.({
            target: {
            name: inputName || name,
            value: '',
            },
        });
        }
    };

    const handleFocus = (event) => {
        setFocused(true);
        onFocus?.(event);
    };

    const handleBlur = (event) => {
        setFocused(false);
        onBlur?.(event);
    };

    const classes = [
        'input-field',
        `input-field--${size}`,
        `input-field--${variant}`,
        `input-field--rounded-${rounded}`,
        `input-field--${resolvedState}`,
        focused && 'input-field--focused',
        hasValue && 'input-field--has-value',
        disabled && 'input-field--disabled',
        readOnly && 'input-field--readonly',
        loading && 'input-field--loading',
        fullWidth && 'input-field--full-width',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const generatedId = id || name || inputName;

    return (
        <div className={classes} style={style}>
            {label && (
                <label htmlFor={generatedId} className={`input-field__label ${labelClassName}`} >
                    {label}
                    {required && (
                        <span className="input-field__required">*</span>
                    )}
                </label>
            )}

        <div className="input-field__container">
            {LeftIcon && (
                <button
                    type="button"
                    className={[
                    'input-field__icon',
                    'input-field__icon--left',
                    onLeftIconClick && 'input-field__icon--clickable',
                    ].filter(Boolean).join(' ')}
                    onClick={onLeftIconClick}
                    disabled={!onLeftIconClick || disabled}
                    tabIndex={onLeftIconClick ? 0 : -1}
                    aria-label={onLeftIconClick ? 'Acción del campo' : undefined}
                >
                    <LeftIcon size={actualIconSize} strokeWidth={iconStrokeWidth} color={leftIconColor} />
                </button>
            )}

            <input
                id={generatedId}
                name={inputName || name}
                type={actualType}
                value={currentValue ?? ''}
                placeholder={placeholder}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={onKeyDown}
                onKeyUp={onKeyUp}
                onKeyPress={onKeyPress}
                disabled={disabled}
                readOnly={readOnly}
                required={required}
                autoFocus={autoFocus}
                autoComplete={autoComplete}
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrect}
                maxLength={maxLength}
                minLength={minLength}
                min={min}
                max={max}
                step={step}
                pattern={pattern}
                inputMode={inputMode}
                form={form}
                tabIndex={tabIndex}
                className={`input-field__control ${inputClassName}`}
                style={inputStyle}
                aria-invalid={resolvedState === 'error'}
                aria-describedby={
                    message ? `${generatedId}-message` : undefined
                }
                {...rest}
            />

            {loading && (
                <span className="input-field__spinner" aria-hidden="true" />
            )}

            {canClear && (
            <button type="button" className="input-field__action" onClick={handleClear} aria-label="Limpiar campo" >
                <X size={actualIconSize} />
            </button>
            )}

            {isPassword && showPasswordToggle && !disabled && (
            <button
                type="button"
                className="input-field__action"
                onClick={() => setPasswordVisible(!passwordVisible)}
                aria-label={
                passwordVisible
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
            >
                {passwordVisible
                ? <EyeOff size={actualIconSize} />
                : <Eye size={actualIconSize} />}
            </button>
            )}

            {RightIcon && !canClear && !loading && (
            <button
                type="button"
                className={[
                'input-field__icon',
                'input-field__icon--right',
                onRightIconClick && 'input-field__icon--clickable',
                ].filter(Boolean).join(' ')}
                onClick={onRightIconClick}
                disabled={!onRightIconClick || disabled}
                tabIndex={onRightIconClick ? 0 : -1}
                aria-label={onRightIconClick ? 'Acción del campo' : undefined}
            >
                <RightIcon
                size={actualIconSize}
                strokeWidth={iconStrokeWidth}
                color={rightIconColor}
                />
            </button>
            )}

            {StatusIcon && resolvedState !== 'default' && (
            <span className="input-field__status-icon">
                <StatusIcon size={actualIconSize} />
            </span>
            )}
        </div>

        {message && (
            <div
            id={`${generatedId}-message`}
            className={[
                'input-field__message',
                `input-field__message--${messageType}`,
                helperClassName,
            ].join(' ')}
            role={messageType === 'error' ? 'alert' : undefined}
            >
            {message}
            </div>
        )}
        </div>
    );

};

export default Input;