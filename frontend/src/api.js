import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

export const getStats = async () => {
    const response = await api.get('/stats');
    return response.data;
};

export const getDatabases = async () => {
    const response = await api.get('/databases');
    return response.data;
};

export const getQueries = async (skip = 0, limit = 50, minDuration = null, queryType = null, dbName = null, startDate = null, endDate = null) => {
    const params = { skip, limit };
    if (minDuration) params.min_duration = minDuration;
    if (queryType) params.query_type = queryType;
    if (dbName) params.db_name = dbName;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get('/queries', { params });
    return response.data;
};

export const triggerIngest = async () => {
    const response = await api.post('/ingest');
    return response.data;
};
