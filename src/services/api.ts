import type { User, AuthResponse, Meeting, MeetingAnalytics, ActivityLog } from '../types';

const TOKEN_KEY = 'zoomrtc_jwt_token';
const USER_KEY = 'zoomrtc_user_data';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as User;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginUser(userId: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  setStoredAuth(data.token, data.user);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const token = getStoredToken();
  if (!token) throw new Error('No active session token');
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    clearStoredAuth();
    throw new Error(data.error || 'Session expired');
  }
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function createMeeting(params: {
  title?: string;
  passcode?: string;
  settings?: {
    waitingRoomEnabled?: boolean;
    allowChat?: boolean;
    allowScreenShare?: boolean;
    allowUnmute?: boolean;
    encryptedChat?: boolean;
  };
}): Promise<Meeting> {
  const token = getStoredToken();
  const res = await fetch('/api/meetings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create meeting');
  return data.meeting;
}

export async function getMeetingDetails(id: string): Promise<{
  id: string;
  title: string;
  hostName: string;
  isLocked: boolean;
  requiresPasscode: boolean;
  waitingRoomEnabled: boolean;
  activeParticipantsCount: number;
}> {
  const res = await fetch(`/api/meetings/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Meeting not found');
  return data;
}

// Admin APIs
export async function getAdminUsers(): Promise<User[]> {
  const token = getStoredToken();
  const res = await fetch('/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
  return data.users;
}

export async function createEmployeeUser(userData: {
  id: string;
  name: string;
  email?: string;
  department?: string;
  password: string;
  role?: string;
}): Promise<User> {
  const token = getStoredToken();
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create employee user');
  return data.user;
}

export async function updateAdminUserStatus(id: string, status: 'active' | 'suspended'): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update user status');
}

export async function deleteAdminUser(id: string): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete user');
}

export async function getAdminAnalytics(): Promise<MeetingAnalytics> {
  const token = getStoredToken();
  const res = await fetch('/api/admin/analytics', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch analytics');
  return data.analytics;
}

export async function getAdminLogs(category?: string): Promise<ActivityLog[]> {
  const token = getStoredToken();
  const url = category && category !== 'all' ? `/api/admin/logs?category=${category}` : '/api/admin/logs';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch activity logs');
  return data.logs;
}

export async function getAdminActiveRooms(): Promise<Array<Meeting & { activeParticipantsCount: number; waitingRoomCount: number }>> {
  const token = getStoredToken();
  const res = await fetch('/api/admin/active-rooms', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch active rooms');
  return data.rooms;
}

export async function terminateAdminRoom(id: string): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`/api/admin/rooms/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to terminate room');
}
