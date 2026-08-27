/**
 * Local stand-in for the tcnexus-lms WordPress REST API, used until a real
 * WordPress instance with the plugin is available. Points to the same
 * routes/shapes as class-tcnexus-rest-api.php. Swap environment.ts back to
 * the real API URL once one exists and this can be ignored.
 */
const http = require('http');

const PORT = process.env.MOCK_API_PORT || 8787;

// Real test clip from the client's Vimeo account. Every lesson points at it
// for now so the player wiring can be exercised end-to-end.
const TEST_VIDEO_URL = 'https://vimeo.com/1068479580';

const courses = [
  {
    id: 1,
    title: 'Reading Price Action Like a Desk Trader',
    excerpt: 'Learn to read candles, structure, and liquidity the way institutional desks do, without the indicator clutter.',
    thumbnail: null,
    course_types: ['Price Action', 'Beginner'],
    lesson_count: 14
  },
  {
    id: 2,
    title: 'Options Flow & Positioning',
    excerpt: 'Decode unusual options activity and dealer positioning to anticipate moves before they show up on a chart.',
    thumbnail: null,
    course_types: ['Options', 'Intermediate'],
    lesson_count: 9
  },
  {
    id: 3,
    title: 'Macro Regimes and Rotation',
    excerpt: 'A framework for reading rate cycles, liquidity regimes, and sector rotation across a full market cycle.',
    thumbnail: null,
    course_types: ['Macro'],
    lesson_count: 21
  },
  {
    id: 4,
    title: 'Risk Management for Discretionary Traders',
    excerpt: 'Position sizing, drawdown control, and the psychology of cutting losers fast without cutting winners short.',
    thumbnail: null,
    course_types: ['Risk', 'Beginner'],
    lesson_count: 11
  },
  {
    id: 5,
    title: 'Support, Resistance & Liquidity Pools',
    excerpt: 'Map the levels that actually matter and see where stops are sitting before price gets there.',
    thumbnail: null,
    course_types: ['Price Action', 'Intermediate'],
    lesson_count: 8
  },
  {
    id: 6,
    title: 'Zero-Days-to-Expiry Playbook',
    excerpt: 'A practical framework for trading 0DTE options without blowing up your account on theta decay.',
    thumbnail: null,
    course_types: ['Options', 'Advanced'],
    lesson_count: 6
  },
  {
    id: 7,
    title: 'Reading the Fed Between the Lines',
    excerpt: 'How to parse FOMC statements, dot plots, and presser language for tradeable macro signal.',
    thumbnail: null,
    course_types: ['Macro', 'Intermediate'],
    lesson_count: 10
  },
  {
    id: 8,
    title: 'Position Sizing for Volatile Markets',
    excerpt: 'A repeatable system for sizing into volatility instead of guessing and hoping.',
    thumbnail: null,
    course_types: ['Risk', 'Intermediate'],
    lesson_count: 7
  },
  {
    id: 9,
    title: 'Your First 90 Days as a Trader',
    excerpt: 'The exact order to learn things in, so you stop rebuilding your process every three weeks.',
    thumbnail: null,
    course_types: ['Beginner'],
    lesson_count: 18
  },
  {
    id: 10,
    title: 'Volatility Skew & Term Structure',
    excerpt: 'An advanced walkthrough of skew, term structure, and what they telegraph about crowd positioning.',
    thumbnail: null,
    course_types: ['Options', 'Advanced'],
    lesson_count: 5
  },
  {
    id: 11,
    title: 'Building a Trading Journal That Works',
    excerpt: 'Track the handful of variables that actually correlate with your edge, and drop the rest.',
    thumbnail: null,
    course_types: ['Beginner', 'Risk'],
    lesson_count: 6
  },
  {
    id: 12,
    title: 'Intermarket Analysis for Swing Traders',
    excerpt: 'Bonds, dollar, and commodities as a leading indicator for equity swings.',
    thumbnail: null,
    course_types: ['Macro', 'Advanced'],
    lesson_count: 9
  },
  {
    id: 13,
    title: 'Getting Started With Your TC Nexus Dashboard',
    excerpt: 'A tour of the workspace: layouts, watchlists, and where everything lives before you dig into a course.',
    thumbnail: null,
    course_types: ['Platform'],
    lesson_count: 4
  },
  {
    id: 14,
    title: 'Setting Up Watchlists & Price Alerts',
    excerpt: 'Configure alerts and saved watchlists so the platform tells you when something worth trading happens.',
    thumbnail: null,
    course_types: ['Platform'],
    lesson_count: 3
  }
];

function buildLessons(course) {
  const lessons = [];
  for (let i = 1; i <= course.lesson_count; i++) {
    const tier = i === 1 ? 'free' : i <= 3 ? 'registered' : 'paid';
    lessons.push({
      id: course.id * 100 + i,
      title: `${i}. ${course.title} — Part ${i}`,
      order: i,
      tier,
      course_id: course.id,
      thumbnail: null,
      locked: tier === 'paid',
      excerpt: `Part ${i} of ${course.title.toLowerCase()} — a focused, worked walkthrough building directly on the previous lesson.`,
      video_url: TEST_VIDEO_URL
    });
  }
  return lessons;
}

function buildCourseDetail(course) {
  return {
    id: course.id,
    title: course.title,
    content: `<p>${course.excerpt}</p><p>This course walks through the concepts step by step, with worked examples pulled from real charts and real trades — not theory slides.</p>`,
    thumbnail: course.thumbnail,
    course_types: course.course_types,
    lessons: buildLessons(course)
  };
}

// Lesson ids are course.id * 100 + order (see buildLessons), so a lesson's
// course is recoverable from its id alone without a separate lookup table.
function findLessonById(lessonId) {
  const course = courses.find((c) => c.id === Math.floor(lessonId / 100));
  if (!course) return null;
  return buildLessons(course).find((l) => l.id === lessonId) ?? null;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// --- Mock membership/access state ---
// Mirrors class-tcnexus-membership.php / class-tcnexus-access-control.php
// closely enough to exercise the frontend end-to-end, without a real
// WordPress instance. All in-memory — resets whenever this process restarts.
const FREE_VIEW_LIMIT = 5;
const tokensByEmail = new Map(); // email -> token
const tiersByToken = new Map(); // token -> 'registered' | 'paid'
const freeViewsByVisitor = new Map(); // visitorId -> Set<lessonId>

function generateToken() {
  return Array.from({ length: 40 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

function handleRegister(body, res) {
  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'invalid_email', message: 'A valid email is required.' }));
    return;
  }
  if (tokensByEmail.has(email)) {
    // Matches TCNexus_Membership::register_from_email()'s email_exists case —
    // there's deliberately no "log back in with an existing email" path yet
    // on the real backend either, see the memory note on this gap.
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'email_exists', message: 'This email is already registered.' }));
    return;
  }

  const token = generateToken();
  tokensByEmail.set(email, token);
  tiersByToken.set(token, 'registered');

  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, token }));
}

function handleAccessCheck(body, headers, res) {
  const lesson = findLessonById(Number(body.lesson_id));
  if (!lesson) {
    res.writeHead(404);
    res.end();
    return;
  }

  const visitorId = headers['x-visitor-id'] || '';
  const token = headers['x-tcnexus-token'] || '';
  const userTier = tiersByToken.get(token) ?? null;

  const result = { granted: false, reason: 'requires_registration', tier: lesson.tier };

  if (lesson.tier === 'paid') {
    result.granted = userTier === 'paid';
    result.reason = result.granted ? 'ok' : 'requires_payment';
  } else if (lesson.tier === 'registered') {
    result.granted = userTier === 'registered' || userTier === 'paid';
    result.reason = result.granted ? 'ok' : 'requires_registration';
  } else {
    // free tier
    if (userTier) {
      result.granted = true;
      result.reason = 'ok';
    } else {
      const viewed = freeViewsByVisitor.get(visitorId) ?? new Set();
      const alreadyCounted = viewed.has(lesson.id);
      if (!alreadyCounted && viewed.size >= FREE_VIEW_LIMIT) {
        result.granted = false;
        result.reason = 'requires_registration';
        result.limit_reached = true;
      } else {
        if (!alreadyCounted) {
          viewed.add(lesson.id);
          freeViewsByVisitor.set(visitorId, viewed);
        }
        result.granted = true;
        result.reason = 'ok';
      }
      result.free_limit = FREE_VIEW_LIMIT;
      result.free_views_used = (freeViewsByVisitor.get(visitorId) ?? viewed).size;
    }
  }

  if (result.granted) {
    result.vimeo_id = lesson.video_url;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-Id, X-Tcnexus-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = {};
  if (req.method === 'POST') {
    try {
      body = await readJsonBody(req);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
  }

  setTimeout(() => {
    if (req.url === '/wp-json/tcnexus/v1/courses' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(courses));
      return;
    }

    const detailMatch = req.method === 'GET' && req.url.match(/^\/wp-json\/tcnexus\/v1\/courses\/(\d+)$/);
    if (detailMatch) {
      const course = courses.find((c) => c.id === Number(detailMatch[1]));
      if (!course) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(buildCourseDetail(course)));
      return;
    }

    const lessonMatch = req.method === 'GET' && req.url.match(/^\/wp-json\/tcnexus\/v1\/lessons\/(\d+)$/);
    if (lessonMatch) {
      const lesson = findLessonById(Number(lessonMatch[1]));
      if (!lesson) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(lesson));
      return;
    }

    if (req.url === '/wp-json/tcnexus/v1/register' && req.method === 'POST') {
      handleRegister(body, res);
      return;
    }

    if (req.url === '/wp-json/tcnexus/v1/login' && req.method === 'POST') {
      const email = (body.email || '').trim().toLowerCase();
      const token = tokensByEmail.get(email);
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 'invalid_credentials', message: 'Email or password is incorrect.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, token }));
      return;
    }

    if (req.url === '/wp-json/tcnexus/v1/access/check' && req.method === 'POST') {
      handleAccessCheck(body, req.headers, res);
      return;
    }

    res.writeHead(404);
    res.end();
  }, 400);
});

server.listen(PORT, () => console.log(`tcnexus mock API listening on http://localhost:${PORT}`));
