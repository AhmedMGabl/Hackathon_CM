/**
 * CMetrics API Client
 * Centralized fetch wrapper with error handling
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include', // Important for cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { code: 'UNKNOWN_ERROR', message: 'An error occurred' },
    }));

    throw new ApiError(
      error.error?.message || 'Request failed',
      error.error?.code || 'UNKNOWN_ERROR',
      response.status,
      error.error?.details
    );
  }

  return response.json();
}

// Mentor API
export const mentorApi = {
  list: (params: {
    teamId?: string;
    status?: 'ABOVE' | 'WARNING' | 'BELOW';
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'mentorName' | 'weightedScore' | 'targetsHit';
    sortOrder?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    return fetchApi<any>(`/api/mentors?${query}`);
  },

  getById: (id: string) => fetchApi<any>(`/api/mentors/${id}`),
};

// Config API
export const configApi = {
  get: (teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return fetchApi<any>(`/api/config${query}`);
  },

  update: (data: any, teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return fetchApi<any>(`/api/config${query}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getPacing: () => fetchApi<any>('/api/config/pacing'),
};

// Alert API
export const alertApi = {
  list: (params: {
    teamId?: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    dismissed?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    return fetchApi<any>(`/api/alerts?${query}`);
  },

  dismiss: (alertIds: string[]) =>
    fetchApi<any>('/api/alerts/dismiss', {
      method: 'POST',
      body: JSON.stringify({ alertIds }),
    }),

  assign: (alertId: string, userId: string) =>
    fetchApi<any>('/api/alerts/assign', {
      method: 'POST',
      body: JSON.stringify({ alertId, userId }),
    }),

  stats: () => fetchApi<any>('/api/alerts/stats'),
};

// Ingestion API
export const ingestionApi = {
  upload: (file: File, source: string, columnMapping?: Record<string, string>) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    if (columnMapping) {
      formData.append('columnMapping', JSON.stringify(columnMapping));
    }

    return fetch('/api/ingestion/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    });
  },

  history: (limit = 20) => fetchApi<any>(`/api/ingestion/history?limit=${limit}`),
};
