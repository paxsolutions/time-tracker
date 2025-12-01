const API_URL = 'http://localhost:3001/api';

// Clients API
export const clientsApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/clients`);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
  },

  create: async (client) => {
    const response = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!response.ok) throw new Error('Failed to create client');
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/clients/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete client');
    return response.json();
  },
};

// Projects API
export const projectsApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  create: async (project) => {
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },

  update: async (id, project) => {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  },

  updateRate: async (id, hourlyRate) => {
    const response = await fetch(`${API_URL}/projects/${id}/rate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hourlyRate }),
    });
    if (!response.ok) throw new Error('Failed to update project rate');
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete project');
    return response.json();
  },
};

// Time Entries API
export const entriesApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/entries`);
    if (!response.ok) throw new Error('Failed to fetch entries');
    return response.json();
  },

  create: async (entry) => {
    const response = await fetch(`${API_URL}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error('Failed to create entry');
    return response.json();
  },

  update: async (id, entry) => {
    const response = await fetch(`${API_URL}/entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error('Failed to update entry');
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/entries/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete entry');
    return response.json();
  },
};

// Active Timer API
export const timerApi = {
  getActive: async () => {
    const response = await fetch(`${API_URL}/timer/active`);
    if (!response.ok) throw new Error('Failed to fetch active timer');
    return response.json();
  },

  setActive: async (timer) => {
    const response = await fetch(`${API_URL}/timer/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timer),
    });
    if (!response.ok) throw new Error('Failed to set active timer');
    return response.json();
  },

  clearActive: async () => {
    const response = await fetch(`${API_URL}/timer/active`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to clear active timer');
    return response.json();
  },
};
