import { PrismaClient, UserRole, UserTier, OperatorStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../shared/utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seeding...');

  try {
    // Clear existing data in development
    if (process.env.NODE_ENV === 'development') {
      logger.info('Clearing existing data...');
      await prisma.message.deleteMany();
      await prisma.escalation.deleteMany();
      await prisma.chatSession.deleteMany();
      await prisma.operator.deleteMany();
      await prisma.user.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.chatMetrics.deleteMany();
    }

    // Hash password for demo users
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@onya.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'ADMIN',
        tier: 'ENTERPRISE',
      },
    });

    // Create operators
    const operatorUsers = await Promise.all([
      prisma.user.create({
        data: {
          email: 'alice.operator@onya.com',
          password: hashedPassword,
          name: 'Alice Johnson',
          role: 'OPERATOR',
          tier: 'PREMIUM',
        },
      }),
      prisma.user.create({
        data: {
          email: 'bob.operator@onya.com',
          password: hashedPassword,
          name: 'Bob Smith',
          role: 'OPERATOR',
          tier: 'PREMIUM',
        },
      }),
      prisma.user.create({
        data: {
          email: 'carol.operator@onya.com',
          password: hashedPassword,
          name: 'Carol Davis',
          role: 'OPERATOR',
          tier: 'PREMIUM',
        },
      }),
    ]);

    // Create operator profiles
    const operators = await Promise.all([
      prisma.operator.create({
        data: {
          userId: operatorUsers[0].id,
          status: 'ONLINE',
          skills: ['General Support', 'Technical Issues', 'Billing'],
          maxSessions: 5,
          currentLoad: 0,
        },
      }),
      prisma.operator.create({
        data: {
          userId: operatorUsers[1].id,
          status: 'BUSY',
          skills: ['Technical Issues', 'Product Support'],
          maxSessions: 3,
          currentLoad: 2,
        },
      }),
      prisma.operator.create({
        data: {
          userId: operatorUsers[2].id,
          status: 'AWAY',
          skills: ['Billing', 'Account Management', 'Sales'],
          maxSessions: 4,
          currentLoad: 0,
        },
      }),
    ]);

    // Create customer users
    const customerUsers = await Promise.all([
      prisma.user.create({
        data: {
          email: 'john.customer@example.com',
          password: hashedPassword,
          name: 'John Doe',
          role: 'CUSTOMER',
          tier: 'BASIC',
        },
      }),
      prisma.user.create({
        data: {
          email: 'jane.customer@example.com',
          password: hashedPassword,
          name: 'Jane Smith',
          role: 'CUSTOMER',
          tier: 'PREMIUM',
        },
      }),
      prisma.user.create({
        data: {
          email: 'enterprise.customer@company.com',
          password: hashedPassword,
          name: 'Enterprise Customer',
          role: 'CUSTOMER',
          tier: 'ENTERPRISE',
        },
      }),
    ]);

    // Create demo chat sessions
    const chatSessions = await Promise.all([
      // Active session with customer 1
      prisma.chatSession.create({
        data: {
          customerId: customerUsers[0].id,
          status: 'ACTIVE',
          subject: 'Product inquiry',
          priority: 'MEDIUM',
          metadata: {
            source: 'website',
            page: '/products',
          },
        },
      }),
      // Escalated session with customer 2
      prisma.chatSession.create({
        data: {
          customerId: customerUsers[1].id,
          operatorId: operatorUsers[1].id,
          status: 'ESCALATED',
          subject: 'Billing issue',
          priority: 'HIGH',
          metadata: {
            source: 'email',
            escalatedAt: new Date().toISOString(),
          },
        },
      }),
      // Resolved session with enterprise customer
      prisma.chatSession.create({
        data: {
          customerId: customerUsers[2].id,
          operatorId: operatorUsers[0].id,
          status: 'RESOLVED',
          subject: 'Integration support',
          priority: 'HIGH',
          metadata: {
            source: 'api',
            resolutionTime: 45,
          },
          closedAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      }),
    ]);

    // Create demo messages for the sessions
    await Promise.all([
      // Messages for active session
      prisma.message.create({
        data: {
          sessionId: chatSessions[0].id,
          userId: customerUsers[0].id,
          content: 'Hi, I have a question about your product pricing.',
          type: 'USER',
        },
      }),
      prisma.message.create({
        data: {
          sessionId: chatSessions[0].id,
          content: 'Hello! I\'d be happy to help you with pricing information. What specific product are you interested in?',
          type: 'ASSISTANT',
          metadata: {
            llmProvider: 'mock',
            confidence: 0.95,
          },
        },
      }),
      
      // Messages for escalated session
      prisma.message.create({
        data: {
          sessionId: chatSessions[1].id,
          userId: customerUsers[1].id,
          content: 'I was charged twice for my subscription this month.',
          type: 'USER',
        },
      }),
      prisma.message.create({
        data: {
          sessionId: chatSessions[1].id,
          content: 'I understand your concern about the duplicate charge. Let me escalate this to our billing specialist.',
          type: 'ASSISTANT',
          metadata: {
            escalationTriggered: true,
            reason: 'billing_issue',
          },
        },
      }),
      prisma.message.create({
        data: {
          sessionId: chatSessions[1].id,
          userId: operatorUsers[1].id,
          content: 'Hi Jane, I\'m Bob from our billing team. I can see the duplicate charge on your account. Let me refund that for you right away.',
          type: 'OPERATOR',
        },
      }),
    ]);

    // Create escalation for the escalated session
    await prisma.escalation.create({
      data: {
        sessionId: chatSessions[1].id,
        reason: 'Billing dispute - duplicate charge',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        queuePosition: 1,
        estimatedWaitTime: 5,
        assignedAt: new Date(),
      },
    });

    // Create chat metrics
    await Promise.all([
      prisma.chatMetrics.create({
        data: {
          sessionId: chatSessions[2].id,
          totalMessages: 8,
          customerMessages: 4,
          botMessages: 2,
          operatorMessages: 2,
          averageResponseTime: 45.5,
          customerSatisfaction: 4.5,
          resolutionTime: 45,
          escalated: true,
          resolved: true,
        },
      }),
    ]);

    // Create audit logs
    await Promise.all([
      prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'DATABASE_SEED',
          resource: 'SYSTEM',
          details: {
            usersCreated: customerUsers.length + operatorUsers.length + 1,
            sessionsCreated: chatSessions.length,
            timestamp: new Date().toISOString(),
          },
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: operatorUsers[1].id,
          action: 'SESSION_ASSIGNED',
          resource: 'CHAT_SESSION',
          resourceId: chatSessions[1].id,
          details: {
            customerId: customerUsers[1].id,
            priority: 'HIGH',
            reason: 'billing_issue',
          },
        },
      }),
    ]);

    logger.info('Database seeding completed successfully', {
      users: {
        admin: 1,
        operators: operatorUsers.length,
        customers: customerUsers.length,
      },
      chatSessions: chatSessions.length,
      operators: operators.length,
    });

  } catch (error) {
    logger.error('Database seeding failed', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  });