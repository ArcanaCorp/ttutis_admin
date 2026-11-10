'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ========================================
   CONFIGURATION
======================================== */

const variants = [
    'default',
    'stat',
    'statIcon',
    'statTrend',
    'progress',
    'activity',
    'communication',
    'horizontal',
    'interactive',
    'highlight',
];

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];

const iconVariants = [
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
    'info',
    'neutral',
];

/* ========================================
   CARD ICON
======================================== */

function CardIcon({ icon: Icon, variant = 'primary', size = 'md', color }) {
  
    if (!Icon) return null;
    
    const selectedVariant = iconVariants.includes(variant) ? variant : 'primary';

    return (
        <span className={['card__icon', `card__icon--${selectedVariant}`, `card__icon--${size}`,].join(' ')} style={color ? { color } : undefined} aria-hidden="true">
            <Icon />
        </span>
    );
}

/* ========================================
   CARD BADGE
======================================== */

function CardBadge({children, variant = 'neutral'}) {
    if (!children) return null;

    const selectedVariant = [
        'primary',
        'success',
        'warning',
        'danger',
        'info',
        'neutral',
    ].includes(variant) ? variant : 'neutral';

    return (
        <span className={`card__badge card__badge--${selectedVariant}`}>{children}</span>
    );
}

/* ========================================
   CARD TREND
======================================== */

function CardTrend({ value, direction = 'neutral', label }) {
    
    const TrendIcon = {
        up: TrendingUp,
        down: TrendingDown,
        neutral: Minus,
    }[direction] || Minus;

    return (
        <span className={`card__trend card__trend--${direction}`}>
            <TrendIcon />
            {value}
            {label && <span>{label}</span>}
        </span>
    );
}

/* ========================================
   CARD PROGRESS
======================================== */

function CardProgress({ value = 0, color = 'primary', label = 'Progreso', description, total }) {
  
    const percentage = Math.min(100, Math.max(0, Number(value) || 0));

    return (
        <div className="card__body">
            <div className="card__progress-header">
                <span className="card__progress-label">{label}</span>
                <span className="card__progress-value">{percentage.toFixed(1)}%</span>
            </div>

            <div className="card__progress-track" role="progressbar" aria-label={label} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                <div className={`card__progress-bar ${color !== 'primary' ? `card__progress-bar--${color}` : ''}`} style={{'--progress-value': `${percentage}%`}} />
            </div>

            {(description || total !== undefined) && (
                <div className="card__progress-footer">
                    {description && <span>{description}</span>}
                    {total !== undefined && <span>{total}</span>}
                </div>
            )}
        </div>
    );

}

/* ========================================
   CARD COMPONENT
======================================== */

export default function Card({
    children,

    // Appearance
    variant = 'default',
    size = 'md',

    // Header
    title,
    subtitle,
    badge,
    badgeVariant = 'neutral',

    // Icon
    icon,
    iconVariant = 'primary',
    iconSize = 'md',
    iconColor,

    // Statistics
    value,
    description,

    // Trend
    trend,
    trendDirection = 'neutral',
    trendLabel,

    // Progress
    progress,
    progressColor = 'primary',
    progressLabel = 'Progreso',
    progressDescription,
    progressTotal,

    // Activity
    date,

    // Communication
    type,
    audience,
    priority,

    // Footer
    footer,

    // State
    loading = false,

    // Interaction
    onClick,

    // Customization
    className = '',
    style,
    id,

    ...rest
}) {

    const selectedVariant = variants.includes(variant) ? variant : 'default';

    const selectedSize = sizes.includes(size) ? size : 'md';

    const isInteractive = Boolean(onClick) || variant === 'interactive';

    const classes = [
        'card',
        `card--${selectedVariant.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
        )}`,
        `card--${selectedSize}`,
        isInteractive && 'card--interactive',
        loading && 'card--loading',
        className,
    ].filter(Boolean).join(' ');

    const handleKeyDown = (event) => {
        if (!onClick) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick(event);
        }
    };

    if (loading) {
        return (
            <article id={id} className={classes} style={style} aria-busy="true" {...rest}>
                <div className="card__skeleton card__skeleton--short" />
                <div className="card__skeleton card__skeleton--large" />
                <div className="card__skeleton card__skeleton--medium" />
            </article>
        );
    }

    return (
        <div id={id} className={classes} style={style} onClick={onClick} onKeyDown={handleKeyDown} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} {...rest}>

        {(title || subtitle || badge || icon) && (
            <div className="card__header">
            <div className="card__header-content">
                {title && (
                <h3 className="card__title">
                    {title}
                </h3>
                )}

                {subtitle && (
                <p className="card__subtitle">
                    {subtitle}
                </p>
                )}
            </div>

            {badge && (
                <CardBadge variant={badgeVariant}>
                {badge}
                </CardBadge>
            )}

            {icon && (
                <CardIcon
                icon={icon}
                variant={iconVariant}
                size={iconSize}
                color={iconColor}
                />
            )}
            </div>
        )}

        {/* Body */}

        <div className="card__body">

            {/* Statistics */}

            {value !== undefined && (
            <div className="card__stat">
                <span className="card__stat-value">
                {value}
                </span>

                {description && (
                <span className="card__stat-description">
                    {description}
                </span>
                )}
            </div>
            )}

            {/* Trend */}

            {trend !== undefined && (
            <CardTrend
                value={trend}
                direction={trendDirection}
                label={trendLabel}
            />
            )}

            {/* Progress */}

            {progress !== undefined && (
            <CardProgress
                value={progress}
                color={progressColor}
                label={progressLabel}
                description={progressDescription}
                total={progressTotal}
            />
            )}

            {/* Activity / Communication */}

            {date && (
            <span className="card__activity-date">
                {date}
            </span>
            )}

            {type && (
            <CardBadge variant="info">
                {type}
            </CardBadge>
            )}

            {audience && (
            <span className="card__subtitle">
                {audience}
            </span>
            )}

            {priority && (
            <CardBadge
                variant={
                priority === 'Alta'
                    ? 'danger'
                    : 'neutral'
                }
            >
                {priority}
            </CardBadge>
            )}

            {children}

        </div>

        {/* Footer */}

        {footer && (
            <div className="card__footer">
            {footer}
            </div>
        )}
        </div>
    );

}

/* ========================================
   SUBCOMPONENT EXPORTS
======================================== */

export {
    CardIcon,
    CardBadge,
    CardTrend,
    CardProgress,
};