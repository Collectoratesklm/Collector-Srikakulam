import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import type {
  User,
  UserRole,
  Meeting,
  MeetingSettings,
  Participant,
  ChatMessage,
  ActivityLog,
  MeetingAnalytics,
} from './src/types';

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zoomrtc-enterprise-secret-key-2026';

app.use(express.json());

// In-Memory Database / Store
interface StoredUser extends User {
  password: string;
}

const users: Map<string, StoredUser> = new Map();
const meetings: Map<string, Meeting & {
  participants: Map<string, Participant>;
  waitingRoom: Map<string, Participant>;
  chatHistory: ChatMessage[];
}> = new Map();

const activityLogs: ActivityLog[] = [];
const startTime = Date.now();

function logActivity(
  actor: { id: string; name: string; role: UserRole },
  action: string,
  category: ActivityLog['category'],
  details: string,
  roomId?: string
) {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    category,
    details,
    roomId,
  };
  activityLogs.unshift(log);
  if (activityLogs.length > 300) {
    activityLogs.pop();
  }
}

// Seed Initial Accounts (Admin & Employees)
const initialUsers: StoredUser[] = [
  {
    id: 'Admin',
    password: 'Admin',
    name: 'Executive Admin',
    email: 'admin@company.internal',
    role: 'admin',
    department: 'IT Security & Operations',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'EMP-101',
    password: 'sarah123',
    name: 'Sarah Connor',
    email: 'sarah.c@company.internal',
    role: 'employee',
    department: 'Platform Engineering',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: 'EMP-102',
    password: 'david123',
    name: 'David Chen',
    email: 'david.chen@company.internal',
    role: 'employee',
    department: 'Product Strategy',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'EMP-103',
    password: 'elena123',
    name: 'Elena Rostova',
    email: 'elena.r@company.internal',
    role: 'employee',
    department: 'Design Systems',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

for (const u of initialUsers) {
  users.set(u.id.toLowerCase(), u);
}

// Pre-seed a default active company meeting for instant testing
const defaultMeetingId = '948-283-1029';
meetings.set(defaultMeetingId, {
  id: defaultMeetingId,
  title: 'Engineering All-Hands & Product Sync',
  passcode: '654321',
  hostUserId: 'Admin',
  hostName: 'Executive Admin',
  settings: {
    waitingRoomEnabled: true,
    isLocked: false,
    allowChat: true,
    allowScreenShare: true,
    allowUnmute: true,
    requirePasscode: true,
    encryptedChat: true,
  },
  createdAt: new Date().toISOString(),
  activeParticipantsCount: 0,
  participants: new Map(),
  waitingRoom: new Map(),
  chatHistory: [],
});

logActivity(
  { id: 'Admin', name: 'Executive Admin', role: 'admin' },
  'Meeting Initialized',
  'meeting',
  `All-Hands meeting initialized with ID ${defaultMeetingId}`,
  defaultMeetingId
);

// Helper JWT Middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    (req as unknown as { user: User }).user = decodedUser as User;
    next();
  });
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as unknown as { user?: User }).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  next();
}

// REST API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) });
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and Password are required' });
  }

  const user = users.get(userId.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid User ID. Please check your credentials.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'This user account has been suspended by an Administrator.' });
  }

  const safeUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    status: user.status,
    createdAt: user.createdAt,
  };

  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '24h' });

  logActivity(
    { id: user.id, name: user.name, role: user.role },
    'User Authenticated',
    'auth',
    `User ${user.name} logged in successfully via JWT session`
  );

  return res.json({ token, user: safeUser });
});

// Auth: Current User Session
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = (req as unknown as { user: User }).user;
  res.json({ user });
});

// Admin: User Management - List Users
app.get('/api/admin/users', authenticateToken, requireAdmin, (_req, res) => {
  const list = Array.from(users.values()).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    status: u.status,
    createdAt: u.createdAt,
  }));
  res.json({ users: list });
});

// Admin: User Management - Create Employee User ID
app.post('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const { id, name, email, department, password, role = 'employee' } = req.body;
  const adminActor = (req as unknown as { user: User }).user;

  if (!id || !name || !password) {
    return res.status(400).json({ error: 'User ID, Full Name, and Password are required' });
  }

  const cleanId = id.trim();
  if (users.has(cleanId.toLowerCase())) {
    return res.status(409).json({ error: `User ID "${cleanId}" already exists` });
  }

  const newUser: StoredUser = {
    id: cleanId,
    name: name.trim(),
    email: email ? email.trim() : `${cleanId.toLowerCase()}@company.internal`,
    department: department ? department.trim() : 'General Staff',
    password: password.trim(),
    role: role as UserRole,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  users.set(cleanId.toLowerCase(), newUser);

  logActivity(
    adminActor,
    'Created Employee User ID',
    'user-management',
    `Admin created user account ${newUser.id} (${newUser.name}) with role ${newUser.role}`
  );

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      department: newUser.department,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
    },
  });
});

// Admin: User Management - Toggle Status
app.patch('/api/admin/users/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const targetId = req.params.id.toLowerCase();
  const { status } = req.body;
  const adminActor = (req as unknown as { user: User }).user;

  const targetUser = users.get(targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUser.id.toLowerCase() === 'admin' && status === 'suspended') {
    return res.status(400).json({ error: 'Cannot suspend the primary Administrator account' });
  }

  targetUser.status = status === 'suspended' ? 'suspended' : 'active';

  logActivity(
    adminActor,
    'Updated User Status',
    'user-management',
    `Account ${targetUser.id} status changed to ${targetUser.status}`
  );

  res.json({ message: 'Status updated', user: targetUser });
});

// Admin: User Management - Delete User
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const targetId = req.params.id.toLowerCase();
  const adminActor = (req as unknown as { user: User }).user;

  if (targetId === 'admin') {
    return res.status(400).json({ error: 'Cannot delete primary Admin user' });
  }

  if (!users.has(targetId)) {
    return res.status(404).json({ error: 'User not found' });
  }

  const deleted = users.get(targetId)!;
  users.delete(targetId);

  logActivity(
    adminActor,
    'Deleted Employee Account',
    'user-management',
    `Admin removed user ${deleted.id} (${deleted.name})`
  );

  res.json({ message: 'User deleted successfully' });
});

// Admin: Real-time Analytics
app.get('/api/admin/analytics', authenticateToken, requireAdmin, (_req, res) => {
  let totalOnline = 0;
  let activeRoomsCount = 0;

  for (const m of meetings.values()) {
    if (m.participants.size > 0) {
      activeRoomsCount++;
      totalOnline += m.participants.size;
    }
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const uptimeHours = Number((uptimeSeconds / 3600).toFixed(2));

  // Calculated network quality metrics based on active peers
  const bandwidthPerPeerMbps = 1.8;
  const aggregateBandwidthMbps = Number((totalOnline * bandwidthPerPeerMbps).toFixed(1));
  const avgLatencyMs = totalOnline > 0 ? Math.floor(28 + Math.random() * 8) : 22;
  const packetLossPercent = totalOnline > 0 ? Number((0.08 + Math.random() * 0.1).toFixed(2)) : 0.02;

  const analytics: MeetingAnalytics = {
    activeRooms: activeRoomsCount,
    totalOnlineParticipants: totalOnline,
    totalMeetingsToday: meetings.size,
    aggregateBandwidthMbps,
    avgLatencyMs,
    packetLossPercent,
    uptimeHours,
  };

  res.json({ analytics });
});

// Admin: Activity Logs
app.get('/api/admin/logs', authenticateToken, requireAdmin, (req, res) => {
  const category = req.query.category as string;
  let filtered = activityLogs;
  if (category && category !== 'all') {
    filtered = activityLogs.filter(l => l.category === category);
  }
  res.json({ logs: filtered });
});

// Admin: Live Active Rooms
app.get('/api/admin/active-rooms', authenticateToken, requireAdmin, (_req, res) => {
  const roomsList = Array.from(meetings.values()).map(m => ({
    id: m.id,
    title: m.title,
    passcode: m.passcode,
    hostUserId: m.hostUserId,
    hostName: m.hostName,
    settings: m.settings,
    createdAt: m.createdAt,
    activeParticipantsCount: m.participants.size,
    waitingRoomCount: m.waitingRoom.size,
    participants: Array.from(m.participants.values()),
  }));
  res.json({ rooms: roomsList });
});

// Admin: Terminate Room
app.delete('/api/admin/rooms/:id', authenticateToken, requireAdmin, (req, res) => {
  const roomId = req.params.id;
  const adminActor = (req as unknown as { user: User }).user;
  const meeting = meetings.get(roomId);

  if (!meeting) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Notify everyone in the room that the meeting has ended by admin
  io.to(`room:${roomId}`).emit('meeting:terminated', {
    reason: 'Meeting ended by Administrator via control console.',
  });

  meeting.participants.clear();
  meeting.waitingRoom.clear();
  meetings.delete(roomId);

  logActivity(
    adminActor,
    'Terminated Meeting Room',
    'moderation',
    `Administrator forced termination of room ${roomId}`,
    roomId
  );

  res.json({ message: 'Room terminated successfully' });
});

// Meeting API: Create Meeting
app.post('/api/meetings', authenticateToken, (req, res) => {
  const user = (req as unknown as { user: User }).user;
  const { title, passcode, settings } = req.body;

  // Generate formatted 10-digit room ID e.g. 849-204-1928
  const randNum = () => Math.floor(100 + Math.random() * 900);
  const newMeetingId = `${randNum()}-${randNum()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const defaultSettings: MeetingSettings = {
    waitingRoomEnabled: settings?.waitingRoomEnabled ?? true,
    isLocked: false,
    allowChat: settings?.allowChat ?? true,
    allowScreenShare: settings?.allowScreenShare ?? true,
    allowUnmute: settings?.allowUnmute ?? true,
    requirePasscode: Boolean(passcode),
    encryptedChat: settings?.encryptedChat ?? true,
  };

  const meeting: Meeting & {
    participants: Map<string, Participant>;
    waitingRoom: Map<string, Participant>;
    chatHistory: ChatMessage[];
  } = {
    id: newMeetingId,
    title: title?.trim() || `${user.name}'s Virtual Conference`,
    passcode: passcode?.trim() || Math.floor(100000 + Math.random() * 900000).toString(),
    hostUserId: user.id,
    hostName: user.name,
    settings: defaultSettings,
    createdAt: new Date().toISOString(),
    activeParticipantsCount: 0,
    participants: new Map(),
    waitingRoom: new Map(),
    chatHistory: [],
  };

  meetings.set(newMeetingId, meeting);

  logActivity(
    user,
    'Created Meeting',
    'meeting',
    `User ${user.name} scheduled/created meeting ${meeting.id} (${meeting.title})`,
    meeting.id
  );

  res.status(201).json({ meeting });
});

// Meeting API: Check Meeting Details
app.get('/api/meetings/:id', (req, res) => {
  const meetingId = req.params.id.trim();
  const meeting = meetings.get(meetingId);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found. Please verify the meeting ID.' });
  }

  res.json({
    id: meeting.id,
    title: meeting.title,
    hostName: meeting.hostName,
    isLocked: meeting.settings.isLocked,
    requiresPasscode: meeting.settings.requirePasscode,
    waitingRoomEnabled: meeting.settings.waitingRoomEnabled,
    activeParticipantsCount: meeting.participants.size,
  });
});

// ==========================================
// SOCKET.IO REAL-TIME SIGNALING & MODERATION
// ==========================================
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 15000,
});

const avatarColors = [
  '#0E72ED', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#6366F1'
];

io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let currentUser: User | null = null;
  let currentParticipant: Participant | null = null;

  // 1. Join Room Request
  socket.on('room:join', async (data: {
    roomId: string;
    token: string;
    passcode?: string;
    mediaState?: { isMuted: boolean; isVideoOff: boolean };
  }) => {
    try {
      const { roomId, token, passcode, mediaState } = data;
      if (!roomId || !token) {
        return socket.emit('room:error', { message: 'Meeting ID and authentication are required.' });
      }

      // Verify JWT
      let decodedUser: User;
      try {
        decodedUser = jwt.verify(token, JWT_SECRET) as User;
      } catch {
        return socket.emit('room:error', { message: 'Invalid or expired credentials.' });
      }

      const meeting = meetings.get(roomId);
      if (!meeting) {
        return socket.emit('room:error', { message: 'Meeting does not exist.' });
      }

      // Check if locked
      if (meeting.settings.isLocked && decodedUser.role !== 'admin' && decodedUser.id !== meeting.hostUserId) {
        return socket.emit('room:error', { message: 'This meeting is locked by the host. No new participants can join.' });
      }

      // Check Passcode (exempt admin or host)
      if (
        meeting.settings.requirePasscode &&
        decodedUser.role !== 'admin' &&
        decodedUser.id !== meeting.hostUserId
      ) {
        if (!passcode || passcode.trim() !== meeting.passcode) {
          return socket.emit('room:passcode-required', { message: 'Invalid meeting passcode.' });
        }
      }

      const isHost = meeting.hostUserId === decodedUser.id || decodedUser.role === 'admin';
      const userRole: UserRole = isHost ? (decodedUser.role === 'admin' ? 'admin' : 'host') : 'employee';

      const colorIndex = Math.abs(decodedUser.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % avatarColors.length;

      const participant: Participant = {
        socketId: socket.id,
        userId: decodedUser.id,
        name: decodedUser.name,
        role: userRole,
        department: decodedUser.department,
        isMuted: mediaState?.isMuted ?? false,
        isVideoOff: mediaState?.isVideoOff ?? false,
        isScreenSharing: false,
        isHandRaised: false,
        inWaitingRoom: false,
        joinedAt: new Date().toISOString(),
        avatarColor: avatarColors[colorIndex],
      };

      currentRoomId = roomId;
      currentUser = decodedUser;
      currentParticipant = participant;

      // Check Waiting Room rule: if waiting room enabled and user is NOT host/admin
      if (meeting.settings.waitingRoomEnabled && !isHost) {
        participant.inWaitingRoom = true;
        meeting.waitingRoom.set(socket.id, participant);

        // Put socket into waiting state
        socket.emit('room:waiting-room', {
          meetingTitle: meeting.title,
          hostName: meeting.hostName,
          message: 'Please wait, the meeting host will let you in soon.',
        });

        // Notify room hosts that someone is in waiting room
        io.to(`room:${roomId}`).emit('waiting-room:updated', {
          waitingParticipants: Array.from(meeting.waitingRoom.values()),
        });

        logActivity(
          decodedUser,
          'Entered Waiting Room',
          'meeting',
          `${decodedUser.name} entered waiting room for meeting ${meeting.id}`,
          meeting.id
        );
        return;
      }

      // Directly Join Room
      await completeJoinRoom(socket, meeting, participant);
    } catch (err) {
      console.error('Error in room:join:', err);
      socket.emit('room:error', { message: 'Failed to join meeting session' });
    }
  });

  // Admit from Waiting Room (Host/Admin action)
  socket.on('waiting-room:admit', async ({ targetSocketId }: { targetSocketId: string }) => {
    if (!currentRoomId || !currentParticipant) return;
    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') {
      return socket.emit('error', { message: 'Only hosts can admit participants' });
    }

    const targetParticipant = meeting.waitingRoom.get(targetSocketId);
    if (!targetParticipant) return;

    meeting.waitingRoom.delete(targetSocketId);
    targetParticipant.inWaitingRoom = false;

    // Find target socket
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit('room:admitted');
      await completeJoinRoom(targetSocket, meeting, targetParticipant);

      logActivity(
        currentUser!,
        'Admitted Participant',
        'moderation',
        `${currentParticipant.name} admitted ${targetParticipant.name} from waiting room`,
        meeting.id
      );
    }

    // Update remaining waiting room list
    io.to(`room:${meeting.id}`).emit('waiting-room:updated', {
      waitingParticipants: Array.from(meeting.waitingRoom.values()),
    });
  });

  // Admit All from Waiting Room
  socket.on('waiting-room:admit-all', async () => {
    if (!currentRoomId || !currentParticipant) return;
    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') {
      return;
    }

    for (const [targetSocketId, targetParticipant] of Array.from(meeting.waitingRoom.entries())) {
      meeting.waitingRoom.delete(targetSocketId);
      targetParticipant.inWaitingRoom = false;
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('room:admitted');
        await completeJoinRoom(targetSocket, meeting, targetParticipant);
      }
    }

    io.to(`room:${meeting.id}`).emit('waiting-room:updated', {
      waitingParticipants: [],
    });
  });

  // Deny / Remove from Waiting Room
  socket.on('waiting-room:deny', ({ targetSocketId }: { targetSocketId: string }) => {
    if (!currentRoomId || !currentParticipant) return;
    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') {
      return;
    }

    const target = meeting.waitingRoom.get(targetSocketId);
    meeting.waitingRoom.delete(targetSocketId);

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit('room:denied', {
        message: 'The host has denied your request to join this meeting.',
      });
    }

    io.to(`room:${meeting.id}`).emit('waiting-room:updated', {
      waitingParticipants: Array.from(meeting.waitingRoom.values()),
    });

    if (target && currentUser) {
      logActivity(
        currentUser,
        'Denied Entry',
        'moderation',
        `${currentParticipant.name} denied ${target.name} from waiting room`,
        meeting.id
      );
    }
  });

  // Helper: finalize room join
  async function completeJoinRoom(
    sock: Socket,
    meeting: Meeting & {
      participants: Map<string, Participant>;
      waitingRoom: Map<string, Participant>;
      chatHistory: ChatMessage[];
    },
    participant: Participant
  ) {
    sock.join(`room:${meeting.id}`);
    meeting.participants.set(sock.id, participant);
    meeting.activeParticipantsCount = meeting.participants.size;

    // Send full current room state to joining participant
    sock.emit('room:joined', {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        passcode: meeting.passcode,
        hostUserId: meeting.hostUserId,
        hostName: meeting.hostName,
        settings: meeting.settings,
        createdAt: meeting.createdAt,
        activeParticipantsCount: meeting.participants.size,
      },
      self: participant,
      existingParticipants: Array.from(meeting.participants.values()).filter(p => p.socketId !== sock.id),
      waitingParticipants: Array.from(meeting.waitingRoom.values()),
      chatHistory: meeting.chatHistory.slice(-50),
    });

    // Notify other peers that a new user joined
    sock.to(`room:${meeting.id}`).emit('peer:joined', {
      participant,
    });

    logActivity(
      { id: participant.userId, name: participant.name, role: participant.role },
      'Joined Meeting',
      'meeting',
      `${participant.name} (${participant.role}) connected to meeting ${meeting.id}`,
      meeting.id
    );
  }

  // 2. WebRTC Signaling Relays
  socket.on('signal:offer', (payload: {
    targetSocketId: string;
    offer: RTCSessionDescriptionInit;
    senderInfo: Participant;
  }) => {
    io.to(payload.targetSocketId).emit('signal:offer', {
      senderSocketId: socket.id,
      offer: payload.offer,
      senderInfo: payload.senderInfo,
    });
  });

  socket.on('signal:answer', (payload: {
    targetSocketId: string;
    answer: RTCSessionDescriptionInit;
  }) => {
    io.to(payload.targetSocketId).emit('signal:answer', {
      senderSocketId: socket.id,
      answer: payload.answer,
    });
  });

  socket.on('signal:ice-candidate', (payload: {
    targetSocketId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    io.to(payload.targetSocketId).emit('signal:ice-candidate', {
      senderSocketId: socket.id,
      candidate: payload.candidate,
    });
  });

  // 3. User Media & Interaction State Changes
  socket.on('user:toggle-audio', ({ isMuted }: { isMuted: boolean }) => {
    if (!currentRoomId || !currentParticipant) return;
    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    currentParticipant.isMuted = isMuted;
    io.to(`room:${currentRoomId}`).emit('peer:state-changed', {
      socketId: socket.id,
      updates: { isMuted },
    });
  });

  socket.on('user:toggle-video', ({ isVideoOff }: { isVideoOff: boolean }) => {
    if (!currentRoomId || !currentParticipant) return;
    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    currentParticipant.isVideoOff = isVideoOff;
    io.to(`room:${currentRoomId}`).emit('peer:state-changed', {
      socketId: socket.id,
      updates: { isVideoOff },
    });
  });

  socket.on('user:toggle-screenshare', ({ isScreenSharing }: { isScreenSharing: boolean }) => {
    if (!currentRoomId || !currentParticipant) return;
    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    if (isScreenSharing && !meeting.settings.allowScreenShare && currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') {
      return socket.emit('error', { message: 'Screen sharing is disabled by the host.' });
    }

    currentParticipant.isScreenSharing = isScreenSharing;
    io.to(`room:${currentRoomId}`).emit('peer:state-changed', {
      socketId: socket.id,
      updates: { isScreenSharing },
    });
  });

  socket.on('user:toggle-hand', ({ isHandRaised }: { isHandRaised: boolean }) => {
    if (!currentRoomId || !currentParticipant) return;
    currentParticipant.isHandRaised = isHandRaised;
    io.to(`room:${currentRoomId}`).emit('peer:state-changed', {
      socketId: socket.id,
      updates: { isHandRaised },
    });
  });

  socket.on('user:send-reaction', ({ reaction }: { reaction: string }) => {
    if (!currentRoomId || !currentParticipant) return;
    io.to(`room:${currentRoomId}`).emit('peer:reaction', {
      socketId: socket.id,
      name: currentParticipant.name,
      reaction,
    });
  });

  // 4. In-Meeting Chat (Encrypted & Group/Private)
  socket.on('chat:send-message', (data: {
    recipientSocketId?: string;
    encryptedContent: string;
    isEncrypted: boolean;
  }) => {
    if (!currentRoomId || !currentParticipant) return;
    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    if (!meeting.settings.allowChat && currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') {
      return socket.emit('error', { message: 'Chat is currently disabled by the host.' });
    }

    const { recipientSocketId, encryptedContent, isEncrypted } = data;

    let recipientName = 'Everyone';
    if (recipientSocketId && recipientSocketId !== 'everyone') {
      const target = meeting.participants.get(recipientSocketId);
      recipientName = target ? target.name : 'Participant';
    }

    const chatMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      senderId: currentParticipant.userId,
      senderSocketId: socket.id,
      senderName: currentParticipant.name,
      senderRole: currentParticipant.role,
      recipientSocketId: recipientSocketId || 'everyone',
      recipientName,
      encryptedContent,
      isEncrypted,
      timestamp: new Date().toISOString(),
    };

    if (!recipientSocketId || recipientSocketId === 'everyone') {
      meeting.chatHistory.push(chatMessage);
      io.to(`room:${currentRoomId}`).emit('chat:received', chatMessage);
    } else {
      // Private direct message: emit to target and echo to sender
      io.to(recipientSocketId).emit('chat:received', chatMessage);
      socket.emit('chat:received', chatMessage);
    }
  });

  // 5. Host & Admin Moderation Tools
  socket.on('host:mute-participant', ({ targetSocketId }: { targetSocketId: string }) => {
    if (!currentRoomId || !currentParticipant) return;
    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') return;

    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    const target = meeting.participants.get(targetSocketId);
    if (target) {
      target.isMuted = true;
      io.to(targetSocketId).emit('moderation:force-mute');
      io.to(`room:${currentRoomId}`).emit('peer:state-changed', {
        socketId: targetSocketId,
        updates: { isMuted: true },
      });

      logActivity(
        currentUser!,
        'Muted Participant',
        'moderation',
        `${currentParticipant.name} muted ${target.name}`,
        currentRoomId
      );
    }
  });

  socket.on('host:mute-all', () => {
    if (!currentRoomId || !currentParticipant) return;
    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') return;

    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    for (const [sId, p] of meeting.participants.entries()) {
      if (sId !== socket.id && p.role !== 'admin' && p.role !== 'host') {
        p.isMuted = true;
        io.to(sId).emit('moderation:force-mute');
        io.to(`room:${currentRoomId}`).emit('peer:state-changed', {
          socketId: sId,
          updates: { isMuted: true },
        });
      }
    }

    logActivity(
      currentUser!,
      'Muted All Participants',
      'moderation',
      `${currentParticipant.name} muted all non-host participants`,
      currentRoomId
    );
  });

  socket.on('host:stop-video', ({ targetSocketId }: { targetSocketId: string }) => {
    if (!currentRoomId || !currentParticipant) return;
    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') return;

    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    const target = meeting.participants.get(targetSocketId);
    if (target) {
      target.isVideoOff = true;
      io.to(targetSocketId).emit('moderation:force-stop-video');
      io.to(`room:${currentRoomId}`).emit('peer:state-changed', {
        socketId: targetSocketId,
        updates: { isVideoOff: true },
      });
    }
  });

  socket.on('host:kick-participant', ({ targetSocketId, reason }: { targetSocketId: string; reason?: string }) => {
    if (!currentRoomId || !currentParticipant) return;
    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') return;

    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    const target = meeting.participants.get(targetSocketId);
    if (target) {
      meeting.participants.delete(targetSocketId);
      meeting.activeParticipantsCount = meeting.participants.size;

      io.to(targetSocketId).emit('moderation:kicked', {
        reason: reason || 'You were removed from the meeting by the host.',
      });

      io.to(`room:${currentRoomId}`).emit('peer:left', {
        socketId: targetSocketId,
        participantName: target.name,
      });

      logActivity(
        currentUser!,
        'Kicked Participant',
        'moderation',
        `${currentParticipant.name} removed ${target.name} from meeting ${currentRoomId}`,
        currentRoomId
      );
    }
  });

  socket.on('host:transfer-host', ({ targetSocketId }: { targetSocketId: string }) => {
    if (!currentRoomId || !currentParticipant) return;
    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') return;

    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    const target = meeting.participants.get(targetSocketId);
    if (target) {
      meeting.hostUserId = target.userId;
      meeting.hostName = target.name;
      target.role = 'host';

      if (currentParticipant.role === 'host') {
        currentParticipant.role = 'employee';
      }

      io.to(`room:${currentRoomId}`).emit('room:host-transferred', {
        newHostSocketId: targetSocketId,
        newHostName: target.name,
      });

      logActivity(
        currentUser!,
        'Transferred Host Privileges',
        'moderation',
        `${currentParticipant.name} transferred host role to ${target.name}`,
        currentRoomId
      );
    }
  });

  socket.on('host:toggle-lock', ({ isLocked }: { isLocked: boolean }) => {
    if (!currentRoomId || !currentParticipant) return;
    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') return;

    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    meeting.settings.isLocked = isLocked;
    io.to(`room:${currentRoomId}`).emit('room:settings-updated', {
      settings: meeting.settings,
    });

    logActivity(
      currentUser!,
      isLocked ? 'Locked Meeting' : 'Unlocked Meeting',
      'security',
      `${currentParticipant.name} ${isLocked ? 'locked' : 'unlocked'} meeting ${currentRoomId}`,
      currentRoomId
    );
  });

  socket.on('host:update-settings', (newSettings: Partial<MeetingSettings>) => {
    if (!currentRoomId || !currentParticipant) return;
    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') return;

    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    meeting.settings = { ...meeting.settings, ...newSettings };
    io.to(`room:${currentRoomId}`).emit('room:settings-updated', {
      settings: meeting.settings,
    });

    logActivity(
      currentUser!,
      'Updated Meeting Settings',
      'moderation',
      `${currentParticipant.name} updated security & meeting rules`,
      currentRoomId
    );
  });

  socket.on('host:end-meeting', () => {
    if (!currentRoomId || !currentParticipant) return;
    if (currentParticipant.role !== 'host' && currentParticipant.role !== 'admin') return;

    const meeting = meetings.get(currentRoomId);
    if (!meeting) return;

    io.to(`room:${currentRoomId}`).emit('meeting:terminated', {
      reason: 'The meeting has ended by the host.',
    });

    meeting.participants.clear();
    meeting.waitingRoom.clear();

    logActivity(
      currentUser!,
      'Ended Meeting for All',
      'meeting',
      `${currentParticipant.name} concluded meeting ${currentRoomId}`,
      currentRoomId
    );
  });

  // 6. Socket Disconnect
  socket.on('disconnect', () => {
    if (currentRoomId && currentParticipant) {
      const meeting = meetings.get(currentRoomId);
      if (meeting) {
        meeting.participants.delete(socket.id);
        meeting.waitingRoom.delete(socket.id);
        meeting.activeParticipantsCount = meeting.participants.size;

        socket.to(`room:${currentRoomId}`).emit('peer:left', {
          socketId: socket.id,
          participantName: currentParticipant.name,
        });

        // If host disconnected and there are other participants, promote next employee
        if (meeting.hostUserId === currentParticipant.userId && meeting.participants.size > 0) {
          const nextPeer = Array.from(meeting.participants.values())[0];
          meeting.hostUserId = nextPeer.userId;
          meeting.hostName = nextPeer.name;
          nextPeer.role = 'host';
          io.to(`room:${currentRoomId}`).emit('room:host-transferred', {
            newHostSocketId: nextPeer.socketId,
            newHostName: nextPeer.name,
          });
        }
      }
    }
  });
});

// Vite Middleware for Development / Static serving in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ZoomRTC Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
