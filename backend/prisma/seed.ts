import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed a realistic microservice architecture so the simulator has
 * meaningful data to display out of the box.
 *
 * Layout:
 *   Auth --> Users
 *   API Gateway --> Auth, Rate Limiter, Logging
 *   Rate Limiter --> Redis
 *   Logging --> Elasticsearch
 *   Orders --> Payment, Inventory, Auth
 *   Payment --> Stripe, Fraud Detection
 *   Inventory --> Postgres
 *   Fraud Detection --> ML Service, Auth
 *   Notifications --> Email, SMS, Push
 *   Checkout --> Orders, Payment, Notifications
 *   Analytics --> Kafka, Postgres
 *   Recommendations --> ML Service, Analytics
 */

const services = [
  // Edge
  { name: "API Gateway", owner: "Platform", criticality: "CRITICAL", status: "HEALTHY", description: "Public entry point" },
  { name: "Web App", owner: "Frontend", criticality: "HIGH", status: "HEALTHY", description: "Customer-facing web app" },
  { name: "Mobile App", owner: "Mobile", criticality: "HIGH", status: "HEALTHY", description: "iOS/Android client" },

  // Auth
  { name: "Auth Service", owner: "Identity", criticality: "CRITICAL", status: "HEALTHY", description: "OAuth, sessions" },
  { name: "User Service", owner: "Identity", criticality: "HIGH", status: "HEALTHY", description: "User profiles" },

  // Core business
  { name: "Orders Service", owner: "Commerce", criticality: "CRITICAL", status: "HEALTHY", description: "Order lifecycle" },
  { name: "Payment Service", owner: "Commerce", criticality: "CRITICAL", status: "HEALTHY", description: "Payments & refunds" },
  { name: "Inventory Service", owner: "Commerce", criticality: "HIGH", status: "DEGRADED", description: "Stock management" },
  { name: "Checkout Service", owner: "Commerce", criticality: "CRITICAL", status: "HEALTHY", description: "Cart & checkout flow" },

  // External integrations
  { name: "Stripe", owner: "External", criticality: "HIGH", status: "HEALTHY", description: "Payment processor" },
  { name: "Fraud Detection", owner: "Risk", criticality: "HIGH", status: "HEALTHY", description: "Risk scoring" },
  { name: "ML Service", owner: "Data", criticality: "MEDIUM", status: "HEALTHY", description: "ML inference" },

  // Infrastructure
  { name: "Postgres", owner: "Platform", criticality: "CRITICAL", status: "HEALTHY", description: "Primary DB" },
  { name: "Redis", owner: "Platform", criticality: "MEDIUM", status: "HEALTHY", description: "Cache & rate limits" },
  { name: "Kafka", owner: "Platform", criticality: "HIGH", status: "HEALTHY", description: "Event bus" },
  { name: "Elasticsearch", owner: "Platform", criticality: "MEDIUM", status: "HEALTHY", description: "Search & logs" },

  // Cross-cutting
  { name: "Rate Limiter", owner: "Platform", criticality: "MEDIUM", status: "HEALTHY", description: "Throttling" },
  { name: "Logging", owner: "Platform", criticality: "LOW", status: "HEALTHY", description: "Centralized logs" },
  { name: "Notifications", owner: "Comms", criticality: "HIGH", status: "HEALTHY", description: "Notification dispatcher" },
  { name: "Email Service", owner: "Comms", criticality: "MEDIUM", status: "HEALTHY", description: "Transactional email" },
  { name: "SMS Service", owner: "Comms", criticality: "LOW", status: "HEALTHY", description: "SMS gateway" },
  { name: "Push Service", owner: "Comms", criticality: "LOW", status: "HEALTHY", description: "Push notifications" },

  // Data
  { name: "Analytics", owner: "Data", criticality: "MEDIUM", status: "HEALTHY", description: "Event analytics" },
  { name: "Recommendations", owner: "Data", criticality: "MEDIUM", status: "HEALTHY", description: "Recommendation engine" },
];

// serviceName -> dependsOnName[]
const dependencies: Record<string, string[]> = {
  "API Gateway": ["Auth Service", "Rate Limiter", "Logging"],
  "Web App": ["API Gateway"],
  "Mobile App": ["API Gateway"],
  "Auth Service": ["User Service", "Redis"],
  "User Service": ["Postgres"],
  "Rate Limiter": ["Redis"],
  Logging: ["Elasticsearch"],
  "Orders Service": ["Payment Service", "Inventory Service", "Auth Service", "Postgres"],
  "Payment Service": ["Stripe", "Fraud Detection"],
  "Inventory Service": ["Postgres"],
  "Checkout Service": ["Orders Service", "Payment Service", "Notifications"],
  "Fraud Detection": ["ML Service", "Auth Service"],
  Notifications: ["Email Service", "SMS Service", "Push Service"],
  Analytics: ["Kafka", "Postgres"],
  Recommendations: ["ML Service", "Analytics"],
};

async function main() {
  // eslint-disable-next-line no-console
  console.log("Seeding database...");

  // Clean existing data
  await prisma.impactedService.deleteMany();
  await prisma.simulationFailure.deleteMany();
  await prisma.simulation.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.service.deleteMany();

  const idMap = new Map<string, string>();

  for (const s of services) {
    const created = await prisma.service.create({ data: s });
    idMap.set(created.name, created.id);
  }

  for (const [from, deps] of Object.entries(dependencies)) {
    const fromId = idMap.get(from);
    if (!fromId) continue;
    for (const to of deps) {
      const toId = idMap.get(to);
      if (!toId) continue;
      await prisma.dependency.create({
        data: { serviceId: fromId, dependsOnServiceId: toId },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${services.length} services and ${Object.values(dependencies).flat().length} dependencies`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });