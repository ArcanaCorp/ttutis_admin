import { useId } from 'react';

const variants = [
    'primary',
    'primarySoft',
    'secondary',
    'secondarySoft',
    'outline',
    'ghost',
    'danger',
    'dangerSoft',
    'success',
    'successSoft',
    'warning',
    'warningSoft',
    'info',
    'infoSoft',
    'link',
];

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];

const radiusValues = [
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

/* ========================================
   BUTTON COMPONENT
======================================== */

export default function Button({
    children,

    // Appearance
    variant = 'primary',
    size = 'md',
    rounded = 'md',

    // Icon
    icon: Icon,
    iconPosition = 'left',
    iconOnly = false,
    iconSize,
    iconColor,
    iconStrokeWidth = 2,

    // State
    loading = false,
    disabled = false,

    // Layout
    fullWidth = false,
    flex = false,

    // Content
    loadingText,

    // Interaction
    onPress,
    onClick,
    onLongPress,
    onPressIn,
    onPressOut,

    // Accessibility
    accessibilityLabel,
    accessibilityHint,

    // Customization
    color,
    backgroundColor,
    borderColor,
    borderWidth,
    opacity = 0.5,
    elevation = 0,

    // Native-like props
    testID,
    type = 'button',

    // HTML props
    className = '',
    style,
    id,
    title,
    name,
    value,
    form,
    autoFocus,
    tabIndex,

    ...rest
}) {
    const generatedId = useId();
    
    /* ========================================
        CONFIGURATION
    ======================================== */

    const selectedVariant = variants.includes(variant) ? variant : 'primary';

    const selectedSize = sizes.includes(size) ? size : 'md';

    const selectedRadius = radiusValues.includes(rounded) ? rounded : 'md';

    const isDisabled = disabled || loading;

    const showIcon = Boolean(Icon);
    const showChildren = !iconOnly && children != null;

    const currentIconSize = iconSize ?? {
        xs: 14,
        sm: 16,
        md: 18,
        lg: 20,
        xl: 22,
    }[selectedSize];

    const foreground = color;
    const background = backgroundColor;

    /* ========================================
        CSS VARIABLES
    ======================================== */

    const customStyles = {
        ...style,

        ...(foreground && {
        '--button-color': foreground,
        }),

        ...(background && {
        '--button-bg': background,
        }),

        ...(borderColor && {
        '--button-border': borderColor,
        }),

        ...(borderWidth !== undefined && {
        '--button-border-width': `${borderWidth}px`,
        }),

        '--button-opacity': opacity,

        ...(elevation > 0 && {
        boxShadow: `0 2px 4px rgba(0, 0, 0, 0.12)`,
        }),
    };

    /* ========================================
        CLASS NAMES
    ======================================== */

    const buttonClasses = [
        'button',

        `button--${selectedVariant.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
        )}`,

        `button--${selectedSize}`,
        `button--rounded-${selectedRadius}`,

        fullWidth && 'button--full-width',
        flex && 'button--flex',
        iconOnly && 'button--icon-only',
        loading && 'button--loading',

        showIcon && !iconOnly
        ? `button--icon-${iconPosition}`
        : '',

        elevation > 0 && 'button--elevation',

        className,
    ]
        .filter(Boolean)
        .join(' ');

    /* ========================================
        ICON
    ======================================== */

    const renderIcon = () => {
        if (!showIcon || loading) return null;

        return (
            <span className="button__icon" aria-hidden="true">
                <Icon size={currentIconSize} color={iconColor || foreground || 'currentColor'} strokeWidth={iconStrokeWidth} />
            </span>
        );
    };

    /* ========================================
        LOADING
    ======================================== */

    const renderLoading = () => (
        <>
            <span className="button__spinner" role="presentation"/>
            {loadingText && (
                <span className="button__text">{loadingText}</span>
            )}
        </>
    );

    /* ========================================
        CONTENT
    ======================================== */

    const renderContent = () => {
        if (loading) {
            return renderLoading();
        }

        if (iconOnly) {
            return renderIcon();
        }

        return (
            <>
                {iconPosition === 'left' && renderIcon()}

                {showChildren && (
                    <span className="button__text">
                        {children}
                    </span>
                )}

                {iconPosition === 'right' && renderIcon()}
            </>
        );
    };

    /* ========================================
        RENDER
    ======================================== */

    return (
        <button
            {...rest}
            id={id}
            type={type}
            name={name}
            value={value}
            form={form}
            title={title}
            autoFocus={autoFocus}
            tabIndex={tabIndex}

            data-testid={testID}

            className={buttonClasses}
            style={customStyles}

            disabled={isDisabled}

            onClick={onPress || onClick}
            onPointerDown={onPressIn}
            onPointerUp={onPressOut}
            onContextMenu={onLongPress
                ? (event) => {
                    event.preventDefault();
                    onLongPress(event);
                }
                : undefined
            }

            aria-label={
                accessibilityLabel ||
                (iconOnly && typeof children === 'string'
                ? children
                : undefined)
            }

            aria-describedby={accessibilityHint ? `${id || testID || generatedId}-hint` : undefined}
            aria-disabled={isDisabled}
            aria-busy={loading}
        >
            <span className="button__content">
                {renderContent()}
            </span>
            {accessibilityHint && (
                <span id={`${id || testID || generatedId}-hint`} className="sr-only">
                    {accessibilityHint}
                </span>
            )}
        </button>
    );
}

