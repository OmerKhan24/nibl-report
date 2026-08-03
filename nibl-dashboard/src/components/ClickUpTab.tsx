'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Key, 
  User, 
  Briefcase, 
  Layers, 
  ListTodo, 
  PlusCircle, 
  LogOut, 
  Calendar, 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink 
} from 'lucide-react';
import styles from './ClickUpTab.module.css';

interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture?: string;
}

interface ClickUpMember {
  user: {
    id: number;
    username: string;
    email: string;
    color: string;
    profile_picture?: string;
  };
}

interface Team {
  id: string;
  name: string;
  members: ClickUpMember[];
}

interface Space {
  id: string;
  name: string;
}

interface List {
  id: string;
  name: string;
  folderName: string | null;
  statuses: { status: string; type: string; color: string }[];
}

interface Task {
  id: string;
  name: string;
  description: string;
  status: { status: string; color: string; type: string };
  priority: { priority: string; color: string; id: string } | null;
  due_date: string | null;
  assignees: { id: number; username: string; color: string; profilePicture?: string }[];
  url: string;
}

export default function ClickUpTab() {
  // Token state
  const [token, setToken] = useState<string>('');
  const [tokenVerified, setTokenVerified] = useState<boolean>(false);
  const [checkingToken, setCheckingToken] = useState<boolean>(true);

  // Meta states
  const [user, setUser] = useState<ClickUpUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');

  // Task list and interaction states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [loadingMeta, setLoadingMeta] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newTaskName, setNewTaskName] = useState<string>('');
  const [newTaskDesc, setNewTaskDesc] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('3'); // 3 is Normal
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [listStatuses, setListStatuses] = useState<{ status: string; type: string; color: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('clickup_api_token') || '';
    setToken(savedToken);
    verifyAndInit(savedToken);
  }, []);

  // Main verify and initialize call
  const verifyAndInit = async (tokenToVerify: string) => {
    setCheckingToken(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (tokenToVerify) {
        headers['x-clickup-token'] = tokenToVerify;
      }

      // 1. Try to get user
      const userRes = await fetch('/api/clickup?action=user', { headers });
      if (!userRes.ok) {
        throw new Error('Failed to authorize with ClickUp API token.');
      }

      const userData = await userRes.json();
      setUser(userData.user);
      setTokenVerified(true);
      if (tokenToVerify) {
        localStorage.setItem('clickup_api_token', tokenToVerify);
      }

      // 2. Fetch Teams
      setLoadingMeta(true);
      const teamsRes = await fetch('/api/clickup?action=teams', { headers });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams || []);
        if (teamsData.teams && teamsData.teams.length > 0) {
          const defaultTeamId = teamsData.teams[0].id;
          setSelectedTeamId(defaultTeamId);
          await loadSpaces(defaultTeamId, tokenToVerify);
        }
      }
    } catch (err: any) {
      console.error(err);
      setTokenVerified(false);
      // Don't show global error if it's just that they need to enter a token
      if (tokenToVerify) {
        setError('Invalid token or connection issues. Please try again.');
      }
    } finally {
      setCheckingToken(false);
      setLoadingMeta(false);
    }
  };

  // Load spaces
  const loadSpaces = async (teamId: string, currentToken = token) => {
    if (!teamId) return;
    setLoadingMeta(true);
    try {
      const headers: Record<string, string> = {};
      if (currentToken) headers['x-clickup-token'] = currentToken;

      const res = await fetch(`/api/clickup?action=spaces&teamId=${teamId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSpaces(data.spaces || []);
        if (data.spaces && data.spaces.length > 0) {
          const defaultSpaceId = data.spaces[0].id;
          setSelectedSpaceId(defaultSpaceId);
          await loadLists(defaultSpaceId, currentToken);
        } else {
          setSelectedSpaceId('');
          setLists([]);
          setSelectedListId('');
          setTasks([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMeta(false);
    }
  };

  // Load lists
  const loadLists = async (spaceId: string, currentToken = token) => {
    if (!spaceId) return;
    setLoadingMeta(true);
    try {
      const headers: Record<string, string> = {};
      if (currentToken) headers['x-clickup-token'] = currentToken;

      const res = await fetch(`/api/clickup?action=lists&spaceId=${spaceId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
        if (data.lists && data.lists.length > 0) {
          const defaultListId = data.lists[0].id;
          setSelectedListId(defaultListId);
          await loadTasks(defaultListId, currentToken);
        } else {
          setSelectedListId('');
          setTasks([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMeta(false);
    }
  };

  // Load tasks
  const loadTasks = async (listId: string, currentToken = token) => {
    if (!listId) return;
    setLoadingTasks(true);
    try {
      const headers: Record<string, string> = {};
      if (currentToken) headers['x-clickup-token'] = currentToken;

      const res = await fetch(`/api/clickup?action=tasks&listId=${listId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setListStatuses(data.statuses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Handle workspace dropdown change
  const handleTeamChange = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedSpaceId('');
    setSpaces([]);
    setSelectedListId('');
    setLists([]);
    setTasks([]);
    setListStatuses([]);
    setSelectedAssignees([]);
    await loadSpaces(teamId);
  };

  // Handle space dropdown change
  const handleSpaceChange = async (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setSelectedListId('');
    setLists([]);
    setTasks([]);
    setListStatuses([]);
    setSelectedAssignees([]);
    await loadLists(spaceId);
  };

  // Handle list dropdown change
  const handleListChange = async (listId: string) => {
    setSelectedListId(listId);
    setTasks([]);
    setListStatuses([]);
    setSelectedAssignees([]);
    await loadTasks(listId);
  };

  // Handle custom token submit
  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      verifyAndInit(token.trim());
    }
  };

  // Handle logout / clear token
  const handleLogout = () => {
    localStorage.removeItem('clickup_api_token');
    setToken('');
    setUser(null);
    setTokenVerified(false);
    setTeams([]);
    setSpaces([]);
    setLists([]);
    setTasks([]);
    setListStatuses([]);
    setSelectedAssignees([]);
  };

  // Create task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !selectedListId) return;

    setActionLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['x-clickup-token'] = token;

      const dueDateMs = newTaskDueDate ? new Date(newTaskDueDate).getTime() : undefined;
      const assignees = selectedAssignees;

      const body = {
        listId: selectedListId,
        name: newTaskName.trim(),
        description: newTaskDesc.trim(),
        priority: parseInt(newTaskPriority),
        dueDate: dueDateMs,
        assignees,
      };

      const res = await fetch('/api/clickup', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create task');
      }

      // Success
      setNewTaskName('');
      setNewTaskDesc('');
      setNewTaskDueDate('');
      setSelectedAssignees([]);
      
      // Reload task list
      await loadTasks(selectedListId);
    } catch (err: any) {
      setError(err.message || 'Error creating task');
    } finally {
      setActionLoading(false);
    }
  };

  // Update task status (toggle complete)
  const handleToggleComplete = async (task: Task) => {
    const isCompleted = task.status.type === 'closed' || task.status.status.toLowerCase() === 'complete' || task.status.type === 'done';
    
    let targetStatus = '';
    if (isCompleted) {
      // Revert to the first open/active status
      const openStatus = listStatuses.find(s => s.type === 'open') || listStatuses[0];
      targetStatus = openStatus ? openStatus.status : 'to do';
    } else {
      // Mark complete
      const closedStatus = listStatuses.find(s => s.type === 'closed') || 
                           listStatuses.find(s => s.status.toLowerCase() === 'complete') ||
                           listStatuses.find(s => s.type === 'done');
      targetStatus = closedStatus ? closedStatus.status : 'complete';
    }

    setActionLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['x-clickup-token'] = token;

      const res = await fetch('/api/clickup', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          taskId: task.id,
          status: targetStatus,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update task status');
      }

      // Refresh tasks
      await loadTasks(selectedListId);
    } catch (err: any) {
      setError(err.message || 'Error updating task status');
    } finally {
      setActionLoading(false);
    }
  };

  // Update task status (directly to a specific value)
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['x-clickup-token'] = token;

      const res = await fetch('/api/clickup', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          taskId,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update task status');
      }

      // Refresh tasks
      await loadTasks(selectedListId);
    } catch (err: any) {
      setError(err.message || 'Error updating task status');
    } finally {
      setActionLoading(false);
    }
  };

  // Return loading state during token verify
  if (checkingToken) {
    return (
      <div className={styles.loadingWrapper}>
        <Loader2 className={styles.spinner} size={32} />
        <p>Connecting to ClickUp API…</p>
      </div>
    );
  }

  // Return Token Setup screen if not authorized
  if (!tokenVerified) {
    return (
      <div className={styles.tokenSetup}>
        <div className={styles.tokenIcon}>
          <Key size={28} />
        </div>
        <h3>Connect ClickUp</h3>
        <p>
          Integrate ClickUp tasks into your NIBL dashboard. Enter your Personal API Token to authorize access.
        </p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleTokenSubmit} className={styles.tokenForm}>
          <div className={styles.formGroup}>
            <label htmlFor="tokenInput">Personal API Token</label>
            <input
              id="tokenInput"
              type="password"
              className={styles.tokenInput}
              placeholder="pk_12345678_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={styles.saveBtn}>
            Save and Connect
          </button>
        </form>

        <div className={styles.instructions}>
          <h4>How to get your API Token:</h4>
          <ol>
            <li>Log in to your ClickUp account.</li>
            <li>Click your avatar in the bottom-left corner and go to <strong>Settings</strong>.</li>
            <li>In the sidebar, click on <strong>Apps</strong> under settings.</li>
            <li>Under the <strong>API Token</strong> section, click <strong>Generate</strong>.</li>
            <li>Copy the token (begins with <code>pk_</code>) and paste it here.</li>
          </ol>
        </div>
      </div>
    );
  }

  // Active integration view
  const activeTeam = teams.find(t => t.id === selectedTeamId);
  const teamMembers = activeTeam?.members || [];

  const filteredTasks = tasks.filter(task => {
    const isClosed = task.status.type === 'closed' || task.status.status.toLowerCase() === 'complete' || task.status.type === 'done';
    if (statusFilter === 'active') {
      return !isClosed;
    }
    if (statusFilter === 'completed') {
      return isClosed;
    }
    if (statusFilter === 'all') {
      return true;
    }
    // Filter by specific status name
    return task.status.status === statusFilter;
  });

  return (
    <div className={styles.container}>
      {/* Header Info */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>ClickUp Task Center</h2>
          <p className={styles.subtitle}>Manage workspaces, spaces, lists, and create tasks</p>
        </div>

        {user && (
          <div className={styles.userProfile}>
            <div 
              className={styles.avatar}
              style={{ backgroundColor: user.color }}
            >
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.username} className={styles.avatarImg} />
              ) : (
                user.username.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.username}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Disconnect ClickUp">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Nav Dropdowns */}
      <div className={styles.filterRow}>
        {/* Workspace select */}
        <div className={styles.selectGroup}>
          <label className={styles.selectLabel}>
            <Briefcase size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Workspace
          </label>
          <select 
            className={styles.select}
            value={selectedTeamId}
            onChange={(e) => handleTeamChange(e.target.value)}
            disabled={loadingMeta}
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Space select */}
        <div className={styles.selectGroup}>
          <label className={styles.selectLabel}>
            <Layers size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Space
          </label>
          <select 
            className={styles.select}
            value={selectedSpaceId}
            onChange={(e) => handleSpaceChange(e.target.value)}
            disabled={loadingMeta || spaces.length === 0}
          >
            {spaces.length === 0 ? (
              <option>No Spaces Available</option>
            ) : (
              spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            )}
          </select>
        </div>

        {/* List select */}
        <div className={styles.selectGroup}>
          <label className={styles.selectLabel}>
            <ListTodo size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> List
          </label>
          <select 
            className={styles.select}
            value={selectedListId}
            onChange={(e) => handleListChange(e.target.value)}
            disabled={loadingMeta || lists.length === 0}
          >
            {lists.length === 0 ? (
              <option>No Lists Available</option>
            ) : (
              lists.map(l => (
                <option key={l.id} value={l.id}>
                  {l.folderName ? `[${l.folderName}] ` : ''}{l.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className={styles.layout}>
        {/* Left Column: Task list */}
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <ListTodo size={16} /> Tasks ({filteredTasks.length})
            <select
              className={styles.statusFilterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ marginLeft: 'auto' }}
            >
              <option value="active">Active Tasks</option>
              <option value="completed">Completed Tasks</option>
              <option value="all">All Tasks</option>
              {listStatuses.length > 0 && (
                <optgroup label="Filter by Status">
                  {listStatuses.map(s => (
                    <option key={s.status} value={s.status}>{s.status}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <button 
              className={styles.logoutBtn} 
              onClick={() => loadTasks(selectedListId)}
              disabled={loadingTasks || !selectedListId}
              title="Refresh Task List"
              style={{ color: 'var(--muted)' }}
            >
              <RefreshCw size={14} className={loadingTasks ? styles.spin : ''} />
            </button>
          </div>

          {loadingTasks ? (
            <div className={styles.loadingWrapper}>
              <Loader2 className={styles.spinner} size={24} />
              <p>Fetching tasks from ClickUp…</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className={styles.noTasks}>
              <AlertCircle size={32} />
              <p>{selectedListId ? 'No tasks match the selected filter' : 'Select a list to view tasks'}</p>
            </div>
          ) : (
            <div className={styles.taskList}>
              {filteredTasks.map(task => {
                const isClosed = task.status.type === 'closed' || task.status.status.toLowerCase() === 'complete';
                const hasPriority = task.priority !== null;
                const priorityClass = hasPriority ? styles[`priority${task.priority?.id}`] : '';
                
                const activeList = lists.find(l => l.id === selectedListId);
                const availableStatuses = activeList?.statuses || [];
                
                // Formatted Due Date
                let isOverdue = false;
                let formattedDate = '';
                if (task.due_date) {
                  const date = new Date(parseInt(task.due_date));
                  formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  if (date < new Date() && !isClosed) {
                    isOverdue = true;
                  }
                }

                return (
                  <div key={task.id} className={`${styles.taskCard} ${isClosed ? styles.taskCompleted : ''}`}>
                    {/* Completion button */}
                    <button 
                      className={styles.taskCheckbox} 
                      onClick={() => handleToggleComplete(task)}
                      disabled={actionLoading}
                    >
                      <CheckCircle size={16} />
                    </button>

                    {/* Content */}
                    <div className={styles.taskContent}>
                      <div className={styles.taskHeader}>
                        <h4 className={styles.taskName}>{task.name}</h4>
                        <a 
                          href={task.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className={styles.logoutBtn}
                          style={{ color: 'var(--muted)' }}
                          title="Open in ClickUp"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      {task.description && (
                        <p className={styles.taskDesc}>
                          {task.description.length > 180 ? `${task.description.substring(0, 180)}…` : task.description}
                        </p>
                      )}

                      <div className={styles.taskMeta}>
                        <select
                          className={`${styles.badge} ${styles.badgeStatus}`}
                          style={{ 
                            borderColor: task.status.color, 
                            color: task.status.color, 
                            border: '1px solid',
                            cursor: 'pointer',
                            outline: 'none',
                            background: 'transparent',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '12px',
                            padding: '2px 24px 2px 8px',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(task.status.color)}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            backgroundSize: '10px'
                          }}
                          value={task.status.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          disabled={actionLoading}
                        >
                          {listStatuses.map(s => (
                            <option key={s.status} value={s.status} style={{ color: 'var(--text)', background: 'var(--surface)' }}>
                              {s.status}
                            </option>
                          ))}
                        </select>

                        {hasPriority && (
                          <span className={`${styles.badge} ${priorityClass}`}>
                            {task.priority?.priority}
                          </span>
                        )}

                        {formattedDate && (
                          <span className={`${styles.dueDate} ${isOverdue ? styles.overdue : ''}`}>
                            <Calendar size={11} style={{ marginRight: '3px' }} />
                            {formattedDate} {isOverdue && '(Overdue)'}
                          </span>
                        )}

                        {task.assignees.length > 0 && (
                          <div className={styles.assigneesList}>
                            {task.assignees.map(a => (
                              <div 
                                key={a.id} 
                                className={styles.miniAvatar}
                                style={{ backgroundColor: a.color }}
                                title={a.username}
                              >
                                {a.profilePicture ? (
                                  <img src={a.profilePicture} alt={a.username} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                ) : (
                                  a.username.substring(0, 2).toUpperCase()
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Create task form */}
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <PlusCircle size={16} /> New Task
          </div>

          <form onSubmit={handleCreateTask} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Task Name *</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="What needs to be done?"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                required
                disabled={actionLoading || !selectedListId}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                className={styles.formTextarea}
                placeholder="Enter details..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                disabled={actionLoading || !selectedListId}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Priority</label>
              <select
                className={styles.formSelect}
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                disabled={actionLoading || !selectedListId}
              >
                <option value="1">Urgent</option>
                <option value="2">High</option>
                <option value="3">Normal</option>
                <option value="4">Low</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Due Date</label>
              <input
                type="date"
                className={styles.formInput}
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                disabled={actionLoading || !selectedListId}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Assignees</label>
              <div className={styles.assigneesGrid}>
                {teamMembers.map(m => {
                  const isSelected = selectedAssignees.includes(m.user.id);
                  return (
                    <button
                      key={m.user.id}
                      type="button"
                      className={`${styles.assigneePill} ${isSelected ? styles.assigneePillSelected : ''}`}
                      onClick={() => {
                        setSelectedAssignees(prev =>
                          prev.includes(m.user.id)
                            ? prev.filter(id => id !== m.user.id)
                            : [...prev, m.user.id]
                        );
                      }}
                      title={m.user.email}
                      style={{ borderLeft: `3px solid ${m.user.color || 'var(--border)'}` }}
                    >
                      <div 
                        className={styles.miniAvatar} 
                        style={{ 
                          backgroundColor: m.user.color || '#ccc',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          overflow: 'hidden'
                        }}
                      >
                        {m.user.profile_picture ? (
                          <img src={m.user.profile_picture} alt={m.user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          m.user.username.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <span style={{ fontSize: '11px' }}>{m.user.username}</span>
                    </button>
                  );
                })}
                {teamMembers.length === 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>
                    No members found in this workspace.
                  </span>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={actionLoading || !newTaskName.trim() || !selectedListId}
            >
              {actionLoading ? <Loader2 className={styles.spinner} size={14} /> : null}
              Create Task
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
