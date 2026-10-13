/**
 * DIDM LMS Demo Environment - High-Quality Realistic Seed Data
 * Contains rich curriculum, human-readable personas, course outlines, assessments, and CRM leads.
 */

export const DEMO_ORG = {
  name: 'DIDM Academy',
  slug: 'didm-demo',
  domain: 'demo.didm.edu',
  tagline: 'Delhi Institute of Digital Marketing - Premier Digital & Tech Education',
  description: 'Leading digital marketing and creative technology academy empowering students and professionals with hands-on, industry-certified practical programs.',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  contactEmail: 'admissions@didm.edu',
  contactPhone: '+91 8800880088',
  address: 'Plot 12, Sector 14, Ring Road, New Delhi, 110025'
};

export const DEMO_BRANCHES = [
  {
    code: 'MAIN',
    slug: 'main-campus',
    name: 'Main Campus - South Extension',
    city: 'New Delhi',
    state: 'Delhi',
    isPrimary: true,
    timezone: 'Asia/Kolkata',
    address: 'E-42, South Extension Part 1, New Delhi 110049',
    capacity: 250
  },
  {
    code: 'GURGAON',
    slug: 'south-campus-gurgaon',
    name: 'Cyber City Campus - Gurgaon',
    city: 'Gurgaon',
    state: 'Haryana',
    isPrimary: false,
    timezone: 'Asia/Kolkata',
    address: 'DLF Cyber City, Tower B, Level 4, DLF Phase 2, Gurgaon 122002',
    capacity: 180
  },
  {
    code: 'ONLINE',
    slug: 'online-academy',
    name: 'DIDM Live Online Academy',
    city: 'Virtual Campus',
    state: 'Delhi NCR',
    isPrimary: false,
    timezone: 'Asia/Kolkata',
    address: 'Virtual Learning Center - Cloud Delivery',
    capacity: 1000
  }
];

export const DEMO_ROOMS = [
  { code: 'LAB-101', name: 'Digital Media Lab 101', branchCode: 'MAIN', capacity: 35 },
  { code: 'HALL-A', name: 'Seminar Hall A', branchCode: 'MAIN', capacity: 80 },
  { code: 'STUDIO-1', name: 'UI/UX Design Studio', branchCode: 'GURGAON', capacity: 30 },
  { code: 'LAB-201', name: 'Performance Marketing Hub', branchCode: 'GURGAON', capacity: 40 },
  { code: 'VIRTUAL-01', name: 'Live Interactive Studio 1', branchCode: 'ONLINE', capacity: 500 },
  { code: 'VIRTUAL-02', name: 'Live Interactive Studio 2', branchCode: 'ONLINE', capacity: 500 }
];

export const DEMO_USERS = {
  superadmin: {
    name: 'Platform SuperAdmin',
    email: 'superadmin@didm.edu',
    isSuperAdmin: true,
    role: 'SUPER_ADMIN'
  },
  tenantAdmin: {
    name: 'Vikas Sharma',
    email: 'admin@didm.edu',
    phone: '+91 9811001122',
    role: 'TENANT_ADMIN',
    branchAccessMode: 'ALL'
  },
  branchAdminMain: {
    name: 'Rajesh Kumar',
    email: 'branch.main@didm.edu',
    phone: '+91 9811002233',
    role: 'BRANCH_ADMIN',
    branchAccessMode: 'SELECTED',
    branchCodes: ['MAIN']
  },
  branchAdminSouth: {
    name: 'Sunita Rao',
    email: 'branch.south@didm.edu',
    phone: '+91 9811003344',
    role: 'BRANCH_ADMIN',
    branchAccessMode: 'SELECTED',
    branchCodes: ['GURGAON']
  },
  instructors: [
    {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@didm.edu',
      phone: '+91 9871100101',
      specialty: 'Lead Digital Marketing & SEO Strategist',
      bio: 'Ex-Google Ads Specialist and Inbound Marketing Trainer with 10+ years of digital scaling experience.',
      branchCodes: ['MAIN', 'ONLINE']
    },
    {
      name: 'Neha Kapoor',
      email: 'neha.kapoor@didm.edu',
      phone: '+91 9871100102',
      specialty: 'Creative Director & Graphic Design Lead',
      bio: 'Senior Visual Designer specializing in Brand Identity, Adobe Creative Suite, and Creative Advertising.',
      branchCodes: ['MAIN']
    },
    {
      name: 'Rohan Mehta',
      email: 'rohan.mehta@didm.edu',
      phone: '+91 9871100103',
      specialty: 'Performance Marketing & Growth Lead',
      bio: 'Managed over ₹50M in ad spend across Meta Ads, Google Performance Max, and Programmatic Display.',
      branchCodes: ['GURGAON', 'ONLINE']
    },
    {
      name: 'Priya Singh',
      email: 'priya.singh@didm.edu',
      phone: '+91 9871100104',
      specialty: 'Senior UI/UX & Product Design Mentor',
      bio: 'Product Designer with extensive enterprise and fintech UX experience across web and mobile platforms.',
      branchCodes: ['GURGAON']
    }
  ],
  primaryStudent: {
    name: 'Aman Verma',
    email: 'aman.verma@student.didm.edu',
    phone: '+91 9810998877',
    studentNumber: 'DIDM-2026-0001',
    branchCode: 'MAIN',
    lifecycleStatus: 'ACTIVE'
  },
  students: [
    { name: 'Ananya Patel', email: 'ananya.patel@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0002', status: 'ACTIVE' },
    { name: 'Rahul Nair', email: 'rahul.nair@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0003', status: 'ACTIVE' },
    { name: 'Sneha Gupta', email: 'sneha.gupta@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0004', status: 'ACTIVE' },
    { name: 'Vikram Singh', email: 'vikram.singh@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0005', status: 'ACTIVE' },
    { name: 'Pooja Deshmukh', email: 'pooja.deshmukh@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0006', status: 'ACTIVE' },
    { name: 'Kavita Sharma', email: 'kavita.sharma@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0007', status: 'ACTIVE' },
    { name: 'Aditya Joshi', email: 'aditya.joshi@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0008', status: 'ACTIVE' },
    { name: 'Riya Sen', email: 'riya.sen@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0009', status: 'ACTIVE' },
    { name: 'Arjun Reddy', email: 'arjun.reddy@student.didm.edu', branchCode: 'ONLINE', studentNumber: 'DIDM-2026-0010', status: 'ACTIVE' },
    { name: 'Tanvi Bhatia', email: 'tanvi.bhatia@student.didm.edu', branchCode: 'ONLINE', studentNumber: 'DIDM-2026-0011', status: 'ACTIVE' },
    { name: 'Manish Tiwari', email: 'manish.tiwari@student.didm.edu', branchCode: 'ONLINE', studentNumber: 'DIDM-2026-0012', status: 'ACTIVE' },
    { name: 'Divya Mehra', email: 'divya.mehra@student.didm.edu', branchCode: 'ONLINE', studentNumber: 'DIDM-2026-0013', status: 'ACTIVE' },
    { name: 'Siddharth Roy', email: 'siddharth.roy@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0014', status: 'ACTIVE' },
    { name: 'Meera Nambiar', email: 'meera.nambiar@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0015', status: 'ACTIVE' },
    { name: 'Karan Malhotra', email: 'karan.malhotra@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0016', status: 'ACTIVE' },
    { name: 'Ishaan Verma', email: 'ishaan.verma@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0017', status: 'ACTIVE' },
    { name: 'Anushka Chawla', email: 'anushka.chawla@student.didm.edu', branchCode: 'ONLINE', studentNumber: 'DIDM-2026-0018', status: 'ACTIVE' },
    { name: 'Rohit Bansal', email: 'rohit.bansal@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0019', status: 'ACTIVE' },
    { name: 'Swati Jain', email: 'swati.jain@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0020', status: 'ACTIVE' },
    { name: 'Harsh Vardhan', email: 'harsh.vardhan@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0021', status: 'ON_HOLD' },
    { name: 'Neelam Kashyap', email: 'neelam.kashyap@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0022', status: 'COMPLETED' },
    { name: 'Gaurav Kumar', email: 'gaurav.kumar@student.didm.edu', branchCode: 'ONLINE', studentNumber: 'DIDM-2026-0023', status: 'WITHDRAWN' },
    { name: 'Shreya Ghosal', email: 'shreya.ghosal@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0024', status: 'ACTIVE' },
    { name: 'Varun Dhawan', email: 'varun.dhawan@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0025', status: 'ACTIVE' },
    { name: 'Kriti Sanon', email: 'kriti.sanon@student.didm.edu', branchCode: 'ONLINE', studentNumber: 'DIDM-2026-0026', status: 'ACTIVE' },
    { name: 'Ayush Mann', email: 'ayush.mann@student.didm.edu', branchCode: 'MAIN', studentNumber: 'DIDM-2026-0027', status: 'ACTIVE' },
    { name: 'Tanya Mittal', email: 'tanya.mittal@student.didm.edu', branchCode: 'GURGAON', studentNumber: 'DIDM-2026-0028', status: 'ACTIVE' }
  ]
};

export const DEMO_COURSES = [
  {
    title: 'Advanced Digital Marketing Program',
    slug: 'adv-digital-marketing',
    shortDescription: 'Master SEO, Google Ads, Meta Marketing, Funnel Optimization, and GA4 Analytics.',
    description: 'Comprehensive 120-hour master diploma covering all aspects of modern performance and brand digital marketing. Learn hands-on live campaign management with industry-standard toolkits.',
    level: 'INTERMEDIATE',
    category: 'Digital Marketing',
    price: 7500000, // ₹75,000
    durationHours: 120,
    modules: [
      {
        title: 'Module 1: Digital Marketing Foundations & Strategy',
        description: 'Core concepts of digital marketing, consumer intent funnels, and brand positioning.',
        lessons: [
          { title: 'Evolution of Digital Marketing & The Modern Inbound Flywheel', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Defining Target Buyer Personas & Customer Journey Maps', type: 'TEXT', durationMinutes: 30 },
          { title: 'Core Competitor Benchmarking & Digital Auditing', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 2: Website Architecture & High-Converting Landing Pages',
        description: 'Landing page design principles, copywriting formulas, and conversion rate optimization (CRO).',
        lessons: [
          { title: 'Information Architecture & Wireframing for Conversion', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Persuasive Copywriting & Value Proposition Structuring', type: 'TEXT', durationMinutes: 35 },
          { title: 'A/B Testing Frameworks & Heatmap Analysis (Hotjar/Clarity)', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Technical Speed Optimization & Core Web Vitals', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 3: Search Engine Optimization (SEO) Masterclass',
        description: 'Technical SEO, Keyword Intent Research, On-Page Architecture, and High-Authority Link Building.',
        lessons: [
          { title: 'Keyword Intent Mapping & Semantic Cluster Analysis', type: 'VIDEO', durationMinutes: 60 },
          { title: 'Technical Crawling, Indexing & Structured Schema Markup', type: 'VIDEO', durationMinutes: 55 },
          { title: 'On-Page Content Optimization & Entity-Based SEO', type: 'TEXT', durationMinutes: 40 },
          { title: 'Digital PR & Ethical High-Authority Backlink Acquisition', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Local SEO, Google Business Profile & Citation Management', type: 'VIDEO', durationMinutes: 35 }
        ]
      },
      {
        title: 'Module 4: Google Ads & Search Engine Marketing (SEM)',
        description: 'Google Search, Display, Performance Max (PMax), and Smart Bidding strategies.',
        lessons: [
          { title: 'Google Ads Account Structure & Campaign Hierarchy', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Keyword Match Types, Negative Keywords & Search Term Auditing', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Responsive Search Ads (RSA) & Ad Asset Extensions', type: 'TEXT', durationMinutes: 30 },
          { title: 'Smart Bidding Strategies: Target CPA vs Target ROAS', type: 'VIDEO', durationMinutes: 55 },
          { title: 'Performance Max (PMax) Campaign Setup & Asset Groups', type: 'VIDEO', durationMinutes: 60 }
        ]
      },
      {
        title: 'Module 5: Meta Ads & Paid Social Media Advertising',
        description: 'Facebook & Instagram ad buying, custom audience segmentation, and creative strategy.',
        lessons: [
          { title: 'Meta Advantage+ Campaign Architecture & Budget Optimization (CBO)', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Audience Research: Lookalikes, Retargeting & First-Party Data', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Creative Hook Strategy & UGC Video Scripting', type: 'TEXT', durationMinutes: 35 },
          { title: 'Meta Conversions API (CAPI) & Pixel Setup', type: 'VIDEO', durationMinutes: 55 }
        ]
      },
      {
        title: 'Module 6: Content Strategy & Inbound Growth',
        description: 'Multi-channel organic distribution, email nurture sequences, and podcasting.',
        lessons: [
          { title: 'Content Repurposing Frameworks for LinkedIn & YouTube', type: 'VIDEO', durationMinutes: 40 },
          { title: 'Automated Email Nurture Sequences & Lead Magnet Design', type: 'TEXT', durationMinutes: 35 },
          { title: 'Brand Storytelling & Thought Leadership Strategy', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Influencer Marketing & Performance Partnerships', type: 'VIDEO', durationMinutes: 30 }
        ]
      },
      {
        title: 'Module 7: Google Analytics 4 (GA4) & Conversion Tracking',
        description: 'Google Tag Manager (GTM), custom event modeling, and Looker Studio dashboarding.',
        lessons: [
          { title: 'GA4 Event-Driven Data Model vs Universal Analytics', type: 'VIDEO', durationMinutes: 50 },
          { title: 'GTM Setup: Triggers, Tags & DataLayer Implementation', type: 'VIDEO', durationMinutes: 60 },
          { title: 'Building Multi-Channel Attribution Models in GA4', type: 'TEXT', durationMinutes: 35 },
          { title: 'Creating Executive BI Dashboards in Looker Studio', type: 'VIDEO', durationMinutes: 45 }
        ]
      },
      {
        title: 'Module 8: Integrated Capstone Marketing Strategy',
        description: 'End-to-end full-funnel live campaign execution and ROI presentation.',
        lessons: [
          { title: 'Building a 360-Degree Omnichannel Go-To-Market Plan', type: 'VIDEO', durationMinutes: 60 },
          { title: 'Budget Allocation, CAC Forecasting & LTV Modeling', type: 'TEXT', durationMinutes: 45 },
          { title: 'Capstone Project Guidelines & Final Jury Defense', type: 'VIDEO', durationMinutes: 40 }
        ]
      }
    ]
  },
  {
    title: 'Performance Marketing Masterclass',
    slug: 'performance-marketing-masterclass',
    shortDescription: 'Deep dive into paid acquisition, media buying, programmatic ads, and scaling DTC brands.',
    description: 'Advanced media buying program designed for marketers looking to scale paid campaigns past 7 figures. Master creative testing frameworks, server-side tracking, and multi-touch attribution.',
    level: 'ADVANCED',
    category: 'Performance Marketing',
    price: 6000000, // ₹60,000
    durationHours: 80,
    modules: [
      {
        title: 'Module 1: Media Buying Mathematics & Unit Economics',
        description: 'CAC, MER, ROAS, Contribution Margin, and cashflow modeling.',
        lessons: [
          { title: 'DTC Unit Economics & Contribution Margin Modeling', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Blended ROAS vs In-Platform ROAS: Understanding MER', type: 'TEXT', durationMinutes: 35 },
          { title: 'Scaling Thresholds & Budget Pacing Formulas', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Competitor Ad Vault Auditing with Foreplay & BigSpy', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 2: Creative Strategy & Iterative Hook Testing',
        description: 'Systematic UGC production, static asset variations, and hook testing matrices.',
        lessons: [
          { title: 'The 3-Second Hook Retention Matrix', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Static Ad Anatomy: Problem-Aware vs Solution-Aware Creatives', type: 'TEXT', durationMinutes: 30 },
          { title: 'Scaling Creative Production with AI Video Workflows', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Creative Fatigue Detection & Refresh Cadence', type: 'VIDEO', durationMinutes: 35 }
        ]
      },
      {
        title: 'Module 3: Advanced Meta Ads Media Buying',
        description: 'Bid caps, cost caps, minimum ROAS bidding, and vertical scaling.',
        lessons: [
          { title: 'Manual Bidding vs Lowest Cost: Cost Cap Execution', type: 'VIDEO', durationMinutes: 60 },
          { title: 'Account Consolidation & Broad Targeting Mastery', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Handling Ad Account Bans & Redundancy Infrastructure', type: 'TEXT', durationMinutes: 40 },
          { title: 'Retargeting in a Post-iOS14 Cookie-Deprecating World', type: 'VIDEO', durationMinutes: 50 }
        ]
      },
      {
        title: 'Module 4: Google Performance Max & Search Scaling',
        description: 'Target ROAS bidding, audience signals, and feed optimization for Google Shopping.',
        lessons: [
          { title: 'Google Merchant Center Feed Optimization & Custom Labels', type: 'VIDEO', durationMinutes: 55 },
          { title: 'Asset Group Segmentation in High-Volume PMax', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Search Campaign Alpha-Beta Keyword Harvesting', type: 'TEXT', durationMinutes: 35 },
          { title: 'YouTube Shorts Ads & Discovery Placements', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 5: Tracking, Attribution & First-Party Data',
        description: 'Triple Whale, Northbeam, server-side tagging, and post-purchase surveys.',
        lessons: [
          { title: 'Server-Side GTM on Cloud Run & AWS', type: 'VIDEO', durationMinutes: 65 },
          { title: 'Multi-Touch Attribution: First Click, Linear & Data-Driven', type: 'TEXT', durationMinutes: 40 },
          { title: 'Zero-Party Data Collection & Post-Purchase Surveys (Fairing)', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Privacy Sandbox & Preparing for Total Third-Party Cookie Deprecation', type: 'VIDEO', durationMinutes: 50 }
        ]
      },
      {
        title: 'Module 6: Marketplace & Programmatic Scaling',
        description: 'Amazon Ads, Flipkart Ads, Criteo, and DSP retargeting.',
        lessons: [
          { title: 'Amazon Sponsored Products & Brand Video Ads', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Amazon DSP: Programmatic Retargeting & In-Market Audiences', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Quick-Commerce Advertising: Blinkit & Zepto Brand Ads', type: 'TEXT', durationMinutes: 35 },
          { title: 'Final Performance Audit Case Study', type: 'VIDEO', durationMinutes: 50 }
        ]
      }
    ]
  },
  {
    title: 'Social Media Marketing Fundamentals',
    slug: 'social-media-fundamentals',
    shortDescription: 'Build organic communities, master reels/shorts algorithm, and drive brand loyalty.',
    description: 'Practical foundation program covering social media strategy, organic content calendar creation, community engagement, and viral short-form video optimization.',
    level: 'BEGINNER',
    category: 'Social Media',
    price: 3500000, // ₹35,000
    durationHours: 45,
    modules: [
      {
        title: 'Module 1: Social Media Algorithm Architecture',
        description: 'Understanding feed algorithms across Instagram, LinkedIn, YouTube, and X.',
        lessons: [
          { title: 'How Recommendation Engines Work in 2026', type: 'VIDEO', durationMinutes: 40 },
          { title: 'Organic Reach vs Paid Boosts: Strategic Tradeoffs', type: 'TEXT', durationMinutes: 25 },
          { title: 'Profile Optimization & Bio Conversion Hooks', type: 'VIDEO', durationMinutes: 30 }
        ]
      },
      {
        title: 'Module 2: Content Pillar Planning & Calendaring',
        description: 'Designing content pillars: Educate, Entertain, Inspire, and Convert.',
        lessons: [
          { title: 'Building a 30-Day Content Matrix in Notion', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Copywriting for Captions & Call-To-Action Placement', type: 'TEXT', durationMinutes: 30 },
          { title: 'Hashtags, Audio Trends & Topic Tagging Secrets', type: 'VIDEO', durationMinutes: 35 }
        ]
      },
      {
        title: 'Module 3: Short-Form Video Creation (Reels & Shorts)',
        description: 'Filming, CapCut editing, B-roll selection, and pacing.',
        lessons: [
          { title: 'Smartphone Filmmaking: Lighting & Clean Audio', type: 'VIDEO', durationMinutes: 40 },
          { title: 'CapCut Video Editing: Text Transitions & Fast Cuts', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Voiceover Recording & Emotional Storytelling', type: 'TEXT', durationMinutes: 25 }
        ]
      },
      {
        title: 'Module 4: Community Management & Engagement',
        description: 'DM automation, comment response workflows, and crisis management.',
        lessons: [
          { title: 'ManyChat DM Automation & Lead Capture Funnels', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Community Response Tone of Voice & Handling Trolls', type: 'TEXT', durationMinutes: 30 },
          { title: 'User Generated Content (UGC) Contests & Brand Advocates', type: 'VIDEO', durationMinutes: 35 }
        ]
      },
      {
        title: 'Module 5: Social Analytics & ROI Reporting',
        description: 'Engagement rate calculation, follower growth analytics, and client reporting.',
        lessons: [
          { title: 'Calculating True Engagement Rates vs Vanity Metrics', type: 'VIDEO', durationMinutes: 40 },
          { title: 'Building Client Social Media Monthly Reports', type: 'TEXT', durationMinutes: 35 },
          { title: 'Social Commerce: Instagram Shop & WhatsApp Catalog Integration', type: 'VIDEO', durationMinutes: 45 }
        ]
      }
    ]
  },
  {
    title: 'Graphic Design Professional',
    slug: 'graphic-design-professional',
    shortDescription: 'Master Adobe Photoshop, Illustrator, InDesign, and Branding Identity Design.',
    description: 'Industry-standard visual design program teaching typography, color theory, vector illustration, photo manipulation, and print-ready production layouts.',
    level: 'BEGINNER',
    category: 'Creative Design',
    price: 5500000, // ₹55,000
    durationHours: 90,
    modules: [
      {
        title: 'Module 1: Design Fundamentals & Visual Hierarchy',
        description: 'Contrast, Alignment, Repetition, Proximity, and Color Psychology.',
        lessons: [
          { title: 'Principles of Visual Balance & Grid Systems', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Typography: Font Pairing & Kerning Rules', type: 'TEXT', durationMinutes: 30 },
          { title: 'Color Theory & Harmonious Palette Creation', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 2: Adobe Photoshop Mastery',
        description: 'Layer masks, photo retouching, color grading, and commercial composites.',
        lessons: [
          { title: 'Selections, Pen Tool & Non-Destructive Masking', type: 'VIDEO', durationMinutes: 55 },
          { title: 'Frequency Separation & Portrait Skin Retouching', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Product Photo Enhancement & Mockup Creation', type: 'TEXT', durationMinutes: 35 },
          { title: 'Advanced Compositing & Atmospheric Lighting Effects', type: 'VIDEO', durationMinutes: 60 }
        ]
      },
      {
        title: 'Module 3: Adobe Illustrator & Vector Illustration',
        description: 'Logo design, vector icons, custom typography, and scalable branding.',
        lessons: [
          { title: 'Vector Geometry, Shape Builder & Pathfinder Operations', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Logo Design Methodology: From Sketch to Master Vector', type: 'VIDEO', durationMinutes: 65 },
          { title: 'Isometric Illustration & Icon Set Creation', type: 'TEXT', durationMinutes: 40 },
          { title: 'Packaging Design & Die-Line Preparation', type: 'VIDEO', durationMinutes: 55 }
        ]
      },
      {
        title: 'Module 4: Brand Identity Guidelines & Style Guides',
        description: 'Creating complete corporate identity packages for modern startups.',
        lessons: [
          { title: 'Brand Book Structuring: Clearspace, Color & Don’ts', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Stationery Design: Business Cards, Letterheads & Folders', type: 'TEXT', durationMinutes: 30 },
          { title: 'Social Media Template Design System', type: 'VIDEO', durationMinutes: 45 }
        ]
      },
      {
        title: 'Module 5: Digital Advertising & Banner Design',
        description: 'High-CTR display banners, Instagram story templates, and animated GIFs.',
        lessons: [
          { title: 'High-Converting Ad Creative Layout Formulas', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Designing for Multiple Aspect Ratios (1:1, 9:16, 16:9)', type: 'TEXT', durationMinutes: 30 },
          { title: 'Exporting Optimized WebP & Scalable SVGs', type: 'VIDEO', durationMinutes: 35 }
        ]
      },
      {
        title: 'Module 6: Portfolio Development & Client Presentation',
        description: 'Behance case study presentation, client pitch decks, and freelance pricing.',
        lessons: [
          { title: 'Crafting a Standout Behance & Dribbble Case Study', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Freelance Contract Drafting & Pricing Strategies', type: 'TEXT', durationMinutes: 40 },
          { title: 'Final Brand Identity Capstone Jury Review', type: 'VIDEO', durationMinutes: 60 }
        ]
      }
    ]
  },
  {
    title: 'UI/UX Design Bootcamp',
    slug: 'ui-ux-design-bootcamp',
    shortDescription: 'End-to-end Figma, user research, wireframing, design systems, and usability testing.',
    description: 'Intensive product design bootcamp taking learners from user empathy interviews and journey mapping to interactive Figma prototypes and scalable component design systems.',
    level: 'INTERMEDIATE',
    category: 'Product Design',
    price: 6500000, // ₹65,000
    durationHours: 100,
    modules: [
      {
        title: 'Module 1: User Research & Empathy Mapping',
        description: 'User interviews, competitive usability heuristics, and persona synthesis.',
        lessons: [
          { title: 'Conducting Qualitative User Interviews & Synthesizing Insights', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Nielsen Norman 10 Usability Heuristics Evaluation', type: 'TEXT', durationMinutes: 40 },
          { title: 'Customer Empathy Maps & User Journey Blueprints', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Information Architecture: Card Sorting & Site Mapping', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 2: Wireframing & Low-Fidelity Prototyping',
        description: 'Lo-Fi wireframing, rapid paper sketching, and user flow validation.',
        lessons: [
          { title: 'Rapid Sketching & Crazy 8s Ideation Methodology', type: 'VIDEO', durationMinutes: 40 },
          { title: 'Digital Lo-Fi Wireframing in Whimsical / Figma', type: 'TEXT', durationMinutes: 35 },
          { title: 'User Flow Diagramming & Happy Path Mapping', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Early Usability Validation on Low-Fi Wireframes', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 3: Figma Mastery & Auto-Layout 5.0',
        description: 'Components, variants, auto-layout, interactive states, and variables.',
        lessons: [
          { title: 'Mastering Auto-Layout: Responsive Stacks & Absolute Positioning', type: 'VIDEO', durationMinutes: 60 },
          { title: 'Component Properties, Variants & Boolean Switches', type: 'VIDEO', durationMinutes: 55 },
          { title: 'Figma Variables: Light/Dark Mode & Device Tokens', type: 'TEXT', durationMinutes: 40 },
          { title: 'Micro-Interactions & Smart Animate Transitions', type: 'VIDEO', durationMinutes: 50 }
        ]
      },
      {
        title: 'Module 4: Enterprise Design Systems',
        description: 'Atomic design, token hierarchy, accessibility (WCAG AA), and handoff.',
        lessons: [
          { title: 'Atomic Design Architecture: Atoms, Molecules & Organisms', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Color & Typography Design Tokens for Dev Handoff', type: 'TEXT', durationMinutes: 35 },
          { title: 'WCAG 2.2 Accessibility: Color Contrast & Focus States', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Developer Handoff with Figma Dev Mode & Specs', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 5: Usability Testing & Analytics',
        description: 'Moderated vs unmoderated testing, Maze testing, and task completion metrics.',
        lessons: [
          { title: 'Writing Usability Test Scenarios & Success Criteria', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Running Remote Unmoderated Tests with Maze', type: 'TEXT', durationMinutes: 35 },
          { title: 'Analyzing Task Completion Rates & SUS Scores', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Iterating Designs Post-User Feedback', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 6: Capstone Product Case Study',
        description: 'Designing a full-featured fintech or edtech mobile app from scratch.',
        lessons: [
          { title: 'Defining the Problem Statement & Product Requirements Doc (PRD)', type: 'VIDEO', durationMinutes: 55 },
          { title: 'High-Fidelity UI Screens & Interactive Flow', type: 'TEXT', durationMinutes: 45 },
          { title: 'Final Case Study Storytelling for Product Design Interviews', type: 'VIDEO', durationMinutes: 60 }
        ]
      }
    ]
  },
  {
    title: 'SEO & Content Marketing Specialist',
    slug: 'seo-content-specialist',
    shortDescription: 'Technical SEO, Programmatic SEO, AI content workflows, and high-ROI blogging.',
    description: 'Specialized search marketing program for content creators, affiliate marketers, and agency professionals wanting to rank #1 on Google.',
    level: 'INTERMEDIATE',
    category: 'SEO',
    price: 4500000, // ₹45,000
    durationHours: 60,
    modules: [
      {
        title: 'Module 1: Search Engine Crawling & Indexing Fundamentals',
        description: 'How search engines discover, render, and index JavaScript and HTML content.',
        lessons: [
          { title: 'Search Engine Architecture & Crawl Budget Optimization', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Robots.txt, XML Sitemaps & Canonical Tags Best Practices', type: 'TEXT', durationMinutes: 30 },
          { title: 'Debugging Indexation in Google Search Console', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 2: Advanced Keyword Research & Search Intent',
        description: 'Finding zero-competition keywords, search intent matching, and content hubs.',
        lessons: [
          { title: 'Finding High-ROI Commercial Intent Keywords (Ahrefs & Semrush)', type: 'VIDEO', durationMinutes: 50 },
          { title: 'Content Topic Clusters & Pillar Page Architecture', type: 'TEXT', durationMinutes: 35 },
          { title: 'SERP Feature Optimization: Featured Snippets & People Also Ask', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 3: AI-Assisted Content Production at Scale',
        description: 'Ethical AI copywriting, factual verification, and Helpful Content Guidelines.',
        lessons: [
          { title: 'Building SEO Briefs with SurferSEO & Clearscope', type: 'VIDEO', durationMinutes: 45 },
          { title: 'Humanizing AI Drafts: Adding EEAT Signals & Case Studies', type: 'TEXT', durationMinutes: 35 },
          { title: 'Formatting for Readability, Skimmability & Time-on-Page', type: 'VIDEO', durationMinutes: 40 }
        ]
      },
      {
        title: 'Module 4: Link Building & Digital PR Outreach',
        description: 'HARO / Connectively, broken link building, and data-driven linkable assets.',
        lessons: [
          { title: 'Creating Linkable Data Studies & Infographics That Attract Press', type: 'VIDEO', durationMinutes: 50 },
          { title: 'High-Converting Cold Outreach Email Templates for Backlinks', type: 'TEXT', durationMinutes: 35 },
          { title: 'Competitor Link Intersect & Reclamation Strategies', type: 'VIDEO', durationMinutes: 45 }
        ]
      },
      {
        title: 'Module 5: Programmatic SEO & Enterprise Auditing',
        description: 'Automating thousands of location/category pages with database templates.',
        lessons: [
          { title: 'Programmatic SEO Architecture: Datasets & Dynamic Templates', type: 'VIDEO', durationMinutes: 55 },
          { title: 'Comprehensive 100-Point Technical SEO Site Audit in Screaming Frog', type: 'TEXT', durationMinutes: 45 },
          { title: 'Measuring Organic Revenue & Conversion Attribution in GA4', type: 'VIDEO', durationMinutes: 40 }
        ]
      }
    ]
  }
];

export const DEMO_BATCHES = [
  {
    name: 'Advanced Digital Marketing - Morning Cohort',
    batchCode: 'DM-2026-OCT-MORNING',
    courseSlug: 'adv-digital-marketing',
    branchCode: 'MAIN',
    instructorEmail: 'aarav.sharma@didm.edu',
    mode: 'OFFLINE',
    status: 'ONGOING',
    timing: 'Mon-Wed-Fri (10:00 AM - 01:00 PM)',
    daysOffset: -30,
    durationDays: 120
  },
  {
    name: 'Advanced Digital Marketing - Evening Cohort',
    batchCode: 'DM-2026-OCT-EVENING',
    courseSlug: 'adv-digital-marketing',
    branchCode: 'GURGAON',
    instructorEmail: 'aarav.sharma@didm.edu',
    mode: 'HYBRID',
    status: 'ONGOING',
    timing: 'Tue-Thu-Sat (06:00 PM - 08:30 PM)',
    daysOffset: -20,
    durationDays: 120
  },
  {
    name: 'Performance Marketing Pro - Weekend Live',
    batchCode: 'PM-2026-NOV',
    courseSlug: 'performance-marketing-masterclass',
    branchCode: 'ONLINE',
    instructorEmail: 'rohan.mehta@didm.edu',
    mode: 'ONLINE',
    status: 'ONGOING',
    timing: 'Sat-Sun (11:00 AM - 02:00 PM)',
    daysOffset: -15,
    durationDays: 90
  },
  {
    name: 'Graphic Design Masterclass - Regular',
    batchCode: 'GD-2026-OCT',
    courseSlug: 'graphic-design-professional',
    branchCode: 'MAIN',
    instructorEmail: 'neha.kapoor@didm.edu',
    mode: 'OFFLINE',
    status: 'ONGOING',
    timing: 'Mon-Wed-Fri (02:00 PM - 05:00 PM)',
    daysOffset: -25,
    durationDays: 90
  },
  {
    name: 'UI/UX Design Intensive - Evening Batch',
    batchCode: 'UIUX-2026-NOV',
    courseSlug: 'ui-ux-design-bootcamp',
    branchCode: 'GURGAON',
    instructorEmail: 'priya.singh@didm.edu',
    mode: 'HYBRID',
    status: 'ONGOING',
    timing: 'Tue-Thu (05:00 PM - 08:00 PM)',
    daysOffset: -10,
    durationDays: 100
  }
];

export const DEMO_CRM_LEADS = [
  {
    name: 'Kabir Batra',
    email: 'kabir.batra@gmail.com',
    phone: '+91 9988771122',
    courseInterest: 'adv-digital-marketing',
    branchCode: 'MAIN',
    stage: 'NEW',
    source: 'WEBSITE_FORM',
    qualificationScore: 85,
    notes: 'Interested in full-time digital marketing program. Currently working in sales.'
  },
  {
    name: 'Mehak Chhabra',
    email: 'mehak.c@outlook.com',
    phone: '+91 9988772233',
    courseInterest: 'performance-marketing-masterclass',
    branchCode: 'ONLINE',
    stage: 'CONTACTED',
    source: 'META_ADS',
    qualificationScore: 90,
    notes: 'DTC founder looking to scale Meta and Google Ads in-house.'
  },
  {
    name: 'Suresh Raina',
    email: 'suresh.raina@gmail.com',
    phone: '+91 9988773344',
    courseInterest: 'graphic-design-professional',
    branchCode: 'MAIN',
    stage: 'QUALIFIED',
    source: 'GOOGLE_SEARCH',
    qualificationScore: 78,
    notes: 'Graduate student wanting to transition into graphic design.'
  },
  {
    name: 'Deepika Padukone',
    email: 'deepika.p@gmail.com',
    phone: '+91 9988774455',
    courseInterest: 'ui-ux-design-bootcamp',
    branchCode: 'GURGAON',
    stage: 'DEMO_SCHEDULED',
    source: 'LINKEDIN',
    qualificationScore: 92,
    notes: 'Scheduled for live 1-on-1 counseling demo this Saturday.'
  },
  {
    name: 'Gautam Gambhir',
    email: 'gautam.g@gmail.com',
    phone: '+91 9988775566',
    courseInterest: 'adv-digital-marketing',
    branchCode: 'MAIN',
    stage: 'FOLLOW_UP',
    source: 'REFERRAL',
    qualificationScore: 80,
    notes: 'Attended weekend demo session; requested fee installment structure details.'
  },
  {
    name: 'Kareena Kapoor',
    email: 'kareena.k@gmail.com',
    phone: '+91 9988776677',
    courseInterest: 'social-media-fundamentals',
    branchCode: 'ONLINE',
    stage: 'APPLICATION_STARTED',
    source: 'INSTAGRAM',
    qualificationScore: 88,
    notes: 'Application form filled; awaiting initial registration fee deposit.'
  },
  {
    name: 'Ranbir Kapoor',
    email: 'ranbir.k@gmail.com',
    phone: '+91 9988777788',
    courseInterest: 'performance-marketing-masterclass',
    branchCode: 'GURGAON',
    stage: 'ADMISSION_IN_PROGRESS',
    source: 'DIRECT_WALKIN',
    qualificationScore: 95,
    notes: 'Document verification completed. Fee plan created.'
  },
  {
    name: 'Aman Verma',
    email: 'aman.verma@student.didm.edu',
    phone: '+91 9810998877',
    courseInterest: 'adv-digital-marketing',
    branchCode: 'MAIN',
    stage: 'CONVERTED',
    source: 'WEBSITE_FORM',
    qualificationScore: 100,
    notes: 'Converted lead successfully enrolled in Advanced Digital Marketing & Performance Marketing.'
  },
  {
    name: 'Ananya Patel',
    email: 'ananya.patel@student.didm.edu',
    phone: '+91 9810998802',
    courseInterest: 'adv-digital-marketing',
    branchCode: 'MAIN',
    stage: 'CONVERTED',
    source: 'GOOGLE_SEARCH',
    qualificationScore: 95,
    notes: 'Successfully enrolled.'
  },
  {
    name: 'Nitin Gadkari',
    email: 'nitin.g@gmail.com',
    phone: '+91 9988778899',
    courseInterest: 'seo-content-specialist',
    branchCode: 'MAIN',
    stage: 'LOST',
    source: 'META_ADS',
    qualificationScore: 40,
    notes: 'Decided to postpone enrollment to next quarter due to travel schedule.'
  }
];
