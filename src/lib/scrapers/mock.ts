import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";

const MOCK_JOBS: RawJob[] = [
  {
    title: "Senior Software Engineer",
    company: "Stripe",
    location: "San Francisco, CA",
    locationType: "hybrid",
    url: "https://stripe.com/jobs/senior-swe",
    source: "mock",
    description:
      "Join Stripe's payments infrastructure team to build reliable, scalable systems that process billions of dollars in transactions. You will design APIs, improve system resilience, and mentor junior engineers. Requires strong experience with distributed systems and at least one of Go, Java, or Ruby.",
    salaryMin: 180000,
    salaryMax: 250000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "large",
    industry: "fintech",
    tags: ["go", "distributed-systems", "payments", "api-design", "ruby"],
    postedAt: daysAgo(2),
  },
  {
    title: "Frontend Developer",
    company: "Vercel",
    location: "Remote",
    locationType: "remote",
    url: "https://vercel.com/careers/frontend-dev",
    source: "mock",
    description:
      "Build the future of web development tooling at Vercel. Work on Next.js dashboard, deployment previews, and developer experience features. Deep knowledge of React, TypeScript, and modern CSS required. You will collaborate closely with the open-source Next.js team.",
    salaryMin: 140000,
    salaryMax: 200000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "medium",
    industry: "developer-tools",
    tags: ["react", "typescript", "next.js", "css", "frontend"],
    postedAt: daysAgo(1),
  },
  {
    title: "Backend Engineer",
    company: "Datadog",
    location: "New York, NY",
    locationType: "hybrid",
    url: "https://datadog.com/careers/backend-eng",
    source: "mock",
    description:
      "Design and implement high-throughput data ingestion pipelines that handle trillions of data points per day. Work with Go, Kafka, and Cassandra at massive scale. You will own services end-to-end from design through production monitoring.",
    salaryMin: 160000,
    salaryMax: 230000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "large",
    industry: "observability",
    tags: ["go", "kafka", "cassandra", "distributed-systems", "backend"],
    postedAt: daysAgo(3),
  },
  {
    title: "Data Scientist",
    company: "Spotify",
    location: "Stockholm, Sweden",
    locationType: "hybrid",
    url: "https://spotify.com/jobs/data-scientist",
    source: "mock",
    description:
      "Apply machine learning to personalize music recommendations for 500M+ users. Build and evaluate models for playlist generation, podcast discovery, and user engagement. Requires strong Python, SQL, and statistical modeling skills.",
    salaryMin: 120000,
    salaryMax: 170000,
    salaryCurrency: "EUR",
    experienceLevel: "mid",
    companySize: "large",
    industry: "entertainment",
    tags: ["python", "machine-learning", "sql", "recommendation-systems", "data-science"],
    postedAt: daysAgo(5),
  },
  {
    title: "DevOps Engineer",
    company: "HashiCorp",
    location: "Remote",
    locationType: "remote",
    url: "https://hashicorp.com/careers/devops",
    source: "mock",
    description:
      "Help build and maintain the infrastructure that powers Terraform Cloud, Vault, and Consul. You will work with Kubernetes, AWS, and our own open-source tools to ensure 99.99% uptime for enterprise customers. Deep IaC and cloud-native experience required.",
    salaryMin: 150000,
    salaryMax: 210000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "medium",
    industry: "cloud-infrastructure",
    tags: ["kubernetes", "terraform", "aws", "devops", "infrastructure"],
    postedAt: daysAgo(1),
  },
  {
    title: "Product Manager",
    company: "Notion",
    location: "San Francisco, CA",
    locationType: "hybrid",
    url: "https://notion.so/careers/product-manager",
    source: "mock",
    description:
      "Own the roadmap for Notion's collaboration features used by millions of teams. Define product strategy, run user research, and work cross-functionally with engineering, design, and marketing. 5+ years of product management experience in productivity or SaaS tools preferred.",
    salaryMin: 160000,
    salaryMax: 220000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "medium",
    industry: "productivity",
    tags: ["product-management", "saas", "collaboration", "user-research"],
    postedAt: daysAgo(4),
  },
  {
    title: "UX Designer",
    company: "Figma",
    location: "New York, NY",
    locationType: "hybrid",
    url: "https://figma.com/careers/ux-designer",
    source: "mock",
    description:
      "Shape the design experience for millions of designers worldwide. Conduct user research, create prototypes, and iterate on Figma's core editing workflows. Strong portfolio demonstrating interaction design and systems thinking required.",
    salaryMin: 130000,
    salaryMax: 185000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "medium",
    industry: "design-tools",
    tags: ["ux-design", "figma", "prototyping", "user-research", "interaction-design"],
    postedAt: daysAgo(6),
  },
  {
    title: "Machine Learning Engineer",
    company: "OpenAI",
    location: "San Francisco, CA",
    locationType: "onsite",
    url: "https://openai.com/careers/ml-engineer",
    source: "mock",
    description:
      "Train and deploy large language models at the frontier of AI research. Work on model optimization, inference infrastructure, and evaluation frameworks. Requires deep experience with PyTorch, CUDA, and large-scale training systems.",
    salaryMin: 200000,
    salaryMax: 350000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "medium",
    industry: "artificial-intelligence",
    tags: ["pytorch", "cuda", "machine-learning", "nlp", "transformers"],
    postedAt: daysAgo(2),
  },
  {
    title: "iOS Developer",
    company: "Airbnb",
    location: "Seattle, WA",
    locationType: "hybrid",
    url: "https://airbnb.com/careers/ios-dev",
    source: "mock",
    description:
      "Build delightful mobile experiences for Airbnb's iOS app used by millions of travelers. Work with Swift, SwiftUI, and our in-house design system. Focus on performance, accessibility, and smooth animations.",
    salaryMin: 155000,
    salaryMax: 215000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "large",
    industry: "travel",
    tags: ["swift", "swiftui", "ios", "mobile", "accessibility"],
    postedAt: daysAgo(7),
  },
  {
    title: "Security Engineer",
    company: "CrowdStrike",
    location: "Austin, TX",
    locationType: "hybrid",
    url: "https://crowdstrike.com/careers/security-eng",
    source: "mock",
    description:
      "Protect enterprise customers from advanced cyber threats. Develop detection rules, analyze malware, and improve our endpoint protection platform. Requires experience with threat hunting, reverse engineering, and incident response.",
    salaryMin: 145000,
    salaryMax: 200000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "large",
    industry: "cybersecurity",
    tags: ["security", "threat-detection", "malware-analysis", "python", "incident-response"],
    postedAt: daysAgo(3),
  },
  {
    title: "Full Stack Engineer",
    company: "Linear",
    location: "Remote",
    locationType: "remote",
    url: "https://linear.app/careers/fullstack",
    source: "mock",
    description:
      "Build the fastest project management tool for software teams. Work across the entire stack with TypeScript, React, Node.js, and PostgreSQL. We value craft, speed, and attention to detail. Small team, high impact.",
    salaryMin: 150000,
    salaryMax: 210000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "small",
    industry: "developer-tools",
    tags: ["typescript", "react", "node.js", "postgresql", "full-stack"],
    postedAt: daysAgo(1),
  },
  {
    title: "Data Engineer",
    company: "Snowflake",
    location: "Bellevue, WA",
    locationType: "hybrid",
    url: "https://snowflake.com/careers/data-engineer",
    source: "mock",
    description:
      "Build the data pipelines and infrastructure that power Snowflake's analytics platform. Work with Spark, Airflow, and dbt to process petabytes of data. Strong SQL and Python skills required along with experience in data modeling.",
    salaryMin: 155000,
    salaryMax: 220000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "large",
    industry: "data-infrastructure",
    tags: ["spark", "airflow", "dbt", "sql", "python", "data-engineering"],
    postedAt: daysAgo(4),
  },
  {
    title: "Android Developer",
    company: "DoorDash",
    location: "Los Angeles, CA",
    locationType: "hybrid",
    url: "https://doordash.com/careers/android-dev",
    source: "mock",
    description:
      "Develop features for DoorDash's Android app serving millions of customers and delivery drivers. Work with Kotlin, Jetpack Compose, and our modular architecture. Focus on real-time order tracking, payments, and map integrations.",
    salaryMin: 140000,
    salaryMax: 195000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "large",
    industry: "food-delivery",
    tags: ["kotlin", "jetpack-compose", "android", "mobile", "maps"],
    postedAt: daysAgo(5),
  },
  {
    title: "Site Reliability Engineer",
    company: "Cloudflare",
    location: "London, UK",
    locationType: "hybrid",
    url: "https://cloudflare.com/careers/sre",
    source: "mock",
    description:
      "Keep Cloudflare's global network running at scale across 300+ cities. Work on capacity planning, incident management, and reliability tooling. Experience with Linux, networking, and automation at scale is essential.",
    salaryMin: 90000,
    salaryMax: 140000,
    salaryCurrency: "GBP",
    experienceLevel: "senior",
    companySize: "large",
    industry: "cloud-infrastructure",
    tags: ["linux", "networking", "sre", "automation", "incident-management"],
    postedAt: daysAgo(2),
  },
  {
    title: "Junior Frontend Developer",
    company: "Shopify",
    location: "Toronto, Canada",
    locationType: "remote",
    url: "https://shopify.com/careers/junior-frontend",
    source: "mock",
    description:
      "Start your career building merchant-facing features for Shopify's admin dashboard. Learn from experienced engineers while working with React, TypeScript, and GraphQL. We invest heavily in mentorship and growth for early-career engineers.",
    salaryMin: 85000,
    salaryMax: 110000,
    salaryCurrency: "CAD",
    experienceLevel: "junior",
    companySize: "large",
    industry: "e-commerce",
    tags: ["react", "typescript", "graphql", "frontend", "shopify"],
    postedAt: daysAgo(3),
  },
  {
    title: "Platform Engineer",
    company: "Twilio",
    location: "Denver, CO",
    locationType: "remote",
    url: "https://twilio.com/careers/platform-eng",
    source: "mock",
    description:
      "Build and maintain the internal developer platform that enables Twilio's engineering teams to ship faster. Work on CI/CD pipelines, container orchestration, and service mesh infrastructure. Terraform, Kubernetes, and Go experience preferred.",
    salaryMin: 145000,
    salaryMax: 200000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "large",
    industry: "communications",
    tags: ["kubernetes", "terraform", "go", "ci-cd", "platform-engineering"],
    postedAt: daysAgo(6),
  },
  {
    title: "Staff Engineer - Databases",
    company: "PlanetScale",
    location: "Remote",
    locationType: "remote",
    url: "https://planetscale.com/careers/staff-eng",
    source: "mock",
    description:
      "Work on Vitess-powered serverless MySQL at massive scale. Design database branching, schema migration, and query optimization features. Deep MySQL internals knowledge and Go experience required. This is a staff-level position with significant technical leadership responsibilities.",
    salaryMin: 200000,
    salaryMax: 280000,
    salaryCurrency: "USD",
    experienceLevel: "staff",
    companySize: "small",
    industry: "databases",
    tags: ["mysql", "vitess", "go", "distributed-systems", "databases"],
    postedAt: daysAgo(8),
  },
  {
    title: "Technical Program Manager",
    company: "Meta",
    location: "Menlo Park, CA",
    locationType: "hybrid",
    url: "https://meta.com/careers/tpm",
    source: "mock",
    description:
      "Drive cross-functional programs across Meta's infrastructure organization. Coordinate engineering teams, manage dependencies, and ensure timely delivery of large-scale technical initiatives. 7+ years of TPM or engineering experience at top-tier tech companies required.",
    salaryMin: 170000,
    salaryMax: 240000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "enterprise",
    industry: "social-media",
    tags: ["program-management", "infrastructure", "cross-functional", "leadership"],
    postedAt: daysAgo(1),
  },
  {
    title: "Rust Systems Engineer",
    company: "Fly.io",
    location: "Remote",
    locationType: "remote",
    url: "https://fly.io/careers/rust-engineer",
    source: "mock",
    description:
      "Build the next generation of edge computing infrastructure in Rust. Work on our hypervisor, networking stack, and container runtime. We deploy globally and care deeply about performance and correctness. Small distributed team with high autonomy.",
    salaryMin: 170000,
    salaryMax: 240000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "small",
    industry: "cloud-infrastructure",
    tags: ["rust", "systems-programming", "networking", "containers", "edge-computing"],
    postedAt: daysAgo(4),
  },
  {
    title: "QA Automation Engineer",
    company: "GitLab",
    location: "Remote",
    locationType: "remote",
    url: "https://gitlab.com/careers/qa-automation",
    source: "mock",
    description:
      "Build and maintain automated test suites for GitLab's CI/CD platform. Design test strategies, implement E2E tests with Playwright, and improve test infrastructure reliability. Ruby and JavaScript experience preferred.",
    salaryMin: 120000,
    salaryMax: 170000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "large",
    industry: "developer-tools",
    tags: ["playwright", "ruby", "javascript", "test-automation", "ci-cd"],
    postedAt: daysAgo(9),
  },
  {
    title: "Solutions Architect",
    company: "AWS",
    location: "Chicago, IL",
    locationType: "hybrid",
    url: "https://aws.amazon.com/careers/solutions-architect",
    source: "mock",
    description:
      "Help enterprise customers design and implement cloud architectures on AWS. Present technical solutions, lead workshops, and build proof-of-concepts. Broad knowledge of cloud services, networking, and security best practices required.",
    salaryMin: 150000,
    salaryMax: 210000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "enterprise",
    industry: "cloud-infrastructure",
    tags: ["aws", "cloud-architecture", "solutions-architecture", "networking", "security"],
    postedAt: daysAgo(2),
  },
  {
    title: "Engineering Manager",
    company: "Plaid",
    location: "San Francisco, CA",
    locationType: "hybrid",
    url: "https://plaid.com/careers/eng-manager",
    source: "mock",
    description:
      "Lead a team of 8-10 engineers building Plaid's core banking connectivity APIs. Balance technical depth with people management, drive hiring, and set team roadmap. Prior experience managing backend or infrastructure teams at a growth-stage fintech preferred.",
    salaryMin: 190000,
    salaryMax: 270000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "medium",
    industry: "fintech",
    tags: ["engineering-management", "fintech", "api-design", "leadership", "hiring"],
    postedAt: daysAgo(3),
  },
  {
    title: "Computer Vision Engineer",
    company: "Waymo",
    location: "Mountain View, CA",
    locationType: "onsite",
    url: "https://waymo.com/careers/cv-engineer",
    source: "mock",
    description:
      "Develop perception algorithms for autonomous vehicles. Work on object detection, tracking, and 3D scene understanding using camera and lidar data. Requires strong C++ skills and research experience in computer vision or deep learning.",
    salaryMin: 180000,
    salaryMax: 260000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "large",
    industry: "autonomous-vehicles",
    tags: ["computer-vision", "c++", "deep-learning", "lidar", "autonomous-driving"],
    postedAt: daysAgo(5),
  },
  {
    title: "Technical Writer",
    company: "Supabase",
    location: "Remote",
    locationType: "remote",
    url: "https://supabase.com/careers/technical-writer",
    source: "mock",
    description:
      "Write clear, comprehensive documentation for Supabase's open-source platform. Create tutorials, API references, and migration guides. Collaborate with engineering to document new features. Familiarity with databases, APIs, and developer tooling is a plus.",
    salaryMin: 100000,
    salaryMax: 145000,
    salaryCurrency: "USD",
    experienceLevel: "mid",
    companySize: "small",
    industry: "developer-tools",
    tags: ["technical-writing", "documentation", "postgresql", "apis", "open-source"],
    postedAt: daysAgo(7),
  },
  {
    title: "Blockchain Engineer",
    company: "Coinbase",
    location: "Remote",
    locationType: "remote",
    url: "https://coinbase.com/careers/blockchain-eng",
    source: "mock",
    description:
      "Build secure, scalable blockchain infrastructure for Coinbase's trading platform. Work on wallet systems, transaction processing, and smart contract integrations. Deep experience with Ethereum, Solidity, and cryptographic protocols required.",
    salaryMin: 175000,
    salaryMax: 250000,
    salaryCurrency: "USD",
    experienceLevel: "senior",
    companySize: "large",
    industry: "cryptocurrency",
    tags: ["blockchain", "ethereum", "solidity", "cryptography", "web3"],
    postedAt: daysAgo(6),
  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Filter mock jobs based on search configuration.
 * Applies title matching, location filtering, keyword inclusion/exclusion,
 * blacklisted companies, salary range, and experience level.
 */
function filterJobs(jobs: RawJob[], config: SearchConfigData): RawJob[] {
  return jobs.filter((job) => {
    // Blacklisted companies
    if (
      config.blacklistedCompanies.some(
        (bc) => bc.toLowerCase() === job.company.toLowerCase()
      )
    ) {
      return false;
    }

    // Title matching (if titles specified, at least one must partially match)
    if (config.titles.length > 0) {
      const titleLower = job.title.toLowerCase();
      const hasMatch = config.titles.some((t) =>
        titleLower.includes(t.toLowerCase())
      );
      if (!hasMatch) return false;
    }

    // Remote preferred globally; India jobs accept any location type
    if (!passesGeoFilter(job.location, job.locationType)) return false;

    // Experience level
    if (config.experienceLevel && job.experienceLevel) {
      if (config.experienceLevel !== job.experienceLevel) return false;
    }

    // Salary range
    if (config.salaryMin && job.salaryMax) {
      if (job.salaryMax < config.salaryMin) return false;
    }
    if (config.salaryMax && job.salaryMin) {
      if (job.salaryMin > config.salaryMax) return false;
    }

    // Include keywords (at least one must appear in title, description, or tags)
    if (config.includeKeywords.length > 0) {
      const searchText = [
        job.title,
        job.description ?? "",
        ...(job.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const hasKeyword = config.includeKeywords.some((kw) =>
        searchText.includes(kw.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Exclude keywords (none should appear)
    if (config.excludeKeywords.length > 0) {
      const searchText = [
        job.title,
        job.description ?? "",
        ...(job.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const hasExcluded = config.excludeKeywords.some((kw) =>
        searchText.includes(kw.toLowerCase())
      );
      if (hasExcluded) return false;
    }

    return true;
  });
}

/** Get all mock jobs without filtering (used for seeding) */
export function getMockJobs(): RawJob[] {
  return [...MOCK_JOBS];
}

export class MockScraper implements Scraper {
  name = "mock";
  enabled = true;

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
      const filtered = filterJobs(MOCK_JOBS, config);
      return {
        jobs: filtered,
        errors,
        source: this.name,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error in mock scraper";
      errors.push(message);
      return {
        jobs: [],
        errors,
        source: this.name,
        durationMs: Date.now() - start,
      };
    }
  }
}
