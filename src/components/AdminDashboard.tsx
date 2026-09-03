import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Video,
  Activity,
  UserPlus,
  Lock,
  Search,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Radio,
  Server,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { User, MeetingAnalytics, ActivityLog, Meeting } from '../types';
import {
  getAdminUsers,
  createEmployeeUser,
  updateAdminUserStatus,
  deleteAdminUser,
  getAdminAnalytics,
  getAdminLogs,
  getAdminActiveRooms,
  terminateAdminRoom,
} from '../services/api';

interface AdminDashboardProps {
  currentUser: User;
  onBackToLobby: () => void;
  onJoinRoomDirectly?: (roomId: string, passcode: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onBackToLobby,
  onJoinRoomDirectly,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'rooms' | 'analytics' | 'logs'>('users');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);

  // User Management
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDept, setNewUserDept] = useState('Platform Engineering');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'employee' | 'co-host'>('employee');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Active Rooms
  const [activeRooms, setActiveRooms] = useState<Array<Meeting & { activeParticipantsCount: number; waitingRoomCount: number }>>([]);

  // Activity Logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logCategory, setLogCategory] = useState('all');
  const [logSearch, setLogSearch] = useState('');

  // Fetch all admin data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [analyticsData, usersData, roomsData, logsData] = await Promise.all([
        getAdminAnalytics(),
        getAdminUsers(),
        getAdminActiveRooms(),
        getAdminLogs(logCategory),
      ]);
      setAnalytics(analyticsData);
      setUsers(usersData);
      setActiveRooms(roomsData);
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // live polling for real-time analytics
    return () => clearInterval(interval);
  }, [logCategory]);

  // Suggest employee ID
  const openCreateEmployeeModal = () => {
    const nextNum = Math.floor(100 + Math.random() * 900);
    setNewUserId(`EMP-${nextNum}`);
    setNewUserName('');
    setNewUserEmail(`emp${nextNum}@company.internal`);
    setNewUserPassword(`pass${nextNum}`);
    setCreateError(null);
    setCreateSuccess(null);
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateError(null);
      await createEmployeeUser({
        id: newUserId.trim(),
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        department: newUserDept.trim(),
        password: newUserPassword.trim(),
        role: newUserRole,
      });
      setCreateSuccess(`User ID ${newUserId} created successfully! Employee can now sign in.`);
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 1500);
      fetchData();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateAdminUserStatus(id, newStatus);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ID "${id}"?`)) return;
    try {
      await deleteAdminUser(id);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleTerminateRoom = async (roomId: string) => {
    if (!window.confirm(`Force terminate meeting room ${roomId}? All connected participants will be disconnected.`)) return;
    try {
      await terminateAdminRoom(roomId);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to terminate room');
    }
  };

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `zoomrtc-audit-log-${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  const filteredUsers = users.filter((u) =>
    u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredLogs = logs.filter((l) =>
    l.actorName.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.details.toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="flex-1 bg-[#0F1117] text-gray-100 p-4 md:p-8 flex flex-col items-center justify-start overflow-y-auto">
      <div className="w-full max-w-7xl">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">
                Administrative Control Panel
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
              Enterprise Governance & Telemetry
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Logged in as Master Administrator (<code className="text-purple-400 font-mono font-bold">Admin</code>) • Real-time WebRTC Telemetry & Access Control
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={fetchData}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onBackToLobby}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              Back to Meeting Lobby
            </button>
          </div>
        </div>

        {/* Real-time Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
          <div className="bg-[#161922] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Active Rooms</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-white">{analytics?.activeRooms ?? 0}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Online</span>
            </div>
          </div>

          <div className="bg-[#161922] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Live Participants</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-blue-400">{analytics?.totalOnlineParticipants ?? 0}</span>
              <span className="text-[10px] text-gray-500 font-semibold">Peers</span>
            </div>
          </div>

          <div className="bg-[#161922] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Bandwidth Load</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-indigo-400">{analytics?.aggregateBandwidthMbps ?? 0}</span>
              <span className="text-[10px] text-gray-500 font-semibold">Mbps</span>
            </div>
          </div>

          <div className="bg-[#161922] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Avg Peer Latency</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-emerald-400">{analytics?.avgLatencyMs ?? 24}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">ms</span>
            </div>
          </div>

          <div className="bg-[#161922] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Packet Loss</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-white">{analytics?.packetLossPercent ?? 0.05}%</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Optimal</span>
            </div>
          </div>

          <div className="bg-[#161922] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-medium">Server Uptime</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-purple-400">{analytics?.uptimeHours ?? 0}</span>
              <span className="text-[10px] text-gray-500 font-semibold">Hours</span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center space-x-2 border-b border-gray-800 pb-4 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employee ID Management ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'rooms'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Live Rooms ({activeRooms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Audit & Activity Logs ({logs.length})</span>
          </button>
        </div>

        {/* TAB 1: EMPLOYEE ID MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search employees by name, ID, department..."
                  className="w-full bg-[#161922] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={openCreateEmployeeModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center space-x-2 cursor-pointer transition-all self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Employee User ID</span>
              </button>
            </div>

            {/* Users Directory Table */}
            <div className="bg-[#161922] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#12141A] text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
                    <tr>
                      <th className="px-5 py-3.5">User ID</th>
                      <th className="px-5 py-3.5">Full Name</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Account Status</th>
                      <th className="px-5 py-3.5">Created Date</th>
                      <th className="px-5 py-3.5 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-850/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-blue-400">
                          {u.id}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-white">
                          {u.name}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400">
                          {u.department || 'General Staff'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          {u.id.toLowerCase() !== 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u.id, u.status)}
                                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                                  u.status === 'active'
                                    ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                                }`}
                              >
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                title="Delete user account"
                                className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {u.id.toLowerCase() === 'admin' && (
                            <span className="text-[11px] text-gray-500 italic">Primary Account</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE MEETING ROOMS */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="bg-[#161922] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Active Ongoing Meetings</h3>
                  <p className="text-xs text-gray-400">Real-time room status, attendee counts, and moderation access</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {activeRooms.length} Registered Rooms
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#12141A] text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
                    <tr>
                      <th className="px-5 py-3.5">Meeting ID</th>
                      <th className="px-5 py-3.5">Topic</th>
                      <th className="px-5 py-3.5">Host</th>
                      <th className="px-5 py-3.5">Passcode</th>
                      <th className="px-5 py-3.5">Live Attendees</th>
                      <th className="px-5 py-3.5">Security Policies</th>
                      <th className="px-5 py-3.5 text-right">Admin Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {activeRooms.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-850/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-blue-400">
                          {room.id}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-white">
                          {room.title}
                        </td>
                        <td className="px-5 py-3.5 text-gray-300">
                          {room.hostName}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-gray-400">
                          {room.passcode}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            {room.activeParticipantsCount} Connected
                          </span>
                          {room.waitingRoomCount > 0 && (
                            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                              {room.waitingRoomCount} Waiting
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-1.5 text-[10px]">
                            {room.settings?.waitingRoomEnabled && (
                              <span className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">Waiting Room</span>
                            )}
                            {room.settings?.encryptedChat && (
                              <span className="bg-emerald-950/60 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/40">E2EE</span>
                            )}
                            {room.settings?.isLocked && (
                              <span className="bg-amber-950/60 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/40">Locked</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          {onJoinRoomDirectly && (
                            <button
                              type="button"
                              onClick={() => onJoinRoomDirectly(room.id, room.passcode)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Inspect Room
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleTerminateRoom(room.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Force End
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT & ACTIVITY LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logs by user, action, room..."
                    className="w-full bg-[#161922] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value)}
                  className="bg-[#161922] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Event Categories</option>
                  <option value="auth">Authentication</option>
                  <option value="meeting">Meeting Lifecycle</option>
                  <option value="moderation">Participant Moderation</option>
                  <option value="user-management">Employee Creation</option>
                  <option value="security">Security & Locks</option>
                </select>
              </div>

              <button
                type="button"
                onClick={exportLogsAsJson}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit Log (JSON)</span>
              </button>
            </div>

            {/* Logs Table */}
            <div className="bg-[#161922] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#12141A] text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
                    <tr>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Actor</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Action Event</th>
                      <th className="px-5 py-3.5">Audit Details</th>
                      <th className="px-5 py-3.5">Room ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-850/40 transition-colors">
                        <td className="px-5 py-3 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-semibold text-white block">{log.actorName}</span>
                          <span className="text-[10px] text-gray-500">ID: {log.actorId}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.category === 'security'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : log.category === 'moderation'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : log.category === 'user-management'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {log.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-200">
                          {log.action}
                        </td>
                        <td className="px-5 py-3 text-gray-300">
                          {log.details}
                        </td>
                        <td className="px-5 py-3 font-mono text-blue-400 text-[11px]">
                          {log.roomId || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Employee User ID */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1B1F2A] border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Employee User ID</h3>
            <p className="text-xs text-gray-400 mb-4">
              Provision employee credentials to join meetings securely under corporate access control.
            </p>

            {createError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Employee User ID
                </label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="e.g. EMP-104"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Employee Full Name
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Robert Smith"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Platform Engineering">Engineering</option>
                    <option value="Product Strategy">Product</option>
                    <option value="Design Systems">Design</option>
                    <option value="Security & Compliance">Security</option>
                    <option value="Operations & Sales">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'employee' | 'co-host')}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="co-host">Co-Host / Moderator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Account Password
                </label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Password for initial login"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Provision User ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
