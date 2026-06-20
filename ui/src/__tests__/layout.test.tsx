import React from 'react';
import '@testing-library/jest-dom';
import RootLayout, { metadata } from '@/app/layout';

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'mock-geist-sans' }),
  Geist_Mono: () => ({ variable: 'mock-geist-mono' }),
}));

describe('RootLayout', () => {
  it('renders children correctly and sets font variables on html element', () => {
    const result = RootLayout({
      children: <div data-testid="child-element">Hello Visor</div>,
    });

    // Verify root is html tag
    expect(result.type).toBe('html');
    expect(result.props.lang).toBe('en');
    expect(result.props.className).toContain('mock-geist-sans');
    expect(result.props.className).toContain('mock-geist-mono');
    expect(result.props.className).toContain('h-full');
    expect(result.props.className).toContain('antialiased');

    // Verify body element exists
    const body = result.props.children;
    expect(body.type).toBe('body');
    expect(body.props.className).toContain('min-h-full');
    expect(body.props.className).toContain('flex');
    expect(body.props.className).toContain('flex-col');

    // Verify children are passed inside body
    const child = body.props.children;
    expect(child.props['data-testid']).toBe('child-element');
  });

  it('exports correct metadata configuration', () => {
    expect(metadata.metadataBase?.toString()).toBe('https://visor.edycu.dev/');
    expect(metadata.title).toBe('Visor — Privacy-Blind Submission Agent');
    expect(metadata.description).toBe(
      'Secure appointment booking and intake form submissions via TEE enclaves. Keeps personal data completely hidden from AI agents.'
    );
    expect(metadata.icons).toEqual({
      icon: '/icon.svg',
      apple: '/apple-touch-icon.png',
    });
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      title: 'Visor',
      statusBarStyle: 'black-translucent',
    });
    expect(metadata.other).toEqual({
      'mobile-web-app-capable': 'yes',
    });
    expect(metadata.openGraph?.title).toBe('Visor — Privacy-Blind Submission Agent');
    expect(metadata.openGraph?.url).toBe('https://visor.edycu.dev');
    expect((metadata.twitter as Record<string, unknown>)?.card).toBe('summary_large_image');
  });
});
