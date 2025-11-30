import { Calendar, CalendarPlus, ChevronLeft, ChevronRight, Clock, DollarSign, Download, Edit2, FileText, Play, Plus, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { entriesApi, projectsApi, timerApi } from './api';

function App() {
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRate, setNewProjectRate] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentView, setCurrentView] = useState('tracker'); // 'tracker', 'weekly', 'invoice', 'calendar'
  const [editingProject, setEditingProject] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [invoiceData, setInvoiceData] = useState({ clientName: '', clientEmail: '', invoiceNumber: '', notes: '' });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntry, setManualEntry] = useState({ projectId: '', hours: '', minutes: '', description: '' });
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerInterval = useRef(null);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, entriesData, activeTimerData] = await Promise.all([
          projectsApi.getAll(),
          entriesApi.getAll(),
          timerApi.getActive()
        ]);

        // Transform database fields to match frontend expectations
        const transformedProjects = projectsData.map(p => ({
          id: p.id,
          name: p.name,
          hourlyRate: parseFloat(p.hourly_rate),
          createdAt: new Date(p.created_at).getTime()
        }));

        const transformedEntries = entriesData.map(e => ({
          id: e.id,
          projectId: e.project_id,
          startTime: parseInt(e.start_time),
          endTime: parseInt(e.end_time),
          duration: parseInt(e.duration),
          isManual: Boolean(e.is_manual),
          description: e.description
        }));

        setProjects(transformedProjects);
        setTimeEntries(transformedEntries);

        if (activeTimerData && activeTimerData.projectId) {
          setActiveTimer(activeTimerData);
          setElapsedTime(Date.now() - activeTimerData.startTime);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Make sure the backend server is running.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Timer effect
  useEffect(() => {
    if (activeTimer) {
      timerInterval.current = setInterval(() => {
        setElapsedTime(Date.now() - activeTimer.startTime);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      setElapsedTime(0);
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [activeTimer]);

  const addProject = async (e) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      try {
        const newProject = await projectsApi.create({
          name: newProjectName.trim(),
          hourlyRate: parseFloat(newProjectRate) || 0,
        });

        const transformedProject = {
          id: newProject.id,
          name: newProject.name,
          hourlyRate: parseFloat(newProject.hourly_rate),
          createdAt: new Date(newProject.created_at).getTime()
        };

        setProjects([...projects, transformedProject]);
        setNewProjectName('');
        setNewProjectRate('');
      } catch (error) {
        console.error('Error creating project:', error);
        alert('Failed to create project');
      }
    }
  };

  const updateProjectRate = async (projectId, newRate) => {
    try {
      await projectsApi.updateRate(projectId, parseFloat(newRate) || 0);
      setProjects(projects.map(p =>
        p.id === projectId ? { ...p, hourlyRate: parseFloat(newRate) || 0 } : p
      ));
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project rate:', error);
      alert('Failed to update project rate');
    }
  };

  const deleteProject = async (projectId) => {
    if (activeTimer?.projectId === projectId) {
      await stopTimer();
    }
    try {
      await projectsApi.delete(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      setTimeEntries(timeEntries.filter(e => e.projectId !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const startTimer = async (projectId) => {
    if (activeTimer) {
      await stopTimer();
    }
    const timer = {
      projectId,
      startTime: Date.now(),
    };
    try {
      await timerApi.setActive(timer);
      setActiveTimer(timer);
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer');
    }
  };

  const stopTimer = async () => {
    if (activeTimer) {
      const duration = Date.now() - activeTimer.startTime;
      try {
        const newEntry = await entriesApi.create({
          projectId: activeTimer.projectId,
          startTime: activeTimer.startTime,
          endTime: Date.now(),
          duration,
          isManual: false,
        });

        const transformedEntry = {
          id: newEntry.id,
          projectId: newEntry.project_id,
          startTime: parseInt(newEntry.start_time),
          endTime: parseInt(newEntry.end_time),
          duration: parseInt(newEntry.duration),
          isManual: Boolean(newEntry.is_manual),
          description: newEntry.description
        };

        setTimeEntries([...timeEntries, transformedEntry]);
        await timerApi.clearActive();
        setActiveTimer(null);
      } catch (error) {
        console.error('Error stopping timer:', error);
        alert('Failed to stop timer');
      }
    }
  };

  const deleteEntry = async (entryId) => {
    try {
      await entriesApi.delete(entryId);
      setTimeEntries(timeEntries.filter(e => e.id !== entryId));
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalTimeForProject = (projectId) => {
    const total = timeEntries
      .filter(e => e.projectId === projectId)
      .reduce((sum, e) => sum + e.duration, 0);

    if (activeTimer?.projectId === projectId) {
      return total + elapsedTime;
    }
    return total;
  };

  const msToHours = (ms) => {
    return ms / (1000 * 60 * 60);
  };

  const getEarningsForProject = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.hourlyRate) return 0;
    const totalMs = getTotalTimeForProject(projectId);
    return msToHours(totalMs) * project.hourlyRate;
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeeklyData = () => {
    const weeks = {};

    timeEntries.forEach(entry => {
      const weekStart = getWeekStart(entry.startTime);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekStart,
          projects: {},
          totalHours: 0,
          totalEarnings: 0,
        };
      }

      const project = projects.find(p => p.id === entry.projectId);
      if (!project) return;

      if (!weeks[weekKey].projects[entry.projectId]) {
        weeks[weekKey].projects[entry.projectId] = {
          name: project.name,
          hourlyRate: project.hourlyRate || 0,
          duration: 0,
          earnings: 0,
        };
      }

      weeks[weekKey].projects[entry.projectId].duration += entry.duration;
      const hours = msToHours(entry.duration);
      weeks[weekKey].projects[entry.projectId].earnings += hours * (project.hourlyRate || 0);
      weeks[weekKey].totalHours += hours;
      weeks[weekKey].totalEarnings += hours * (project.hourlyRate || 0);
    });

    return Object.entries(weeks).sort((a, b) => b[1].weekStart - a[1].weekStart);
  };

  const generateInvoice = (weekData) => {
    const weekStart = new Date(weekData.weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .invoice-details { margin-bottom: 30px; }
    .invoice-details div { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #4f46e5; color: white; }
    .total-row { font-weight: bold; background-color: #f9fafb; }
    .right-align { text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
    <p>Invoice #${invoiceData.invoiceNumber || 'INV-001'}</p>
  </div>

  <div class="invoice-details">
    <div><strong>Bill To:</strong> ${invoiceData.clientName || 'Client Name'}</div>
    <div><strong>Email:</strong> ${invoiceData.clientEmail || 'client@example.com'}</div>
    <div><strong>Period:</strong> ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</div>
    <div><strong>Invoice Date:</strong> ${new Date().toLocaleDateString()}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Project</th>
        <th class="right-align">Hours</th>
        <th class="right-align">Rate</th>
        <th class="right-align">Amount</th>
      </tr>
    </thead>
    <tbody>
`;

    Object.values(weekData.projects).forEach(project => {
      const hours = msToHours(project.duration).toFixed(2);
      invoiceHTML += `
      <tr>
        <td>${project.name}</td>
        <td class="right-align">${hours}</td>
        <td class="right-align">$${project.hourlyRate.toFixed(2)}</td>
        <td class="right-align">$${project.earnings.toFixed(2)}</td>
      </tr>`;
    });

    invoiceHTML += `
      <tr class="total-row">
        <td colspan="3" class="right-align">Total</td>
        <td class="right-align">$${weekData.totalEarnings.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  ${invoiceData.notes ? `<div><strong>Notes:</strong><br/>${invoiceData.notes}</div>` : ''}
</body>
</html>
`;

    return invoiceHTML;
  };

  const downloadInvoice = (weekData) => {
    const invoiceHTML = generateInvoice(weekData);
    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.invoiceNumber || 'INV-001'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEntriesForDate = (date) => {
    const dateStr = date.toDateString();
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime).toDateString();
      return entryDate === dateStr;
    });
  };

  const getTotalHoursForDate = (date) => {
    const entries = getEntriesForDate(date);
    const totalMs = entries.reduce((sum, entry) => sum + entry.duration, 0);
    return msToHours(totalMs);
  };

  const addManualEntry = async () => {
    if (!manualEntry.projectId || (!manualEntry.hours && !manualEntry.minutes)) {
      alert('Please select a project and enter hours or minutes');
      return;
    }

    const totalHours = (parseFloat(manualEntry.hours) || 0) + (parseFloat(manualEntry.minutes) || 0) / 60;
    const durationMs = totalHours * 60 * 60 * 1000;

    const startTime = new Date(selectedDate);
    startTime.setHours(9, 0, 0, 0); // Default to 9 AM

    try {
      const newEntry = await entriesApi.create({
        projectId: parseInt(manualEntry.projectId),
        startTime: startTime.getTime(),
        endTime: startTime.getTime() + durationMs,
        duration: durationMs,
        isManual: true,
        description: manualEntry.description || null,
      });

      const transformedEntry = {
        id: newEntry.id,
        projectId: newEntry.project_id,
        startTime: parseInt(newEntry.start_time),
        endTime: parseInt(newEntry.end_time),
        duration: parseInt(newEntry.duration),
        isManual: Boolean(newEntry.is_manual),
        description: newEntry.description
      };

      setTimeEntries([...timeEntries, transformedEntry]);
      setShowManualEntryModal(false);
      setManualEntry({ projectId: '', hours: '', minutes: '', description: '' });
    } catch (error) {
      console.error('Error adding manual entry:', error);
      alert('Failed to add manual entry');
    }
  };

  const openManualEntryModal = (date) => {
    setSelectedDate(date);
    setShowManualEntryModal(true);
  };

  const openEditEntryModal = (entry) => {
    const durationHours = entry.duration / (1000 * 60 * 60);
    const hours = Math.floor(durationHours);
    const minutes = Math.round((durationHours - hours) * 60);

    setEditingEntry({
      id: entry.id,
      projectId: entry.projectId.toString(),
      hours: hours.toString(),
      minutes: minutes.toString(),
      description: entry.description || '',
      startTime: entry.startTime,
    });
    setShowEditEntryModal(true);
  };

  const saveEditedEntry = async () => {
    if (!editingEntry.projectId || (!editingEntry.hours && !editingEntry.minutes)) {
      alert('Please select a project and enter hours or minutes');
      return;
    }

    const totalHours = (parseFloat(editingEntry.hours) || 0) + (parseFloat(editingEntry.minutes) || 0) / 60;
    const durationMs = totalHours * 60 * 60 * 1000;

    try {
      const updatedEntry = await entriesApi.update(editingEntry.id, {
        projectId: parseInt(editingEntry.projectId),
        startTime: editingEntry.startTime,
        endTime: editingEntry.startTime + durationMs,
        duration: durationMs,
        description: editingEntry.description || null,
      });

      const transformedEntry = {
        id: updatedEntry.id,
        projectId: updatedEntry.project_id,
        startTime: parseInt(updatedEntry.start_time),
        endTime: parseInt(updatedEntry.end_time),
        duration: parseInt(updatedEntry.duration),
        isManual: Boolean(updatedEntry.is_manual),
        description: updatedEntry.description
      };

      setTimeEntries(timeEntries.map(e => e.id === transformedEntry.id ? transformedEntry : e));
      setShowEditEntryModal(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry');
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-800">Loading...</p>
          <p className="text-sm text-gray-600 mt-2">Make sure the backend server is running</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Clock className="w-10 h-10 text-indigo-600" />
            Time Tracker
          </h1>
          <p className="text-gray-600">Track your freelance projects efficiently</p>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 bg-white rounded-xl shadow-md p-2">
          <button
            onClick={() => setCurrentView('tracker')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              currentView === 'tracker' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="hidden sm:inline">Timer</span>
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              currentView === 'calendar' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CalendarPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
          <button
            onClick={() => setCurrentView('weekly')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              currentView === 'weekly' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="hidden sm:inline">Weekly</span>
          </button>
          <button
            onClick={() => setCurrentView('invoice')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              currentView === 'invoice' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="hidden sm:inline">Invoice</span>
          </button>
        </div>

        {/* Add Project Form */}
        {currentView === 'tracker' && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Project</h2>
            <form onSubmit={addProject} className="flex gap-3">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={newProjectRate}
                  onChange={(e) => setNewProjectRate(e.target.value)}
                  placeholder="Hourly rate"
                  className="w-40 pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Project
              </button>
            </form>
          </div>
        )}

        {/* Projects Grid */}
        {currentView === 'tracker' && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {projects.map(project => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">{project.name}</h3>
                    <p className="text-sm text-gray-500">
                      Total: {formatDuration(getTotalTimeForProject(project.id))}
                      ({msToHours(getTotalTimeForProject(project.id)).toFixed(2)} hrs)
                    </p>
                    {editingProject === project.id ? (
                      <div className="mt-2 flex gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={project.hourlyRate || 0}
                            onBlur={(e) => updateProjectRate(project.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateProjectRate(project.id, e.target.value);
                              }
                            }}
                            autoFocus
                            className="w-full pl-8 pr-3 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <button
                          onClick={() => setEditingProject(null)}
                          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-sm font-medium text-green-600">
                          ${project.hourlyRate ? project.hourlyRate.toFixed(2) : '0.00'}/hr
                        </p>
                        <button
                          onClick={() => setEditingProject(project.id)}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit rate"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {project.hourlyRate > 0 && (
                          <p className="text-sm text-gray-600 ml-auto">
                            Earned: <span className="font-semibold text-indigo-600">${getEarningsForProject(project.id).toFixed(2)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

              {activeTimer?.projectId === project.id ? (
                <div className="space-y-3">
                  <div className="text-3xl font-mono font-bold text-indigo-600 text-center py-3 bg-indigo-50 rounded-lg">
                    {formatDuration(elapsedTime)}
                  </div>
                  <button
                    onClick={stopTimer}
                    className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    Stop Timer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startTimer(project.id)}
                  disabled={activeTimer !== null}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5" />
                  Start Timer
                </button>
              )}
            </div>
          ))}

          {projects.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No projects yet. Add your first project to get started!</p>
            </div>
          )}
          </div>
        )}

        {/* Time Entries */}
        {currentView === 'tracker' && timeEntries.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              Time Entries
            </h2>
            <div className="space-y-3">
              {[...timeEntries].reverse().map(entry => {
                const project = projects.find(p => p.id === entry.projectId);
                if (!project) return null;

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                    onClick={() => openEditEntryModal(entry)}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{project.name}</p>
                      <p className="text-sm text-gray-500">{formatDate(entry.startTime)}</p>
                      {entry.description && (
                        <p className="text-sm text-gray-600 mt-1 italic">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-mono font-semibold text-indigo-600">
                        {formatDuration(entry.duration)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEntry(entry.id);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Summary View */}
        {currentView === 'weekly' && (
          <div className="space-y-6">
            {getWeeklyData().length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
                <p className="text-lg text-gray-500">No time entries yet. Start tracking to see weekly summaries!</p>
              </div>
            ) : (
              getWeeklyData().map(([weekKey, weekData]) => {
                const weekStart = new Date(weekData.weekStart);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                return (
                  <div key={weekKey} className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">
                          ${weekData.totalEarnings.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {weekData.totalHours.toFixed(2)} hours
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Object.values(weekData.projects).map((projectData, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">{projectData.name}</p>
                            <p className="text-sm text-gray-500">
                              {msToHours(projectData.duration).toFixed(2)} hrs @ ${projectData.hourlyRate.toFixed(2)}/hr
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-indigo-600">
                            ${projectData.earnings.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedWeek(weekData);
                        setCurrentView('invoice');
                      }}
                      className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Generate Invoice for This Week
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Invoice Generation View */}
        {currentView === 'invoice' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <FileText className="w-7 h-7 text-indigo-600" />
              Generate Invoice
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                <input
                  type="text"
                  value={invoiceData.clientName}
                  onChange={(e) => setInvoiceData({ ...invoiceData, clientName: e.target.value })}
                  placeholder="Enter client name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Email</label>
                <input
                  type="email"
                  value={invoiceData.clientEmail}
                  onChange={(e) => setInvoiceData({ ...invoiceData, clientEmail: e.target.value })}
                  placeholder="client@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                  placeholder="Payment terms, additional information..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {selectedWeek ? (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">Invoice Preview</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Week: {new Date(selectedWeek.weekStart).toLocaleDateString()} - {new Date(new Date(selectedWeek.weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                  <p className="text-2xl font-bold text-indigo-600">
                    Total: ${selectedWeek.totalEarnings.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedWeek.totalHours.toFixed(2)} hours tracked
                  </p>
                </div>

                <button
                  onClick={() => downloadInvoice(selectedWeek)}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Invoice (HTML)
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Go to Weekly Summary to select a week for invoicing</p>
                <button
                  onClick={() => setCurrentView('weekly')}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  View Weekly Summary
                </button>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <div className="space-y-6">
            {/* Calendar Header */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-gray-600 py-2 text-sm">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {(() => {
                  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                  const days = [];

                  // Empty cells before first day
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const totalHours = getTotalHoursForDate(date);
                    const entries = getEntriesForDate(date);

                    const isSelected = selectedCalendarDate?.toDateString() === date.toDateString();

                    days.push(
                      <div
                        key={day}
                        onClick={() => setSelectedCalendarDate(date)}
                        className={`aspect-square border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md hover:border-indigo-400 ${
                          isSelected ? 'border-indigo-600 bg-indigo-100 ring-2 ring-indigo-300' :
                          isToday ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col h-full">
                          <span className={`text-sm font-medium ${isSelected || isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                            {day}
                          </span>
                          {totalHours > 0 && (
                            <div className="mt-auto">
                              <div className="text-xs font-semibold text-indigo-600 bg-indigo-100 rounded px-1 py-0.5 text-center">
                                {totalHours.toFixed(1)}h
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 text-center">
                                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return days;
                })()}
              </div>
            </div>

            {/* Selected Date Entries */}
            {selectedCalendarDate && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {selectedCalendarDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => openManualEntryModal(selectedCalendarDate)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                </div>

                {(() => {
                  const entries = getEntriesForDate(selectedCalendarDate);
                  if (entries.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No time entries for this date</p>
                        <p className="text-sm mt-1">Click "Add Entry" to create one</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {entries.map(entry => {
                        const project = projects.find(p => p.id === entry.projectId);
                        if (!project) return null;

                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                            onClick={() => openEditEntryModal(entry)}
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{project.name}</p>
                              {entry.description && (
                                <p className="text-sm text-gray-600 mt-1 italic">{entry.description}</p>
                              )}
                              {entry.isManual && (
                                <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mt-1">
                                  Manual Entry
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-lg font-mono font-semibold text-indigo-600">
                                {formatDuration(entry.duration)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEntry(entry.id);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 text-sm">
                <strong>Tip:</strong> Click on any day to view its time entries. Click on an entry to edit it, or click "Add Entry" to create a new one.
              </p>
            </div>
          </div>
        )}

        {/* Manual Entry Modal */}
        {showManualEntryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Add Time Entry
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                  <select
                    value={manualEntry.projectId}
                    onChange={(e) => setManualEntry({ ...manualEntry, projectId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={manualEntry.hours}
                      onChange={(e) => setManualEntry({ ...manualEntry, hours: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={manualEntry.minutes}
                      onChange={(e) => setManualEntry({ ...manualEntry, minutes: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={manualEntry.description}
                    onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
                    placeholder="What did you work on?"
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowManualEntryModal(false);
                    setManualEntry({ projectId: '', hours: '', minutes: '', description: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addManualEntry}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Add Entry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Entry Modal */}
        {showEditEntryModal && editingEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Edit Time Entry
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                  <select
                    value={editingEntry.projectId}
                    onChange={(e) => setEditingEntry({ ...editingEntry, projectId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editingEntry.hours}
                      onChange={(e) => setEditingEntry({ ...editingEntry, hours: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={editingEntry.minutes}
                      onChange={(e) => setEditingEntry({ ...editingEntry, minutes: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={editingEntry.description}
                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                    placeholder="What did you work on?"
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditEntryModal(false);
                    setEditingEntry(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedEntry}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
