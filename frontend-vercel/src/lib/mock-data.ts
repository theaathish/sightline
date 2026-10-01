export const brand = {
  product: "Sightline",
  site: "northwind-supply.com",
  name: "Northwind Supply",
  industry: "B2B ecommerce",
  competitors: ["baseline-tools.com", "orbitparts.io", "gridsupply.co"],
};

export const overview = {
  seoScore: 72,
  seoDelta: +6,
  aiMentionRate: 31,
  aiDelta: +4,
  clicks: 4820,
  clicksDelta: +12,
  impressions: 168400,
  impressionsDelta: +8,
  postsPublished: 6,
  postsTarget: 8,
};

export const scoreTrend = [
  { week: "Aug 4", score: 58, mentions: 18 },
  { week: "Aug 11", score: 61, mentions: 21 },
  { week: "Aug 18", score: 63, mentions: 22 },
  { week: "Aug 25", score: 66, mentions: 25 },
  { week: "Sep 1", score: 66, mentions: 27 },
  { week: "Sep 8", score: 70, mentions: 29 },
  { week: "Sep 15", score: 72, mentions: 31 },
];

export const todos = [
  { id: 1, label: "Fix 14 pages missing meta descriptions", impact: "High", area: "Audit" },
  { id: 2, label: "Approve 3 blog drafts waiting since Monday", impact: "High", area: "Content" },
  { id: 3, label: "Add Product schema to 8 category pages", impact: "Medium", area: "Audit" },
  { id: 4, label: "Add 2 prompts about “bulk ordering”", impact: "Medium", area: "AI visibility" },
  { id: 5, label: "Compress 6 hero images over 400 KB", impact: "Low", area: "Audit" },
];

export type Issue = {
  id: number;
  title: string;
  area: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  pages: number;
  detail: string;
  fix: string;
};

export const issues: Issue[] = [
  {
    id: 1,
    title: "Sitemap missing 42 published pages",
    area: "Sitemap",
    priority: "Critical",
    pages: 42,
    detail: "Your sitemap.xml lists 118 URLs but the site publishes 160. Search engines may never find the rest.",
    fix: "Regenerate the sitemap so every published page is listed, then resubmit it in Search Console.",
  },
  {
    id: 2,
    title: "robots.txt blocks /collections/",
    area: "Robots.txt",
    priority: "Critical",
    pages: 31,
    detail: "A Disallow rule keeps crawlers out of your highest-traffic category pages.",
    fix: "Remove the Disallow: /collections/ line and keep only the rules for cart and checkout.",
  },
  {
    id: 3,
    title: "14 pages have no meta description",
    area: "Meta tags",
    priority: "High",
    pages: 14,
    detail: "Search results fall back to random page text, which lowers click-through.",
    fix: "Write a 150-character description for each page. We can draft all 14 for you.",
  },
  {
    id: 4,
    title: "Duplicate title tags on 9 pages",
    area: "Meta tags",
    priority: "High",
    pages: 9,
    detail: "Nine product pages share the title “Northwind Supply | Shop”.",
    fix: "Use the product name plus a benefit in each title, under 60 characters.",
  },
  {
    id: 5,
    title: "Product schema missing on category pages",
    area: "Schema",
    priority: "Medium",
    pages: 8,
    detail: "Without structured data these pages can't show prices or ratings in results.",
    fix: "Add Product and AggregateRating structured data to each category template.",
  },
  {
    id: 6,
    title: "Largest paint takes 4.1s on mobile",
    area: "Speed",
    priority: "Medium",
    pages: 22,
    detail: "Hero images load at full resolution before anything else renders.",
    fix: "Serve hero images in WebP at 1200px wide and preload the first one.",
  },
  {
    id: 7,
    title: "Six images over 400 KB",
    area: "Speed",
    priority: "Low",
    pages: 6,
    detail: "Uncompressed images slow down the homepage and two landing pages.",
    fix: "Compress the six flagged images; expect around 1.2 MB saved.",
  },
];

export const models = ["ChatGPT", "Gemini", "Claude", "Perplexity"] as const;
export type Model = (typeof models)[number];

export type PromptResult = {
  id: number;
  prompt: string;
  results: Record<Model, { mentioned: boolean; position: number | null }>;
  trend: number[];
  sources: string[];
};

export const prompts: PromptResult[] = [
  {
    id: 1,
    prompt: "best industrial fastener suppliers online",
    results: {
      ChatGPT: { mentioned: true, position: 2 },
      Gemini: { mentioned: true, position: 4 },
      Claude: { mentioned: false, position: null },
      Perplexity: { mentioned: true, position: 1 },
    },
    trend: [1, 2, 2, 3, 3, 4, 4],
    sources: ["northwind-supply.com/guides", "reddit.com/r/manufacturing", "thomasnet.com"],
  },
  {
    id: 2,
    prompt: "where to buy bulk stainless bolts",
    results: {
      ChatGPT: { mentioned: true, position: 5 },
      Gemini: { mentioned: false, position: null },
      Claude: { mentioned: false, position: null },
      Perplexity: { mentioned: true, position: 3 },
    },
    trend: [0, 1, 1, 1, 2, 2, 2],
    sources: ["northwind-supply.com/bulk", "grainger.com"],
  },
  {
    id: 3,
    prompt: "cheapest supplier for workshop consumables",
    results: {
      ChatGPT: { mentioned: false, position: null },
      Gemini: { mentioned: false, position: null },
      Claude: { mentioned: false, position: null },
      Perplexity: { mentioned: false, position: null },
    },
    trend: [0, 0, 0, 0, 0, 0, 0],
    sources: [],
  },
  {
    id: 4,
    prompt: "northwind supply reviews",
    results: {
      ChatGPT: { mentioned: true, position: 1 },
      Gemini: { mentioned: true, position: 1 },
      Claude: { mentioned: true, position: 2 },
      Perplexity: { mentioned: true, position: 1 },
    },
    trend: [3, 4, 4, 4, 4, 4, 4],
    sources: ["trustpilot.com", "northwind-supply.com", "reddit.com/r/smallbusiness"],
  },
  {
    id: 5,
    prompt: "alternatives to baseline tools",
    results: {
      ChatGPT: { mentioned: true, position: 3 },
      Gemini: { mentioned: true, position: 6 },
      Claude: { mentioned: false, position: null },
      Perplexity: { mentioned: false, position: null },
    },
    trend: [0, 0, 1, 1, 2, 2, 2],
    sources: ["g2.com", "northwind-supply.com/compare"],
  },
  {
    id: 6,
    prompt: "same day delivery industrial parts uk",
    results: {
      ChatGPT: { mentioned: false, position: null },
      Gemini: { mentioned: true, position: 7 },
      Claude: { mentioned: false, position: null },
      Perplexity: { mentioned: false, position: null },
    },
    trend: [0, 0, 0, 1, 1, 1, 1],
    sources: ["orbitparts.io", "northwind-supply.com/delivery"],
  },
];

export type Draft = {
  id: number;
  title: string;
  words: number;
  status: "Waiting for approval" | "Approved" | "Published";
  updated: string;
  excerpt: string;
};

export const drafts: Draft[] = [
  {
    id: 1,
    title: "How to choose the right fastener grade for outdoor builds",
    words: 1420,
    status: "Waiting for approval",
    updated: "2 hours ago",
    excerpt:
      "Grade markings tell you more than tensile strength. Here's how to read them before your next outdoor job.",
  },
  {
    id: 2,
    title: "Bulk ordering: when it saves money and when it doesn't",
    words: 1180,
    status: "Waiting for approval",
    updated: "Yesterday",
    excerpt: "Volume discounts look obvious on paper. Storage, spoilage and cash flow change the maths.",
  },
  {
    id: 3,
    title: "A workshop consumables checklist for small teams",
    words: 960,
    status: "Waiting for approval",
    updated: "Monday",
    excerpt: "The eleven items that run out first, and how much to keep on the shelf.",
  },
  {
    id: 4,
    title: "Stainless vs galvanised: a plain-language comparison",
    words: 1340,
    status: "Approved",
    updated: "Monday",
    excerpt: "Two finishes, very different lifespans. Here's which to pick per environment.",
  },
  {
    id: 5,
    title: "Reading a supplier lead time quote",
    words: 870,
    status: "Published",
    updated: "Last week",
    excerpt: "What 'ex-stock' and 'on allocation' actually mean for your delivery date.",
  },
];

export const calendar = [
  { day: 22, title: "Stainless vs galvanised", state: "scheduled" },
  { day: 24, title: "Fastener grade guide", state: "draft" },
  { day: 26, title: "Bulk ordering maths", state: "draft" },
  { day: 29, title: "Consumables checklist", state: "scheduled" },
];

export const plan = {
  name: "Growth",
  price: "$79 / month",
  promptsUsed: 20,
  promptsLimit: 25,
  draftsUsed: 5,
  draftsLimit: 6,
  renews: "12 October",
};

export const team = [
  { name: "Aathish R.", email: "aathish@northwind-supply.com", role: "Owner" },
  { name: "Priya M.", email: "priya@northwind-supply.com", role: "Editor" },
  { name: "Tom L.", email: "tom@northwind-supply.com", role: "Viewer" },
];

export const suggestedPrompts = [
  "best industrial fastener suppliers online",
  "where to buy bulk stainless bolts",
  "cheapest supplier for workshop consumables",
  "northwind supply reviews",
  "alternatives to baseline tools",
  "same day delivery industrial parts uk",
  "stainless vs galvanised fasteners",
  "how to order fasteners in bulk",
  "trade account industrial supplier",
  "workshop consumables subscription",
  "best supplier for hex bolts",
  "industrial supplier with same day dispatch",
  "b2b fastener supplier comparison",
  "northwind supply vs baseline tools",
  "wholesale workshop supplies uk",
  "who sells din 933 bolts online",
  "cheap bulk washers supplier",
  "industrial supplier with api ordering",
  "fastener supplier for construction firms",
  "best value trade supplier for hardware",
];
