import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;

// ─── Anthropic Client ─────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── In-memory store (swap for DB in production) ──────────────────────────────
let postQueue = [];
let postHistory = [];
let schedulerEnabled = false;

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    fbConfigured: !!(process.env.FB_ACCESS_TOKEN && process.env.FB_PAGE_ID),
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
});

// ─── GENERATE CONTENT (Claude) ────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt || 'You are a world-class social media copywriter who specializes in Russell Brunson\'s marketing frameworks. You write posts that feel authentic, not salesy.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    res.json({ text, usage: message.usage });
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUBLISH TO FACEBOOK ──────────────────────────────────────────────────────
app.post('/api/publish', async (req, res) => {
  try {
    const { content, accessToken, pageId } = req.body;
    const token = accessToken || process.env.FB_ACCESS_TOKEN;
    const page = pageId || process.env.FB_PAGE_ID;

    if (!token || !page) {
      return res.status(400).json({ error: 'Facebook credentials not configured. Add FB_ACCESS_TOKEN and FB_PAGE_ID to your .env file.' });
    }
    if (!content) {
      return res.status(400).json({ error: 'Post content is required.' });
    }

    const fbResponse = await fetch(
      `https://graph.facebook.com/v19.0/${page}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          access_token: token,
        }),
      }
    );

    const data = await fbResponse.json();

    if (data.error) {
      console.error('Facebook API error:', data.error);
      return res.status(400).json({
        error: data.error.message,
        type: data.error.type,
        code: data.error.code,
      });
    }

    if (data.id) {
      const published = {
        fbPostId: data.id,
        content,
        publishedAt: new Date().toISOString(),
        status: 'published',
      };
      postHistory.unshift(published);
      console.log(`✅ Published to Facebook: ${data.id}`);
      return res.json({ success: true, postId: data.id, published });
    }

    res.status(500).json({ error: 'Unexpected response from Facebook — no post ID returned.' });
  } catch (err) {
    console.error('Publish error:', err.message);
    res.status(500).json({ error: 'Network error reaching Facebook. Check your internet connection.' });
  }
});

// ─── FETCH COMMENTS ON A POST ─────────────────────────────────────────────────
app.get('/api/comments/:postId', async (req, res) => {
  try {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) return res.status(400).json({ error: 'FB_ACCESS_TOKEN not set.' });

    const fbResponse = await fetch(
      `https://graph.facebook.com/v19.0/${req.params.postId}/comments?fields=id,message,from,created_time&access_token=${token}`
    );
    const data = await fbResponse.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ comments: data.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REPLY TO A COMMENT ───────────────────────────────────────────────────────
app.post('/api/comments/:commentId/reply', async (req, res) => {
  try {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) return res.status(400).json({ error: 'FB_ACCESS_TOKEN not set.' });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Reply message is required.' });

    const fbResponse = await fetch(
      `https://graph.facebook.com/v19.0/${req.params.commentId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: token }),
      }
    );
    const data = await fbResponse.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ success: true, replyId: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST QUEUE MANAGEMENT ───────────────────────────────────────────────────
app.get('/api/queue', (req, res) => res.json({ queue: postQueue, history: postHistory }));

app.post('/api/queue', (req, res) => {
  const { content, framework, scheduledFor, image } = req.body;
  const post = {
    id: Date.now().toString(),
    content,
    framework,
    image,
    scheduledFor,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };
  postQueue.push(post);
  console.log(`📅 Queued post for ${scheduledFor}`);
  res.json({ success: true, post });
});

app.delete('/api/queue/:id', (req, res) => {
  postQueue = postQueue.filter((p) => p.id !== req.params.id);
  res.json({ success: true });
});

// ─── SCHEDULER (2 posts/day at 9AM & 9PM) ────────────────────────────────────
app.post('/api/scheduler/toggle', (req, res) => {
  schedulerEnabled = !schedulerEnabled;
  console.log(`⏰ Scheduler ${schedulerEnabled ? 'ENABLED' : 'DISABLED'}`);
  res.json({ enabled: schedulerEnabled });
});

app.get('/api/scheduler/status', (req, res) => {
  res.json({ enabled: schedulerEnabled, queueLength: postQueue.length });
});

// Run at 9:00 AM and 9:00 PM every day
cron.schedule('0 9,21 * * *', async () => {
  if (!schedulerEnabled || postQueue.length === 0) return;

  const nextPost = postQueue[0];
  console.log(`⏰ Auto-publishing scheduled post...`);

  try {
    const token = process.env.FB_ACCESS_TOKEN;
    const page = process.env.FB_PAGE_ID;

    const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${page}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: nextPost.content, access_token: token }),
    });

    const data = await fbResponse.json();
    if (data.id) {
      postQueue.shift();
      postHistory.unshift({
        ...nextPost,
        fbPostId: data.id,
        publishedAt: new Date().toISOString(),
        status: 'published',
      });
      console.log(`✅ Auto-published: ${data.id}`);
    } else {
      console.error('❌ Auto-publish failed:', data.error?.message);
    }
  } catch (err) {
    console.error('❌ Auto-publish error:', err.message);
  }
});

// ─── SERVE FRONTEND IN PRODUCTION ─────────────────────────────────────────────
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');

import fs from 'fs';
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
  console.log('  📦 Serving production build from /dist');
}

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ⚡ Facebook AI Agent — Backend Server');
  console.log(`  🌐 Running on http://0.0.0.0:${PORT}`);
  console.log(`  📘 Facebook: ${process.env.FB_PAGE_ID ? '✅ Configured' : '❌ Missing FB_PAGE_ID'}`);
  console.log(`  🤖 Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing ANTHROPIC_API_KEY'}`);
  console.log('');
});
