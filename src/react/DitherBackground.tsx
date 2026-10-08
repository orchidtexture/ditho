import React, { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import { createDither, DitherInstance, DitherOptions } from '../index';

export interface DitherBackgroundProps extends React.HTMLAttributes<HTMLElement>, DitherOptions {
  /** Underlying HTML element tag or component to render (defaults to 'div') */
  as?: React.ElementType;
  /** Fallback background color rendered in SSR and before WebGL initialization */
  fallbackColor?: string;
  /** Children to render above the background */
  children?: React.ReactNode;
}

export interface DitherBackgroundHandle {
  /** The underlying DOM element */
  element: HTMLElement | null;
  /** The underlying Dither instance (available on client after mount) */
  instance: DitherInstance | null;
}

export const DitherBackground = forwardRef<HTMLElement, DitherBackgroundProps>(
  (
    {
      as: Component = 'div',
      preset,
      colors,
      dither,
      pixelSize,
      scale,
      intensity,
      speed,
      seed,
      maxDpr,
      resolutionScale,
      fpsLimit,
      reducedMotion,
      paused,
      fallbackColor = '#0d0f18',
      className = '',
      style,
      children,
      ...restProps
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLElement | null>(null);
    const instanceRef = useRef<DitherInstance | null>(null);

    // Sync forwarded ref
    useImperativeHandle(forwardedRef, () => internalRef.current as HTMLElement);

    // Initial mount on client
    useEffect(() => {
      const element = internalRef.current;
      if (!element) return;

      const instance = createDither(element, {
        preset,
        colors,
        dither,
        pixelSize,
        scale,
        intensity,
        speed,
        seed,
        maxDpr,
        resolutionScale,
        fpsLimit,
        reducedMotion,
        paused,
      });

      instanceRef.current = instance;

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
    }, []); // Only remount on element change / Strict Mode

    // Safe declarative updates without remounting the canvas
    useEffect(() => {
      if (instanceRef.current) {
        instanceRef.current.update({
          preset,
          colors,
          dither,
          pixelSize,
          scale,
          intensity,
          speed,
          seed,
          maxDpr,
          resolutionScale,
          fpsLimit,
          reducedMotion,
          paused,
        });
      }
    }, [
      preset,
      colors,
      dither,
      pixelSize,
      scale,
      intensity,
      speed,
      seed,
      maxDpr,
      resolutionScale,
      fpsLimit,
      reducedMotion,
      paused,
    ]);

    const combinedClassName = `dither-host ${className}`.trim();
    const combinedStyle: React.CSSProperties = {
      backgroundColor: fallbackColor,
      ...style,
    };

    return (
      <Component
        ref={internalRef}
        className={combinedClassName}
        style={combinedStyle}
        {...restProps}
      >
        {children}
      </Component>
    );
  }
);

DitherBackground.displayName = 'DitherBackground';
