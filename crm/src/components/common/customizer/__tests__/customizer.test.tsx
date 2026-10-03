import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { resolveHeroBanner, HERO_TEXT_LIMITS } from '@/lib/heroBannerStore';
import { fromStored, toStored, EMPTY_QUOTE_BANNER_CONFIG } from '@/lib/quoteBannerStore';
import { weatherFromStored, weatherToStored } from '@/lib/weatherStore';
import { ImageUploadField, IMAGE_SPECS } from '@/components/common/customizer/ImageUploadField';

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }),
}));
vi.mock('@/api/customizationsApi', () => ({
  uploadCustomizationImage: vi.fn(async () => ({ url: '/static/uploads/customizations/1/a.png', width: 100, height: 50 })),
}));

const text = { eyebrow: 'E', title: 'T', subtitle: 'S' };

describe('hero resolution', () => {
  it('is empty by default (no hardcoded image)', () => {
    const b = resolveHeroBanner(undefined, undefined, text);
    expect(b.imageUrl).toBe('');
    expect(b.title).toBe('T');
  });
  it('page override beats user default, which beats empty', () => {
    const all = { image_url: '/static/uploads/a.png', zoom: 150 };
    expect(resolveHeroBanner(undefined, all, text).imageUrl).toBe('/static/uploads/a.png');
    expect(resolveHeroBanner(undefined, all, text).zoom).toBe(150);
    const page = { image_url: '/static/uploads/b.png', zoom: 110, title: 'Mine' };
    const b = resolveHeroBanner(page, all, text);
    expect(b.imageUrl).toBe('/static/uploads/b.png');
    expect(b.zoom).toBe(110);
    expect(b.title).toBe('Mine');
  });
  it('text limits match the backend', () => {
    expect(HERO_TEXT_LIMITS).toEqual({ eyebrow: 80, title: 60, subtitle: 160 });
  });
});

describe('store mappers', () => {
  it('quote banner round-trips and starts empty', () => {
    expect(fromStored(undefined)).toEqual(EMPTY_QUOTE_BANNER_CONFIG);
    const cfg = { ...EMPTY_QUOTE_BANNER_CONFIG, singleImageUrl: '/static/uploads/q.png', linkUrl: ' ' };
    const stored = toStored(cfg);
    expect(stored.link_url).toBeNull();
    expect(fromStored(stored as never).singleImageUrl).toBe('/static/uploads/q.png');
  });
  it('weather starts without an image', () => {
    expect(weatherFromStored(undefined).customImage).toBe('');
    expect(weatherToStored(weatherFromStored(undefined)).custom_image).toBe('');
  });
});

describe('ImageUploadField', () => {
  it('shows the recommended size in the empty state', () => {
    render(<ImageUploadField label="Banner" images={[]} onChange={() => {}} spec={IMAGE_SPECS.hero} />);
    expect(screen.getByTestId('image-spec-hint').textContent).toContain('2400×600');
    expect(screen.getByTestId('image-spec-hint').textContent).toContain('8 MB');
  });
  it('uploads a file and reports the url', async () => {
    const onChange = vi.fn();
    render(<ImageUploadField label="Banner" images={[]} onChange={onChange} spec={IMAGE_SPECS.quote} />);
    const file = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('image-upload-input'), { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['/static/uploads/customizations/1/a.png']));
  });
  it('removes and reorders in multiple mode', () => {
    const onChange = vi.fn();
    render(<ImageUploadField label="S" images={['/a.png', '/b.png']} onChange={onChange} spec={IMAGE_SPECS.quote} multiple />);
    fireEvent.click(screen.getAllByLabelText('Move right')[0]);
    expect(onChange).toHaveBeenCalledWith(['/b.png', '/a.png']);
    fireEvent.click(screen.getAllByLabelText('Remove image')[1]);
    expect(onChange).toHaveBeenCalledWith(['/a.png']);
  });
});
