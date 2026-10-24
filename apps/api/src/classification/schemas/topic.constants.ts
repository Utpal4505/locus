export interface PredefinedTopicDefinition {
  name: string;
  slug: string;
  description: string;
}

export const TOPIC_SLUGS = [
  "ai",
  "ml",
  "db",
  "backend",
  "apis",
  "system-design",
  "dsa",
  "web",
  "devops",
  "security",
  "languages",
  "cs",
  "tech-news",
  "tech-debates",
] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export const PREDEFINED_TOPICS: readonly PredefinedTopicDefinition[] = [
  {
    name: "AI",
    slug: "ai",
    description:
      "Artificial Intelligence, Large Language Models, generative AI, transformers, autonomous agents, prompt engineering, computer vision, and NLP.",
  },
  {
    name: "ML",
    slug: "ml",
    description:
      "Machine learning algorithms, model training, fine-tuning, PyTorch, TensorFlow, inference pipelines, and feature engineering.",
  },
  {
    name: "DB",
    slug: "db",
    description:
      "Relational and NoSQL databases, SQL, query optimization, indexing, ACID transactions, data modeling, replication, and PostgreSQL.",
  },
  {
    name: "Backend",
    slug: "backend",
    description:
      "Server-side engineering, backend frameworks, microservices, business logic, asynchronous task processing, runtime environments, and distributed workers.",
  },
  {
    name: "APIs",
    slug: "apis",
    description:
      "RESTful API design, GraphQL, gRPC, webhooks, API gateways, rate limiting, authentication headers, specifications, and client contracts.",
  },
  {
    name: "System Design",
    slug: "system-design",
    description:
      "Scalable distributed systems, high availability, caching strategies, load balancing, consensus algorithms, event-driven architectures, and fault tolerance.",
  },
  {
    name: "DSA",
    slug: "dsa",
    description:
      "Data structures, algorithms, dynamic programming, trees, graphs, sorting, searching, time/space complexity analysis, and coding patterns.",
  },
  {
    name: "Web",
    slug: "web",
    description:
      "Modern web frontend development, React, Next.js, HTML/CSS/JavaScript/TypeScript, UI components, state management, and browser performance.",
  },
  {
    name: "DevOps",
    slug: "devops",
    description:
      "CI/CD pipelines, Docker, Kubernetes, AWS, GCP, Azure, cloud infrastructure, Terraform, container orchestration, and site reliability engineering.",
  },
  {
    name: "Security",
    slug: "security",
    description:
      "Application security, cybersecurity, cryptography, vulnerability testing, authentication vulnerabilities, penetration testing, and defensive programming.",
  },
  {
    name: "Languages",
    slug: "languages",
    description:
      "Programming language paradigms, type systems, compiler fundamentals, memory management, and idioms across Rust, Go, TypeScript, C++, Python.",
  },
  {
    name: "CS",
    slug: "cs",
    description:
      "Computer science fundamentals, operating system internals, networking protocols (TCP/IP), concurrency primitives, threads, and memory architecture.",
  },
  {
    name: "Tech News",
    slug: "tech-news",
    description:
      "Technology industry developments, software framework releases, hardware breakthroughs, major open-source launches, and tech business reporting.",
  },
  {
    name: "Tech Debates",
    slug: "tech-debates",
    description:
      "Engineering trade-offs, programming philosophies, paradigm disputes, architectural debates, tool comparisons, and tech career discussions.",
  },
] as const;

