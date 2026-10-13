import { describe, it, expect } from 'vitest';
import {
  extractYouTubeVideoId,
  extractVimeoVideoId,
  parseExternalResource
} from '@edtech/utils';

describe('Smart External Resource & YouTube Embed Detection Test Suite', () => {
  it('1. Extracts YouTube video ID from standard watch URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const videoId = extractYouTubeVideoId(url);
    expect(videoId).toBe('dQw4w9WgXcQ');
  });

  it('2. Extracts YouTube video ID from watch URL with extra query params', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&feature=shared';
    const videoId = extractYouTubeVideoId(url);
    expect(videoId).toBe('dQw4w9WgXcQ');
  });

  it('3. Extracts YouTube video ID from shortened youtu.be URL', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    const videoId = extractYouTubeVideoId(url);
    expect(videoId).toBe('dQw4w9WgXcQ');
  });

  it('4. Extracts YouTube video ID from embed URL', () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    const videoId = extractYouTubeVideoId(url);
    expect(videoId).toBe('dQw4w9WgXcQ');
  });

  it('5. Extracts YouTube video ID from Shorts URL', () => {
    const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
    const videoId = extractYouTubeVideoId(url);
    expect(videoId).toBe('dQw4w9WgXcQ');
  });

  it('6. Extracts Vimeo video ID from standard vimeo URL', () => {
    const url = 'https://vimeo.com/123456789';
    const videoId = extractVimeoVideoId(url);
    expect(videoId).toBe('123456789');
  });

  it('7. Extracts Vimeo video ID from player.vimeo.com URL', () => {
    const url = 'https://player.vimeo.com/video/123456789';
    const videoId = extractVimeoVideoId(url);
    expect(videoId).toBe('123456789');
  });

  it('8. parseExternalResource generates safe youtube-nocookie embed URL', () => {
    const parsed = parseExternalResource('https://youtu.be/dQw4w9WgXcQ');
    expect(parsed.provider).toBe('YOUTUBE');
    expect(parsed.videoId).toBe('dQw4w9WgXcQ');
    expect(parsed.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(parsed.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('9. parseExternalResource handles Vimeo link correctly', () => {
    const parsed = parseExternalResource('https://vimeo.com/987654321');
    expect(parsed.provider).toBe('VIMEO');
    expect(parsed.videoId).toBe('987654321');
    expect(parsed.embedUrl).toBe('https://player.vimeo.com/video/987654321');
  });

  it('10. parseExternalResource categorizes generic website URL', () => {
    const parsed = parseExternalResource('https://developer.mozilla.org/en-US/');
    expect(parsed.provider).toBe('WEBSITE');
    expect(parsed.embedUrl).toBeUndefined();
    expect(parsed.videoId).toBeUndefined();
  });
});
