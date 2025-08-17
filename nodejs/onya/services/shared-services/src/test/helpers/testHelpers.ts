import { prisma } from '../setup';
import { createHashedUserData } from '../fixtures/user.fixtures';
import { createChatSessionData, createMessageData } from '../fixtures/chat.fixtures';
import jwt from 'jsonwebtoken';

export const createTestUser = async (userData: Partial<any> = {}) => {
  const hashedData = await createHashedUserData(userData);
  return prisma.user.create({
    data: hashedData,
  });
};

export const createTestChatSession = async (sessionData: Partial<any> = {}) => {
  const data = createChatSessionData(sessionData);
  return prisma.chatSession.create({
    data,
  });
};

export const createTestMessage = async (messageData: Partial<any> = {}) => {
  const data = createMessageData(messageData);
  return prisma.message.create({
    data,
  });
};

export const generateTestJWT = (payload: any) => {
  return jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
};

export const createAuthHeaders = (user: any) => {
  const token = generateTestJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const waitForMs = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const expectToBeRecent = (date: Date, withinMs: number = 5000) => {
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  expect(diff).toBeLessThan(withinMs);
};