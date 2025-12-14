import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MetricChart = ({ data = [], timeRange }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        return data.map(item => ({
            ...item,
            displayTime: new Date(item.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: timeRange === '30d' ? undefined : 'numeric'
            })
        }));

    }, [data, timeRange]);

    if (chartData.length === 0) return (
        <div className="glass-panel" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            No data available for visualization
        </div>
    );

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', height: '350px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Traffic Overview
            </h3>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="displayTime"
                        stroke="var(--text-secondary)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        minTickGap={20}
                    />
                    <YAxis
                        stroke="var(--text-secondary)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: '#f8fafc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar
                        name="Slow Queries"
                        dataKey="queries"
                        fill="var(--accent)"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                    />
                    <Bar
                        name="Errors"
                        dataKey="errors"
                        fill="var(--danger)"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MetricChart;
