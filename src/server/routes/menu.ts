import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();
    return c.json<UiResponse>({
      showToast: `rShield Dashboard post created! ID: ${post.id}`,
    });
  } catch (error) {
    console.error('Error creating post via menu:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return c.json<UiResponse>({
      showToast: `Failed to create dashboard post: ${msg}`,
    });
  }
});

menu.post('/example-form', async (c) => {
  return c.json<UiResponse>({
    showToast: 'rShield configuration form is not configured.',
  });
});