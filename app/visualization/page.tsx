// app/visualization/page.tsx
'use client';

import Navbar from "@/components/Navbar";
// 【FIX】Import the correctly named 'useAppStore'
import { useAppStore } from "@/store/chartStore"; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function VisualizationPage() {
  // 【FIX】Call the correctly named 'useAppStore' hook
  const { ticker, chartData } = useAppStore();

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
          <p className="text-xl text-gray-500">There is no available chart data. Please generate the chart in the AI chat first.</p>
        </div>
      );
    }

    // Determine if there is historical data and/or prediction data
    const hasHistoricalData = chartData.some(d => d.price !== undefined);
    const hasPredictionData = chartData.some(d => d.predictedPrice !== undefined);

    let chartTitle = `${ticker || 'stock'}`;
    if (hasHistoricalData && hasPredictionData) {
      chartTitle += ' Historical prices and future predictions';
    } else if (hasHistoricalData) {
      chartTitle += ' Historical price trend';
    } else if (hasPredictionData) {
      chartTitle += ' Future price forecast';
    }

    return (
      <div className="w-full h-[60vh] bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{chartTitle}</h2>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#666" />
            <YAxis stroke="#666" domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelStyle={{ color: '#333', fontWeight: 'bold' }}
            />
            <Legend />
            {/* Historical price line */}
            {hasHistoricalData && (
              <Line
                type="monotone"
                dataKey="price"
                name="Historical price"
                stroke="#82ca9d"
                strokeWidth={2}
                connectNulls
              />
            )}
            {/* Predicted price line */}
            {hasPredictionData && (
              <Line
                type="monotone"
                dataKey="predictedPrice"
                name="Predicted price"
                stroke="#8884d8"
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls
                activeDot={{ r: 8 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Stock data visualization
          </h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {renderChart()}
        </div>
      </main>
    </div>
  );
}